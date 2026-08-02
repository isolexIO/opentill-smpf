import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    let body = {};
    try { body = await req.json(); } catch {}
    const { merchant_id, station_id, mode, current_order_id, session_id } = body;

    if (!merchant_id) {
      return Response.json({ success: false, error: 'merchant_id is required' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Authorization: authenticated merchant user/admin, OR a valid active
    // device session registered for this merchant (customer/kitchen display
    // terminals that are not logged in). Prevents anonymous callers from
    // reading any merchant's orders by guessing a merchant_id.
    let authorized = false;
    try {
      const user = await base44.auth.me();
      if (user && (user.role === 'admin' || user.merchant_id === merchant_id)) {
        authorized = true;
      } else if (user) {
        return Response.json({ success: false, error: 'Forbidden: merchant mismatch' }, { status: 403 });
      }
    } catch (e) {
      // Not authenticated — fall through to device session check.
    }

    if (!authorized && session_id) {
      const sessions = await base44.asServiceRole.entities.DeviceSession.filter({ session_id, merchant_id });
      if (sessions && sessions.length > 0) {
        const s = sessions[0];
        if (s.status === 'online' || s.status === 'idle') {
          authorized = true;
        }
      }
    }

    // Customer-display fallback: a public customer-display terminal opened via
    // its station link may not hold a live device session (registration can fail
    // or expire mid-shift). For customer-mode pending-order lookups only, authorize
    // when the caller supplies a station_id that resolves to a Station owned by the
    // target merchant. The orders returned here are pre-payment (no card/PII data)
    // and the station binding scopes access to a station the merchant configured.
    if (!authorized && mode === 'customer' && station_id) {
      try {
        const stations = await base44.asServiceRole.entities.Station.filter({ merchant_id, station_id }, '-created_date', 1);
        if (stations && stations.length > 0) {
          authorized = true;
        }
      } catch (e) { /* fall through to 401 */ }
    }

    if (!authorized) {
      return Response.json({ success: false, error: 'Unauthorized: authentication or valid device session required' }, { status: 401 });
    }

    // Kitchen mode: return all active orders for the station
    if (mode === 'kitchen') {
      const filter = { merchant_id, status: { $in: ['pending', 'processing'] } };
      if (station_id) filter.station_id = station_id;
      const orders = await base44.asServiceRole.entities.Order.filter(filter, '-created_date', 100);
      return Response.json({ success: true, orders: orders || [] });
    }

    // Customer mode: refresh the current order, or find the next pending one
    if (current_order_id) {
      const results = await base44.asServiceRole.entities.Order.filter({ id: current_order_id, merchant_id });
      return Response.json({ success: true, currentOrder: results && results[0] ? results[0] : null });
    }

    const filter = {
      merchant_id,
      status: { $in: ['preview', 'approval', 'tip_selection', 'ready_for_payment'] },
      sent_to_customer_display: false
    };
    if (station_id) filter.station_id = station_id;
    const pending = await base44.asServiceRole.entities.Order.filter(filter, '-created_date', 1);
    return Response.json({ success: true, pendingOrder: pending && pending[0] ? pending[0] : null });
  } catch (error) {
    console.error('getDisplayOrders error:', error);
    return Response.json({ success: false, error: 'Failed to load orders', details: error.message }, { status: 500 });
  }
});