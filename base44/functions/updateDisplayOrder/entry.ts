import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { order_id, merchant_id, action, tip_amount, payment_method, payment_details, session_id } = body;

    if (!order_id || !merchant_id || !action) {
      return Response.json({ success: false, error: 'order_id, merchant_id, and action are required' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Authorization: authenticated merchant user/admin, OR a valid active
    // device session registered for this merchant. Prevents anonymous callers
    // from mutating orders (e.g. marking orders complete to bypass payment).
    let authorized = false;
    try {
      const user = await base44.auth.me();
      if (user && (user.role === 'admin' || user.merchant_id === merchant_id)) {
        authorized = true;
      } else if (user) {
        return Response.json({ success: false, error: 'Forbidden: merchant mismatch' }, { status: 403 });
      }
    } catch (e) {
      // Not authenticated — fall through to device session check.
    }

    if (!authorized && session_id) {
      const sessions = await base44.asServiceRole.entities.DeviceSession.filter({ session_id, merchant_id });
      if (sessions && sessions.length > 0) {
        const s = sessions[0];
        if (s.status === 'online' || s.status === 'idle') {
          authorized = true;
        }
      }
    }

    if (!authorized) {
      return Response.json({ success: false, error: 'Unauthorized: authentication or valid device session required' }, { status: 401 });
    }

    const results = await base44.asServiceRole.entities.Order.filter({ id: order_id });
    if (!results || results.length === 0) {
      return Response.json({ success: false, error: 'Order not found' }, { status: 404 });
    }
    const order = results[0];
    if (order.merchant_id !== merchant_id) {
      return Response.json({ success: false, error: 'Order does not belong to this merchant' }, { status: 403 });
    }

    let updates = {};
    switch (action) {
      case 'mark_sent':
        updates.sent_to_customer_display = true;
        break;
      case 'approve':
        updates.status = 'tip_selection';
        break;
      case 'set_tip': {
        const tip = Number(tip_amount) || 0;
        const total = (order.subtotal || 0) + (order.tax_amount || 0) + tip +
          (order.surcharge_amount || 0) - (order.discount_amount || 0);
        updates.tip_amount = tip;
        updates.total = total;
        updates.status = 'ready_for_payment';
        break;
      }
      case 'set_payment_method':
        updates.payment_method = payment_method;
        updates.status = 'payment_in_progress';
        break;
      case 'complete':
        updates.status = 'completed';
        if (payment_details) updates.payment_details = payment_details;
        break;
      case 'cancel':
        updates.status = 'cancelled';
        break;
      case 'kitchen_start':
        updates.status = 'processing';
        break;
      case 'kitchen_complete':
        updates.status = 'completed';
        break;
      default:
        return Response.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }

    const updated = await base44.asServiceRole.entities.Order.update(order_id, updates);
    return Response.json({ success: true, order: updated });
  } catch (error) {
    console.error('updateDisplayOrder error:', error);
    return Response.json({ success: false, error: 'Failed to update order', details: error.message }, { status: 500 });
  }
});