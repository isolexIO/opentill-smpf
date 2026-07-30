import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SALT = 'opentill_customer_portal_2024';

// In-memory OTP store for set_pin verification: customer_id -> { code, expires_at }
const otpStore = new Map();
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function issueOtp(customerId) {
  const code = generateOtp();
  otpStore.set(customerId, { code, expires_at: Date.now() + OTP_TTL_MS });
  return code;
}

function verifyOtp(customerId, code) {
  const entry = otpStore.get(customerId);
  if (!entry) return false;
  if (Date.now() > entry.expires_at) {
    otpStore.delete(customerId);
    return false;
  }
  if (entry.code !== code) return false;
  otpStore.delete(customerId); // single-use
  return true;
}

async function hashPin(pin) {
  const data = new TextEncoder().encode(SALT + pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function findCustomer(base44, identifier) {
  const isEmail = identifier.includes('@');
  const query = isEmail ? { email: identifier.toLowerCase().trim() } : { phone: identifier.trim() };
  const customers = await base44.asServiceRole.entities.Customer.filter(query);
  return customers && customers.length > 0 ? customers[0] : null;
}

async function fetchOrders(base44, customerId) {
  try {
    const orders = await base44.asServiceRole.entities.Order.filter({ customer_id: customerId }, '-created_date', 20);
    return (orders || []).filter(o => o.status === 'completed').map(o => ({
      order_number: o.order_number,
      total: o.total || 0,
      payment_method: o.payment_method,
      item_count: (o.items || []).length,
      items: (o.items || []).slice(0, 3).map(i => ({ name: i.product_name, qty: i.quantity, price: i.unit_price })),
      created_date: o.created_date,
    }));
  } catch { return []; }
}

async function fetchMerchantName(base44, merchantId) {
  try {
    const merchants = await base44.asServiceRole.entities.Merchant.filter({ id: merchantId });
    if (merchants && merchants.length > 0) {
      return merchants[0].business_name || merchants[0].display_name || 'Merchant';
    }
  } catch { /* non-fatal */ }
  return 'Merchant';
}

function buildCustomerData(customer, merchantName) {
  return {
    id: customer.id,
    name: customer.name,
    loyalty_points: customer.loyalty_points || 0,
    duc_balance: customer.duc_balance || 0,
    duc_lifetime_earned: customer.duc_lifetime_earned || 0,
    total_spent: customer.total_spent || 0,
    visit_count: customer.visit_count || 0,
    merchant_id: customer.merchant_id,
    merchant_name: merchantName,
  };
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { action, identifier, pin } = body;
    const base44 = createClientFromRequest(req);

    // --- Lookup: find customer, check if PIN is set ---
    if (action === 'lookup') {
      if (!identifier) return Response.json({ success: false, error: 'Phone or email required' });
      const customer = await findCustomer(base44, identifier);
      if (!customer) return Response.json({ success: false, error: 'No account found' });

      const pinSet = !!customer.pin_hash;
      const response = { success: true, pin_set: pinSet, customer_name: customer.name };
      if (!pinSet) {
        // Issue a one-time verification code the customer must present to set_pin.
        // In production this would be sent via SMS/email; for now it is returned
        // to the client so the merchant can relay it at the point of sale.
        response.verification_code = issueOtp(customer.id);
      }
      return Response.json(response);
    }

    // --- Login: verify PIN and return full dashboard data ---
    if (action === 'login') {
      if (!identifier || !pin) return Response.json({ success: false, error: 'Identifier and PIN required' });
      const customer = await findCustomer(base44, identifier);
      if (!customer) return Response.json({ success: false, error: 'No account found' });
      if (!customer.pin_hash) return Response.json({ success: false, error: 'PIN not set', pin_not_set: true });

      const pinHash = await hashPin(pin);
      if (pinHash !== customer.pin_hash) return Response.json({ success: false, error: 'Incorrect PIN' });

      const merchantName = await fetchMerchantName(base44, customer.merchant_id);
      const orders = await fetchOrders(base44, customer.id);

      // Update last login timestamp
      try {
        await base44.asServiceRole.entities.Customer.update(customer.id, { last_portal_login: new Date().toISOString() });
      } catch { /* non-fatal */ }

      return Response.json({
        success: true,
        customer: buildCustomerData(customer, merchantName),
        orders,
      });
    }

    // --- Set PIN: first-time PIN setup (requires OTP verification) ---
    if (action === 'set_pin') {
      const { verification_code } = body;
      if (!identifier || !pin) return Response.json({ success: false, error: 'Identifier and PIN required' });
      if (!verification_code) return Response.json({ success: false, error: 'Verification code required' });
      if (pin.length < 4) return Response.json({ success: false, error: 'PIN must be at least 4 digits' });
      const customer = await findCustomer(base44, identifier);
      if (!customer) return Response.json({ success: false, error: 'No account found' });
      if (customer.pin_hash) return Response.json({ success: false, error: 'PIN already set' });

      if (!verifyOtp(customer.id, verification_code)) {
        return Response.json({ success: false, error: 'Invalid or expired verification code' });
      }

      const pinHash = await hashPin(pin);
      await base44.asServiceRole.entities.Customer.update(customer.id, { pin_hash: pinHash, last_portal_login: new Date().toISOString() });

      const merchantName = await fetchMerchantName(base44, customer.merchant_id);
      const orders = await fetchOrders(base44, customer.id);

      return Response.json({
        success: true,
        customer: buildCustomerData(customer, merchantName),
        orders,
      });
    }

    return Response.json({ success: false, error: 'Invalid action' });
  } catch (error) {
    console.error('customerAuth error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});