import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin + '_opentill_mobile_salt_v1');
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

    // Verify PIN if required
    if (station.mobile_pin_hash) {
      if (!pin) {
        return Response.json({ success: false, error: 'PIN required', pin_required: true }, { status: 401 });
      }
      const pinHash = await hashPin(pin);
      if (pinHash !== station.mobile_pin_hash) {
        return Response.json({ success: false, error: 'Invalid PIN' }, { status: 401 });
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

    // Create the order with service role
    const order = await base44.asServiceRole.entities.Order.create({
      ...order_data,
      merchant_id: station.merchant_id,
      dealer_id: merchant.dealer_id,
      station_id: station.station_id,
      station_name: station.name,
      source: 'mobile_pos',
      status: order_data.status || 'pending',
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