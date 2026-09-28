import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { verify } from 'https://deno.land/x/djwt@v2.8/mod.ts';

const JWT_SECRET = Deno.env.get('JWT_SECRET');

// Verifies a PIN-session JWT minted by authenticatePinUser so merchant owners
// who logged in via PIN (no platform User/session) can still manage staff.
async function verifyPinSession(token) {
  if (!JWT_SECRET || !token) return null;
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const payload = await verify(token, key);
    if (!payload || payload.type !== 'pin_session') return null;
    return payload;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    let body: any = {};
    try { body = await req.json(); } catch {}

    const { action, session_token } = body;
    const base44 = createClientFromRequest(req);

    // Authenticate the caller — platform session first, then PIN session.
    let caller: any = null;
    try { caller = await base44.auth.me(); } catch { caller = null; }
    if (!caller) {
      const pinPayload = await verifyPinSession(session_token);
      if (pinPayload) {
        caller = {
          id: pinPayload.sub,
          email: pinPayload.email,
          role: pinPayload.role,
          merchant_id: pinPayload.merchant_id,
          dealer_id: pinPayload.dealer_id
        };
      }
    }
    if (!caller) {
      return Response.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const merchant_id = body.merchant_id || caller.merchant_id;
    if (!merchant_id) {
      return Response.json({ success: false, error: 'merchant_id is required' }, { status: 400 });
    }

    // Authorize: platform admin, or a user belonging to this merchant.
    const isAuthorized = caller.role === 'admin' || caller.merchant_id === merchant_id;
    if (!isAuthorized) {
      return Response.json({ success: false, error: 'Not authorized for this merchant' }, { status: 403 });
    }

    // Resolve dealer_id from the merchant record so new staff inherit it.
    let dealer_id = caller.dealer_id || null;
    try {
      const merchants = await base44.asServiceRole.entities.Merchant.filter({ id: merchant_id });
      if (merchants?.[0]?.dealer_id) dealer_id = merchants[0].dealer_id;
    } catch { /* leave null */ }

    // Staff records live on the dedicated Employee entity. The built-in User
    // entity cannot be created via the SDK (the platform blocks User.create and
    // its custom fields are not filterable), so PIN-based staff must be stored
    // here — a normal custom entity that is fully queryable.
    if (action === 'list') {
      const users = await base44.asServiceRole.entities.Employee.filter({ merchant_id }, 'full_name', 500);
      return Response.json({ success: true, users: users || [] });
    }

    if (action === 'create') {
      const d = body.data || {};
      if (!d.full_name) {
        return Response.json({ success: false, error: 'Name is required' }, { status: 400 });
      }
      // Enforce PIN uniqueness within the merchant so authenticatePinUser
      // (which picks the first match) never collides between two staff.
      let pin = String(d.pin || Math.floor(1000 + Math.random() * 9000));
      const pinInUse = await base44.asServiceRole.entities.Employee.filter({ pin, merchant_id });
      if (pinInUse && pinInUse.length > 0) {
        pin = String(100000 + Math.floor(Math.random() * 900000));
      }
      // Don't create a duplicate for an existing email in this merchant.
      if (d.email) {
        const existing = await base44.asServiceRole.entities.Employee.filter({ merchant_id, email: String(d.email).toLowerCase().trim() });
        if (existing && existing.length > 0) {
          return Response.json({ success: false, error: 'A staff member with that email already exists.' }, { status: 409 });
        }
      }
      const user = await base44.asServiceRole.entities.Employee.create({
        full_name: d.full_name,
        email: d.email ? String(d.email).toLowerCase().trim() : '',
        phone: d.phone || '',
        role: d.role || 'user',
        employee_id: d.employee_id || '',
        pin,
        hourly_rate: Number(d.hourly_rate) || 0,
        commission_rate: Number(d.commission_rate) || 0,
        hire_date: d.hire_date || '',
        permissions: d.permissions || ['process_orders'],
        emergency_contact: d.emergency_contact || { name: '', phone: '', relationship: '' },
        performance_notes: d.performance_notes || '',
        merchant_id,
        dealer_id,
        is_active: true,
        total_sales: 0,
        total_orders: 0,
        total_hours_worked: 0,
        currently_clocked_in: false,
        current_time_entry_id: ''
      });
      return Response.json({ success: true, user, pin });
    }

    if (action === 'update') {
      const { id, data } = body;
      if (!id || !data) {
        return Response.json({ success: false, error: 'id and data are required' }, { status: 400 });
      }
      // Ensure the target belongs to the same merchant (no cross-tenant edits).
      const existing = await base44.asServiceRole.entities.Employee.filter({ id, merchant_id });
      if (!existing || existing.length === 0) {
        return Response.json({ success: false, error: 'Employee not found' }, { status: 404 });
      }
      const update: any = { ...data };
      // If pin is cleared, keep the existing one so login doesn't break.
      if (update.pin === '') delete update.pin;
      // Never let a staff edit change their own merchant or email identity here.
      delete update.merchant_id;
      delete update.email;
      const updated = await base44.asServiceRole.entities.Employee.update(id, update);
      return Response.json({ success: true, user: updated });
    }

    if (action === 'delete') {
      const { id } = body;
      if (!id) return Response.json({ success: false, error: 'id is required' }, { status: 400 });
      const existing = await base44.asServiceRole.entities.Employee.filter({ id, merchant_id });
      if (!existing || existing.length === 0) {
        return Response.json({ success: false, error: 'Employee not found' }, { status: 404 });
      }
      // Deactivate rather than hard-delete to preserve order/audit references.
      await base44.asServiceRole.entities.Employee.update(id, { is_active: false });
      return Response.json({ success: true });
    }

    return Response.json({ success: false, error: 'Invalid action. Use list, create, update, or delete.' }, { status: 400 });
  } catch (error) {
    console.error('manageEmployee error:', error);
    return Response.json({ success: false, error: error.message || 'Failed to process request' }, { status: 500 });
  }
});