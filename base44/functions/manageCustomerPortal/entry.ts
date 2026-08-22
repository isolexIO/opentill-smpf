import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PORTAL_SALT = Deno.env.get('JWT_SECRET') ? `portal:${Deno.env.get('JWT_SECRET')}` : '';
const LEGACY_PORTAL_SALT = 'opentill_customer_portal_2024';

async function hashPinWith(pin, salt) {
  const data = new TextEncoder().encode(salt + pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateReferralCode() {
  let code = '';
  const rand = crypto.getRandomValues(new Uint8Array(8));
  for (let i = 0; i < 8; i++) code += CODE_CHARS[rand[i] % CODE_CHARS.length];
  return code;
}

// Lazily assign a unique referral code to a customer who doesn't have one yet.
async function ensureReferralCode(base44, customer) {
  if (customer.referral_code) return customer.referral_code;
  let code = generateReferralCode();
  for (let tries = 0; tries < 10; tries++) {
    const existing = await base44.asServiceRole.entities.Customer.filter({ referral_code: code });
    if (!existing || existing.length === 0) break;
    code = generateReferralCode();
  }
  await base44.asServiceRole.entities.Customer.update(customer.id, { referral_code: code });
  return code;
}

// Verify the customer's PIN and return the customer record, or null.
async function verifyCustomer(base44, customer_id, pin) {
  if (!customer_id || !pin) return null;
  if (!PORTAL_SALT) return null;
  const customers = await base44.asServiceRole.entities.Customer.filter({ id: customer_id });
  if (!customers || customers.length === 0) return null;
  const customer = customers[0];
  if (!customer.pin_hash) return null;
  const newHash = await hashPinWith(pin, PORTAL_SALT);
  if (newHash === customer.pin_hash) return customer;
  const legacyHash = await hashPinWith(pin, LEGACY_PORTAL_SALT);
  if (legacyHash === customer.pin_hash) {
    try {
      await base44.asServiceRole.entities.Customer.update(customer.id, { pin_hash: newHash });
    } catch { /* non-fatal */ }
    return customer;
  }
  return null;
}

async function fetchLinkedMerchants(base44, customer_id) {
  try {
    const links = await base44.asServiceRole.entities.CustomerMerchantLink.filter(
      { customer_id },
      '-added_at',
      200
    );
    return (links || []).map((l) => ({
      id: l.id,
      merchant_id: l.merchant_id,
      merchant_name: l.merchant_name,
      link_type: l.link_type,
      referral_status: l.referral_status,
      reward_amount_duc: l.reward_amount_duc || 0,
      converted_at: l.converted_at,
      added_at: l.added_at,
    }));
  } catch {
    return [];
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action } = body;

    // --- track_click: public, keyed by referral_code ---
    if (action === 'track_click') {
      const { referral_code } = body;
      if (!referral_code) return Response.json({ success: false, error: 'referral_code required' });
      const customers = await base44.asServiceRole.entities.Customer.filter({
        referral_code: String(referral_code).toUpperCase().trim(),
      });
      if (!customers || customers.length === 0) {
        return Response.json({ success: true, message: 'No customer for code' });
      }
      const c = customers[0];
      await base44.asServiceRole.entities.Customer.update(c.id, {
        ref_clicks: (c.ref_clicks || 0) + 1,
      });
      return Response.json({ success: true });
    }

    // --- track_share: public, keyed by referral_code ---
    if (action === 'track_share') {
      const { referral_code } = body;
      if (!referral_code) return Response.json({ success: false, error: 'referral_code required' });
      const customers = await base44.asServiceRole.entities.Customer.filter({
        referral_code: String(referral_code).toUpperCase().trim(),
      });
      if (!customers || customers.length === 0) {
        return Response.json({ success: true, message: 'No customer for code' });
      }
      const c = customers[0];
      await base44.asServiceRole.entities.Customer.update(c.id, {
        ref_shares: (c.ref_shares || 0) + 1,
      });
      return Response.json({ success: true });
    }

    // --- search_merchants: public, by business name substring ---
    if (action === 'search_merchants') {
      const { query } = body;
      if (!query || String(query).trim().length < 2) {
        return Response.json({ success: true, merchants: [] });
      }
      const q = String(query).trim().toLowerCase();
      const merchants = await base44.asServiceRole.entities.Merchant.filter(
        { status: 'active' },
        '-created_date',
        500
      );
      const matches = (merchants || [])
        .filter((m) => (m.business_name || '').toLowerCase().includes(q))
        .slice(0, 20)
        .map((m) => ({
          id: m.id,
          business_name: m.business_name,
          display_name: m.display_name,
          opentill_subdomain: m.opentill_subdomain,
        }));
      return Response.json({ success: true, merchants: matches });
    }

    // --- get_portal_data: authenticated by customer_id + pin ---
    if (action === 'get_portal_data') {
      const { customer_id, pin } = body;
      const customer = await verifyCustomer(base44, customer_id, pin);
      if (!customer) {
        return Response.json({ success: false, error: 'Invalid customer or PIN' }, { status: 401 });
      }
      const referral_code = await ensureReferralCode(base44, customer);
      const linked_merchants = await fetchLinkedMerchants(base44, customer_id);
      return Response.json({
        success: true,
        referral_code,
        ref_clicks: customer.ref_clicks || 0,
        ref_shares: customer.ref_shares || 0,
        ref_conversions: customer.ref_conversions || 0,
        ref_duc_earned: customer.ref_duc_earned || 0,
        linked_merchants,
      });
    }

    // --- add_merchant: authenticated; creates an "added" link ---
    if (action === 'add_merchant') {
      const { customer_id, pin, merchant_id } = body;
      if (!merchant_id) return Response.json({ success: false, error: 'merchant_id required' });
      const customer = await verifyCustomer(base44, customer_id, pin);
      if (!customer) {
        return Response.json({ success: false, error: 'Invalid customer or PIN' }, { status: 401 });
      }
      // Don't duplicate an existing link of any type.
      const existing = await base44.asServiceRole.entities.CustomerMerchantLink.filter({
        customer_id,
        merchant_id,
      });
      if (existing && existing.length > 0) {
        const linked_merchants = await fetchLinkedMerchants(base44, customer_id);
        return Response.json({ success: true, linked_merchants, message: 'Already linked' });
      }
      const merchants = await base44.asServiceRole.entities.Merchant.filter({ id: merchant_id });
      const merchant = merchants && merchants[0];
      if (!merchant) return Response.json({ success: false, error: 'Merchant not found' });
      await base44.asServiceRole.entities.CustomerMerchantLink.create({
        customer_id,
        customer_phone: customer.phone || null,
        merchant_id,
        merchant_name: merchant.business_name,
        dealer_id: merchant.dealer_id || null,
        link_type: 'added',
        added_at: new Date().toISOString(),
      });
      const linked_merchants = await fetchLinkedMerchants(base44, customer_id);
      return Response.json({ success: true, linked_merchants });
    }

    // --- remove_merchant: authenticated; deletes an "added" link ---
    if (action === 'remove_merchant') {
      const { customer_id, pin, link_id } = body;
      if (!link_id) return Response.json({ success: false, error: 'link_id required' });
      const customer = await verifyCustomer(base44, customer_id, pin);
      if (!customer) {
        return Response.json({ success: false, error: 'Invalid customer or PIN' }, { status: 401 });
      }
      const links = await base44.asServiceRole.entities.CustomerMerchantLink.filter({ id: link_id });
      const link = links && links[0];
      if (!link || link.customer_id !== customer_id) {
        return Response.json({ success: false, error: 'Link not found' }, { status: 404 });
      }
      // Only allow removing manually-added links; referred links are tracking records.
      if (link.link_type !== 'added') {
        return Response.json({ success: false, error: 'Referral links cannot be removed' });
      }
      await base44.asServiceRole.entities.CustomerMerchantLink.delete(link_id);
      const linked_merchants = await fetchLinkedMerchants(base44, customer_id);
      return Response.json({ success: true, linked_merchants });
    }

    return Response.json({ success: false, error: 'Invalid action' });
  } catch (error) {
    console.error('manageCustomerPortal error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});