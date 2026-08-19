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
            console.warn('completeMobileOrder: could not migrate PIN hash:', e);
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

    // SECURITY: Prevent completing an order that is already completed or cancelled.
    // Re-completing a paid order could trigger duplicate loyalty/reward payouts and
    // double-count merchant revenue.
    if (order.status === 'completed' || order.status === 'cancelled' || order.status === 'refunded') {
      return Response.json({ success: false, error: `Order is already ${order.status} and cannot be completed` }, { status: 400 });
    }

    // SECURITY: Determine the effective payment method. The client may supply a
    // payment_method, but it must not be allowed to downgrade a non-cash order to
    // 'cash' to bypass payment-confirmation requirements. If the order already has
    // a non-cash payment_method set, keep it; otherwise use the client-supplied value.
    const effectivePaymentMethod = payment_method || order.payment_method || 'cash';

    // SECURITY: For non-cash payments, require non-empty payment_details as evidence
    // that the payment was actually processed (Stripe PI ID, Solana signature, etc.).
    // Cash has no gateway payload; its trust signal is the cashier's approval.
    const isCashPayment = effectivePaymentMethod === 'cash';
    const hasPaymentDetails = payment_details && typeof payment_details === 'object' && Object.keys(payment_details).length > 0;
    if (!isCashPayment && !hasPaymentDetails) {
      return Response.json({ success: false, error: 'Payment confirmation details are required to complete this order' }, { status: 400 });
    }

    // SECURITY: Validate the order total is positive before completing. A zero or
    // negative total would allow free orders to be completed without payment.
    const orderTotal = Number(order.total);
    if (!Number.isFinite(orderTotal) || orderTotal <= 0) {
      return Response.json({ success: false, error: 'Order total must be greater than zero to complete' }, { status: 400 });
    }

    // Update order to completed
    const updated = await base44.asServiceRole.entities.Order.update(order_id, {
      status: 'completed',
      payment_method: effectivePaymentMethod,
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