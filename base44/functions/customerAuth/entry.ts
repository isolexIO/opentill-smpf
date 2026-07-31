import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import nodemailer from 'npm:nodemailer@6.9.7';

const PORTAL_SALT = Deno.env.get('JWT_SECRET') ? `portal:${Deno.env.get('JWT_SECRET')}` : '';
const LEGACY_PORTAL_SALT = 'opentill_customer_portal_2024';

// In-memory OTP store for set_pin verification: customer_id -> { code, expires_at }
const otpStore = new Map();
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

// In-memory rate limiting to throttle unauthenticated customer enumeration
// and PIN brute-force. Lookups are keyed by IP; auth actions by (identifier,IP).
const rlMap = new Map();
const RL_WINDOW = 15 * 60 * 1000; // 15 minutes
const LOOKUP_RATE_LIMIT = 20;     // lookups per IP per window
const IDENTIFIER_RATE_LIMIT = 8;  // auth attempts per (identifier,IP) per window
function checkRateLimit(key, limit) {
  const now = Date.now();
  const attempts = (rlMap.get(key) || []).filter((ts) => now - ts < RL_WINDOW);
  if (attempts.length >= limit) {
    rlMap.set(key, attempts);
    return false;
  }
  attempts.push(now);
  rlMap.set(key, attempts);
  return true;
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function issueOtp(customerId) {
  const code = generateOtp();
  otpStore.set(customerId, { code, expires_at: Date.now() + OTP_TTL_MS });
  return code;
}

// Deliver the OTP out-of-band to the customer's verified email address.
// Never return the code in the HTTP response — that would allow an
// unauthenticated attacker who only knows the identifier to take over
// the account by calling set_pin with the leaked code.
async function deliverOtpByEmail(customer, code) {
  const smtpHost = Deno.env.get('SMTP_HOST');
  const smtpUser = Deno.env.get('SMTP_USER');
  const smtpPass = Deno.env.get('SMTP_PASS');
  if (!smtpHost || !smtpUser || !smtpPass || !customer.email) {
    return false;
  }
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(Deno.env.get('SMTP_PORT') || '465'),
    secure: true,
    auth: { user: smtpUser, pass: smtpPass },
  });
  await transporter.sendMail({
    from: `"openTILL Customer Portal" <${smtpUser}>`,
    to: customer.email,
    subject: 'Your openTILL PIN setup verification code',
    text: `Your verification code to set your Customer Portal PIN is: ${code}\n\nThis code expires in 10 minutes. If you did not request this, you can safely ignore this email.`,
    html: `<p>Your verification code to set your Customer Portal PIN is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:4px">${code}</p><p>This code expires in 10 minutes. If you did not request this, you can safely ignore this email.</p>`,
  });
  return true;
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

async function hashPinWith(pin, salt) {
  const data = new TextEncoder().encode(salt + pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPin(pin) {
  if (!PORTAL_SALT) throw new Error('JWT_SECRET not configured');
  return hashPinWith(pin, PORTAL_SALT);
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

    // Throttle unauthenticated enumeration / PIN brute-force.
    const ipAddress = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
                       req.headers.get('x-real-ip') || 'unknown';
    const lookupKey = `lookup:${ipAddress}`;
    const identKey = `ident:${(identifier || '').toLowerCase()}:${ipAddress}`;

    // --- Lookup: find customer, check if PIN is set ---
    if (action === 'lookup') {
      if (!identifier) return Response.json({ success: false, error: 'Phone or email required' });
      // Throttle per-IP lookups to limit customer enumeration.
      if (!checkRateLimit(lookupKey, LOOKUP_RATE_LIMIT)) {
        return Response.json({ success: false, error: 'Too many attempts. Please try again later.' }, { status: 429 });
      }
      const customer = await findCustomer(base44, identifier);
      if (!customer) return Response.json({ success: false, error: 'No account found' });

      const pinSet = !!customer.pin_hash;
      const response = { success: true, pin_set: pinSet };
      if (!pinSet) {
        // Issue an OTP and deliver it out-of-band to the customer's verified
        // email. Never return the code in the response — that would let an
        // unauthenticated attacker who only knows the phone/email set a PIN
        // and take over the account.
        const code = issueOtp(customer.id);
        const delivered = await deliverOtpByEmail(customer, code);
        if (!delivered) {
          // No verified email on file (or SMTP not configured): do not issue
          // an OTP the caller could recover. The customer must set up their
          // PIN in person with the merchant instead.
          otpStore.delete(customer.id);
          return Response.json({
            success: false,
            error: 'Please visit your merchant to set up your PIN for the first time.',
            pin_setup_required: true,
          });
        }
        response.verification_code_sent = true;
      }
      return Response.json(response);
    }

    // --- Login: verify PIN and return full dashboard data ---
    if (action === 'login') {
      if (!identifier || !pin) return Response.json({ success: false, error: 'Identifier and PIN required' });
      if (!checkRateLimit(identKey, IDENTIFIER_RATE_LIMIT)) {
        return Response.json({ success: false, error: 'Too many attempts. Please try again later.' }, { status: 429 });
      }
      const customer = await findCustomer(base44, identifier);
      if (!customer) return Response.json({ success: false, error: 'No account found' });
      if (!customer.pin_hash) return Response.json({ success: false, error: 'PIN not set', pin_not_set: true });

      if (!PORTAL_SALT) return Response.json({ success: false, error: 'PIN verification unavailable' }, { status: 500 });
      const newHash = await hashPinWith(pin, PORTAL_SALT);
      if (newHash !== customer.pin_hash) {
        const legacyHash = await hashPinWith(pin, LEGACY_PORTAL_SALT);
        if (legacyHash === customer.pin_hash) {
          try {
            await base44.asServiceRole.entities.Customer.update(customer.id, { pin_hash: newHash });
          } catch (e) {
            console.warn('customerAuth: could not migrate PIN hash:', e);
          }
        } else {
          return Response.json({ success: false, error: 'Incorrect PIN' });
        }
      }

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
      if (!checkRateLimit(identKey, IDENTIFIER_RATE_LIMIT)) {
        return Response.json({ success: false, error: 'Too many attempts. Please try again later.' }, { status: 429 });
      }
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