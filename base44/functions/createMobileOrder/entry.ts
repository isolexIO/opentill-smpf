import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const MOBILE_SALT = Deno.env.get('JWT_SECRET') ? `mobile:${Deno.env.get('JWT_SECRET')}` : '';
const LEGACY_MOBILE_SALT = 'opentill_mobile_salt_v1';

async function hashPinWith(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(pin + '_' + salt);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { token, pin, order_data } = body;

    if (!token || !order_data) {
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
            console.warn('createMobileOrder: could not migrate PIN hash:', e);
          }
        } else {
          return Response.json({ success: false, error: 'Invalid PIN' }, { status: 401 });
        }
      }
    }

    // Get merchant
    const merchants = await base44.asServiceRole.entities.Merchant.filter({ id: station.merchant_id });
    if (!merchants || merchants.length === 0) {
      return Response.json({ success: false, error: 'Merchant not found' }, { status: 404 });
    }
    const merchant = merchants[0];

    if (merchant.status === 'inactive' || merchant.status === 'suspended' || merchant.status === 'cancelled') {
      return Response.json({ success: false, error: 'Merchant account not active' }, { status: 403 });
    }

    // SECURITY: Validate order_data before creating. The client controls these
    // values, so enforce basic integrity: items must be a non-empty array, and
    // subtotal/total must be positive finite numbers. This prevents zero-dollar
    // or negative-total orders from being created and then completed for free.
    const items = Array.isArray(order_data.items) ? order_data.items : [];
    if (items.length === 0) {
      return Response.json({ success: false, error: 'Order must contain at least one item' }, { status: 400 });
    }
    const subtotal = Number(order_data.subtotal);
    const total = Number(order_data.total);
    if (!Number.isFinite(subtotal) || subtotal < 0) {
      return Response.json({ success: false, error: 'Invalid order subtotal' }, { status: 400 });
    }
    if (!Number.isFinite(total) || total <= 0) {
      return Response.json({ success: false, error: 'Order total must be greater than zero' }, { status: 400 });
    }

    // Create the order with service role. Only whitelisted fields from order_data
    // are used; merchant_id/dealer_id/station_id come from the authenticated
    // station, not the client.
    const order = await base44.asServiceRole.entities.Order.create({
      items: order_data.items,
      subtotal: order_data.subtotal,
      tax_amount: order_data.tax_amount || 0,
      discount_amount: order_data.discount_amount || 0,
      surcharge_amount: order_data.surcharge_amount || 0,
      tip_amount: order_data.tip_amount || 0,
      total: order_data.total,
      order_number: order_data.order_number,
      customer_id: order_data.customer_id || null,
      customer_name: order_data.customer_name || null,
      table_number: order_data.table_number || null,
      fulfillment_type: order_data.fulfillment_type || null,
      delivery_address: order_data.delivery_address || null,
      special_instructions: order_data.special_instructions || null,
      merchant_id: station.merchant_id,
      dealer_id: merchant.dealer_id,
      station_id: station.station_id,
      station_name: station.name,
      source: 'mobile_pos',
      status: 'pending',
    });

    return Response.json({
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number,
        total: order.total,
        items: order.items,
        subtotal: order.subtotal,
        tax_amount: order.tax_amount,
      },
    });
  } catch (error) {
    console.error('createMobileOrder error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});