import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.14.0';

// Use the same JWT_SECRET-based salt as createMobileOrder / completeMobileOrder
// so PIN verification is consistent across all mobile endpoints. Fall back to
// the legacy salt for stations whose PIN was set before the salt migration.
const MOBILE_SALT = Deno.env.get('JWT_SECRET') ? `mobile:${Deno.env.get('JWT_SECRET')}` : '';
const LEGACY_MOBILE_SALT = 'opentill_mobile_salt_v1';

async function hashPinWith(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(pin + '_' + salt);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Only allow same-origin or relative redirect targets; reject anything else to prevent open-redirect phishing.
function sanitizeRedirectUrl(url: unknown, origin: string): string | null {
  if (typeof url !== 'string' || !url.trim()) return null;
  try {
    // Relative paths (starting with '/') are always safe.
    if (url.startsWith('/')) return `${origin}${url}`;
    const parsed = new URL(url);
    if (parsed.origin === origin) return url;
    return null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { token, pin, order_id, success_url, cancel_url } = body;
    const requestOrigin = req.headers.get('origin') || '';

    if (!token || !order_id) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Validate station token
    const stations = await base44.asServiceRole.entities.Station.filter({ mobile_station_token: token });
    if (!stations || stations.length === 0) {
      return Response.json({ success: false, error: 'Invalid station' }, { status: 404 });
    }
    const station = stations[0];
    if (!station.is_active || !station.mobile_access_enabled) {
      return Response.json({ success: false, error: 'Station not available' }, { status: 403 });
    }

    // Verify PIN if required (with lazy migration of legacy hashes)
    if (station.mobile_pin_hash) {
      if (!pin) {
        return Response.json({ success: false, error: 'PIN required', pin_required: true }, { status: 401 });
      }
      if (!MOBILE_SALT) {
        return Response.json({ success: false, error: 'PIN verification unavailable' }, { status: 500 });
      }
      const newHash = await hashPinWith(pin, MOBILE_SALT);
      if (newHash !== station.mobile_pin_hash) {
        const legacyHash = await hashPinWith(pin, LEGACY_MOBILE_SALT);
        if (legacyHash === station.mobile_pin_hash) {
          try {
            await base44.asServiceRole.entities.Station.update(station.id, { mobile_pin_hash: newHash });
          } catch (e) {
            console.warn('createMobileStripeCheckout: could not migrate PIN hash:', e);
          }
        } else {
          return Response.json({ success: false, error: 'Invalid PIN' }, { status: 401 });
        }
      }
    }

    // Get order
    const orders = await base44.asServiceRole.entities.Order.filter({ id: order_id });
    if (!orders || orders.length === 0) {
      return Response.json({ success: false, error: 'Order not found' }, { status: 404 });
    }
    const order = orders[0];
    if (order.merchant_id !== station.merchant_id) {
      return Response.json({ success: false, error: 'Order does not belong to this merchant' }, { status: 403 });
    }

    // Get merchant
    const merchants = await base44.asServiceRole.entities.Merchant.filter({ id: station.merchant_id });
    if (!merchants || merchants.length === 0) {
      return Response.json({ success: false, error: 'Merchant not found' }, { status: 404 });
    }
    const merchant = merchants[0];

    // Card is enabled by default; only an explicit payment_gateways.stripe.enabled === false disables it.
    const stripeExplicitlyOff = merchant.settings?.payment_gateways?.stripe?.enabled === false;
    if (stripeExplicitlyOff) {
      return Response.json({ success: false, error: 'Card payments not enabled for this merchant' }, { status: 400 });
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return Response.json({ success: false, error: 'Payment processor not configured' }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey);
    const currency = (merchant.settings?.currency || 'usd').toLowerCase();

    // Build line items from order
    const lineItems = (order.items || []).map((item: any) => ({
      price_data: {
        currency,
        product_data: {
          name: item.product_name || 'Item',
        },
        unit_amount: Math.round((item.unit_price || 0) * 100),
      },
      quantity: item.quantity || 1,
    }));

    // Add tax as a line item if applicable
    if (order.tax_amount > 0) {
      lineItems.push({
        price_data: {
          currency,
          product_data: { name: 'Tax' },
          unit_amount: Math.round(order.tax_amount * 100),
        },
        quantity: 1,
      });
    }

    // Add surcharge if applicable
    if (order.surcharge_amount > 0) {
      lineItems.push({
        price_data: {
          currency,
          product_data: { name: order.surcharge_label || 'Surcharge' },
          unit_amount: Math.round(order.surcharge_amount * 100),
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      submit_type: 'pay',
      success_url: sanitizeRedirectUrl(success_url, requestOrigin) || `${requestOrigin}/mobile/station/${token}?stripe_status=success&order_id=${order_id}`,
      cancel_url: sanitizeRedirectUrl(cancel_url, requestOrigin) || `${requestOrigin}/mobile/station/${token}?stripe_status=canceled&order_id=${order_id}`,
      metadata: {
        order_id,
        merchant_id: station.merchant_id,
        station_id: station.station_id,
      },
    });

    // Update order status
    await base44.asServiceRole.entities.Order.update(order_id, {
      status: 'payment_in_progress',
      payment_method: 'card',
      payment_details: {
        stripe_checkout_session_id: session.id,
      },
    });

    return Response.json({
      success: true,
      checkout_url: session.url,
      session_id: session.id,
    });
  } catch (error) {
    console.error('createMobileStripeCheckout error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});