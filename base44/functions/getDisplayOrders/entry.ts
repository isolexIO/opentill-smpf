import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    let body = {};
    try { body = await req.json(); } catch {}
    const { merchant_id, station_id, mode, current_order_id } = body;

    if (!merchant_id) {
      return Response.json({ success: false, error: 'merchant_id is required' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Kitchen mode: return all active orders for the station
    if (mode === 'kitchen') {
      const filter = { merchant_id, status: { $in: ['pending', 'processing'] } };
      if (station_id) filter.station_id = station_id;
      const orders = await base44.asServiceRole.entities.Order.filter(filter, '-created_date', 100);
      return Response.json({ success: true, orders: orders || [] });
    }

    // Customer mode: refresh the current order, or find the next pending one
    if (current_order_id) {
      const results = await base44.asServiceRole.entities.Order.filter({ id: current_order_id });
      return Response.json({ success: true, currentOrder: results && results[0] ? results[0] : null });
    }

    const filter = {
      merchant_id,
      status: { $in: ['preview', 'approval', 'tip_selection', 'ready_for_payment'] },
      sent_to_customer_display: false
    };
    if (station_id) filter.station_id = station_id;
    const pending = await base44.asServiceRole.entities.Order.filter(filter, '-created_date', 1);
    return Response.json({ success: true, pendingOrder: pending && pending[0] ? pending[0] : null });
  } catch (error) {
    console.error('getDisplayOrders error:', error);
    return Response.json({ success: false, error: 'Failed to load orders', details: error.message }, { status: 500 });
  }
});