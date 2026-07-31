import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PORTAL_SALT = Deno.env.get('OPENTILL_CUSTOMER_PORTAL_SALT');
const LEGACY_PORTAL_SALT = 'opentill_customer_portal_2024';

async function hashPinWith(pin, salt) {
  const data = new TextEncoder().encode(salt + pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function findCustomer(base44, identifier) {
  const isEmail = identifier.includes('@');
  const query = isEmail ? { email: identifier.toLowerCase().trim() } : { phone: identifier.trim() };
  const customers = await base44.asServiceRole.entities.Customer.filter(query);
  return customers && customers.length > 0 ? customers[0] : null;
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { phone, email, customer_id, pin } = body;
    const base44 = createClientFromRequest(req);

    // Require a PIN for all requests — prevents unauthenticated PII exposure
    if (!pin) {
      return Response.json({ success: false, error: 'PIN is required' }, { status: 401 });
    }

    let customer = null;

    if (customer_id) {
      const customers = await base44.asServiceRole.entities.Customer.filter({ id: customer_id });
      if (customers && customers.length > 0) customer = customers[0];
    } else {
      const identifier = phone || email;
      if (identifier) {
        customer = await findCustomer(base44, identifier);
      }
    }

    if (!customer) {
      return Response.json({ success: false, error: 'Customer not found' }, { status: 404 });
    }

    // Verify the PIN against the stored hash before returning any data
    if (!customer.pin_hash) {
      return Response.json({ success: false, error: 'PIN not set — please contact the merchant' }, { status: 403 });
    }

    if (!PORTAL_SALT) {
      return Response.json({ success: false, error: 'PIN verification unavailable' }, { status: 500 });
    }
    const newHash = await hashPinWith(pin, PORTAL_SALT);
    if (newHash !== customer.pin_hash) {
      const legacyHash = await hashPinWith(pin, LEGACY_PORTAL_SALT);
      if (legacyHash === customer.pin_hash) {
        try {
          await base44.asServiceRole.entities.Customer.update(customer.id, { pin_hash: newHash });
        } catch (e) {
          console.warn('getCustomerPortalData: could not migrate PIN hash:', e);
        }
      } else {
        return Response.json({ success: false, error: 'Incorrect PIN' }, { status: 401 });
      }
    }

    // Get merchant name
    let merchantName = 'Merchant';
    try {
      const merchants = await base44.asServiceRole.entities.Merchant.filter({ id: customer.merchant_id });
      if (merchants && merchants.length > 0) {
        merchantName = merchants[0].business_name || merchants[0].display_name || 'Merchant';
      }
    } catch { /* non-fatal */ }

    return Response.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        loyalty_points: customer.loyalty_points || 0,
        duc_balance: customer.duc_balance || 0,
        duc_lifetime_earned: customer.duc_lifetime_earned || 0,
        total_spent: customer.total_spent || 0,
        visit_count: customer.visit_count || 0,
        merchant_id: customer.merchant_id,
        merchant_name: merchantName,
      },
    });
  } catch (error) {
    console.error('getCustomerPortalData error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});