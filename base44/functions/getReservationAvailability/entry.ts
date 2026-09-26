import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

// Public endpoint: returns a merchant's active tables and any existing
// reservations for a given date so guests can pick an open table/time.
const ipHits = new Map<string, number[]>();
const IP_WINDOW_MS = 60_000;
const IP_MAX = 30;

function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

Deno.serve(async (req) => {
  try {
    const now = Date.now();
    const clientIp = getClientIp(req);
    const hits = (ipHits.get(clientIp) || []).filter(t => now - t < IP_WINDOW_MS);
    if (hits.length >= IP_MAX) {
      return Response.json({ success: false, error: 'Too many requests. Please try again later.' }, { status: 429 });
    }
    hits.push(now);
    ipHits.set(clientIp, hits);
    if (ipHits.size > 5000) ipHits.clear();

    let body: any = {};
    try { body = await req.json(); } catch {}
    const merchant_id = body.merchant_id || new URL(req.url).searchParams.get('merchant_id');
    const date = body.date || new URL(req.url).searchParams.get('date');

    if (!merchant_id) {
      return Response.json({ success: false, error: 'merchant_id is required' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const merchants = await base44.asServiceRole.entities.Merchant.filter({ id: merchant_id });
    if (!merchants || merchants.length === 0) {
      return Response.json({ success: false, error: 'Merchant not found' }, { status: 404 });
    }
    const merchant = merchants[0];

    const tables = await base44.asServiceRole.entities.RestaurantTable.filter({
      merchant_id, is_active: true
    });

    let reservations: any[] = [];
    if (date) {
      reservations = await base44.asServiceRole.entities.Reservation.filter({
        merchant_id,
        reservation_date: date,
        status: { $in: ['pending', 'confirmed', 'seated'] }
      });
    }

    return Response.json({
      success: true,
      merchant: {
        id: merchant.id,
        business_name: merchant.business_name,
        display_name: merchant.display_name
      },
      tables: (tables || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        table_number: t.table_number,
        capacity: t.capacity,
        section: t.section,
        shape: t.shape,
        status: t.status
      })),
      reservations: (reservations || []).map((r: any) => ({
        id: r.id,
        table_id: r.table_id,
        table_name: r.table_name,
        reservation_time: r.reservation_time,
        duration_minutes: r.duration_minutes,
        party_size: r.party_size,
        customer_name: r.customer_name,
        status: r.status
      }))
    });
  } catch (error) {
    console.error('getReservationAvailability error:', error);
    return Response.json({ success: false, error: 'Failed to load availability' }, { status: 500 });
  }
});