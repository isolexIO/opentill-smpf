import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin + '_opentill_mobile_salt_v1');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { token, pin, order_id, payment_method, payment_details } = body;

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

    // Get order
    const orders = await base44.asServiceRole.entities.Order.filter({ id: order_id });
    if (!orders || orders.length === 0) {
      return Response.json({ success: false, error: 'Order not found' }, { status: 404 });
    }
    const order = orders[0];
    if (order.merchant_id !== station.merchant_id) {
      return Response.json({ success: false, error: 'Order does not belong to this merchant' }, { status: 403 });
    }

    // Update order to completed
    const updated = await base44.asServiceRole.entities.Order.update(order_id, {
      status: 'completed',
      payment_method: payment_method || order.payment_method,
      payment_details: {
        ...(order.payment_details || {}),
        ...(payment_details || {}),
      },
    });

    // Update customer loyalty
    if (updated.customer_id) {
      try {
        const customers = await base44.asServiceRole.entities.Customer.filter({ id: updated.customer_id });
        if (customers && customers.length > 0) {
          const customer = customers[0];
          const pointsEarned = Math.floor((updated.total || 0) / 10);
          await base44.asServiceRole.entities.Customer.update(updated.customer_id, {
            loyalty_points: (customer.loyalty_points || 0) + pointsEarned,
            total_spent: (customer.total_spent || 0) + (updated.total || 0),
            visit_count: (customer.visit_count || 0) + 1,
          });
        }
      } catch (e) {
        console.warn('completeMobileOrder: Could not update customer loyalty:', e);
      }
    }

    // Update merchant totals
    try {
      const merchants = await base44.asServiceRole.entities.Merchant.filter({ id: station.merchant_id });
      if (merchants && merchants.length > 0) {
        const merchant = merchants[0];
        await base44.asServiceRole.entities.Merchant.update(station.merchant_id, {
          total_revenue: (merchant.total_revenue || 0) + (order.total || 0),
          total_orders: (merchant.total_orders || 0) + 1,
        });
      }
    } catch (e) {
      console.warn('completeMobileOrder: Could not update merchant totals:', e);
    }

    return Response.json({
      success: true,
      order: {
        id: updated.id,
        order_number: updated.order_number,
        total: updated.total,
        status: updated.status,
      },
    });
  } catch (error) {
    console.error('completeMobileOrder error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});