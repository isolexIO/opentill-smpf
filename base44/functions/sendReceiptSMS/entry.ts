import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import nodemailer from 'npm:nodemailer@6.9.7';
// redeploy trigger

// Carrier email-to-SMS gateways (US carriers)
const CARRIER_GATEWAYS = {
  att: 'txt.att.net',
  verizon: 'vtext.com',
  tmobile: 'tmomail.net',
  sprint: 'messaging.sprintpcs.com',
  boost: 'sms.myboostmobile.com',
  cricket: 'sms.cricketwireless.net',
  uscellular: 'email.uscc.net',
  googlefi: 'msg.fi.google.com',
  metropcs: 'mymetropcs.com',
};

// Simple in-memory rate limiting (per-IP) to protect the endpoint
const ipHits = new Map();
function rateLimited(ip, maxPerWindow = 5, windowMs = 60000) {
  const now = Date.now();
  const hits = (ipHits.get(ip) || []).filter((t) => now - t < windowMs);
  if (hits.length >= maxPerWindow) return true;
  hits.push(now);
  ipHits.set(ip, hits);
  return false;
}

Deno.serve(async (req) => {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (rateLimited(ip, 5, 60000)) {
      return Response.json({ error: 'Too many requests. Please wait a minute.' }, { status: 429 });
    }

    // Require authentication — prevents unauthenticated SMS relay abuse.
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }
    const isAdmin = user.role === 'admin' || user.role === 'root_admin' || user.role === 'super_admin';
    const callerMerchantId = (user.data && user.data.merchant_id) || user.merchant_id;

    const body = await req.json();
    const { phone, carrier, order_id } = body;

    // Validate phone (10 digits)
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.length !== 10) {
      return Response.json({ error: 'A valid 10-digit phone number is required' }, { status: 400 });
    }

    // Validate carrier
    const gateway = CARRIER_GATEWAYS[carrier];
    if (!gateway) {
      return Response.json({ error: 'Unsupported carrier' }, { status: 400 });
    }

    // Require an order_id — the receipt URL and business name are derived
    // server-side from the order so callers cannot inject phishing links or
    // spoof the sender brand.
    if (!order_id) {
      return Response.json({ error: 'order_id is required' }, { status: 400 });
    }

    const orders = await base44.asServiceRole.entities.Order.filter({ id: order_id });
    if (!orders || orders.length === 0) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }
    const order = orders[0];
    if (!isAdmin && order.merchant_id !== callerMerchantId) {
      return Response.json({ error: 'Forbidden: order does not belong to your merchant' }, { status: 403 });
    }

    // Generate the receipt URL server-side from the app origin.
    const appOrigin = new URL(req.url).origin;
    const receiptUrl = `${appOrigin}/receipt/${order_id}`;

    // Resolve the business name from the merchant record (no client input).
    let businessName = 'openTILL';
    try {
      const merchants = await base44.asServiceRole.entities.Merchant.filter({ id: order.merchant_id });
      if (merchants && merchants.length > 0) {
        businessName = merchants[0].business_name || merchants[0].display_name || 'openTILL';
      }
    } catch {
      // fall back to default brand name
    }

    // Verify SMTP credentials are configured
    const smtpHost = Deno.env.get('SMTP_HOST');
    const smtpUser = Deno.env.get('SMTP_USER');
    const smtpPass = Deno.env.get('SMTP_PASS');

    if (!smtpHost || !smtpUser || !smtpPass) {
      return Response.json({ error: 'SMS service not configured' }, { status: 503 });
    }

    const smtpPortNum = parseInt(Deno.env.get('SMTP_PORT') || '465');
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPortNum,
      secure: smtpPortNum === 465,
      requireTLS: smtpPortNum !== 465,
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 15000,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const smsEmail = `${digits}@${gateway}`;
    const smsBody = `Your ${businessName} receipt (Order #${order.order_number || ''}): ${receiptUrl}`.slice(0, 160);

    await transporter.sendMail({
      from: `"openTILL POS" <${smtpUser}>`,
      to: smsEmail,
      subject: '',
      text: smsBody,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('sendReceiptSMS error:', error);
    return Response.json({ error: error.message || 'Failed to send SMS' }, { status: 500 });
  }
});