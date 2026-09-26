import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

// Public endpoint: creates a reservation for a guest. Validates party size
// against table capacity and prevents double-booking a table in the same
// time window. Uses the service role because guests are unauthenticated.
const ipHits = new Map<string, number[]>();
const IP_WINDOW_MS = 60_000;
const IP_MAX = 15;

function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

function parseTime(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function genCode(): string {
  return 'RES-' + Math.random().toString(36).substring(2, 8).toUpperCase();
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
    const {
      merchant_id, table_id, customer_name, customer_phone, customer_email,
      party_size, reservation_date, reservation_time, duration_minutes, special_requests
    } = body || {};

    if (!merchant_id || !customer_name || !reservation_date || !reservation_time || !party_size) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }
    if (typeof party_size !== 'number' || party_size < 1 || party_size > 30) {
      return Response.json({ success: false, error: 'Party size must be between 1 and 30' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const merchants = await base44.asServiceRole.entities.Merchant.filter({ id: merchant_id });
    if (!merchants || merchants.length === 0) {
      return Response.json({ success: false, error: 'Merchant not found' }, { status: 404 });
    }
    const merchant = merchants[0];

    let table: any = null;
    if (table_id) {
      const tables = await base44.asServiceRole.entities.RestaurantTable.filter({ id: table_id, merchant_id });
      if (!tables || tables.length === 0) {
        return Response.json({ success: false, error: 'Table not found' }, { status: 404 });
      }
      table = tables[0];
      if (table.capacity && party_size > table.capacity) {
        return Response.json({ success: false, error: `This table seats up to ${table.capacity} guests` }, { status: 400 });
      }
      // Prevent overlapping bookings on the same table
      const existing = await base44.asServiceRole.entities.Reservation.filter({
        merchant_id, table_id, reservation_date, status: { $in: ['pending', 'confirmed', 'seated'] }
      });
      const dur = duration_minutes || 90;
      const newStart = parseTime(reservation_time);
      const newEnd = newStart + dur;
      for (const r of existing) {
        const rStart = parseTime(r.reservation_time);
        const rEnd = rStart + (r.duration_minutes || 90);
        if (newStart < rEnd && newEnd > rStart) {
          return Response.json({
            success: false,
            error: 'That table is already booked for the selected time. Please choose another time or table.'
          }, { status: 409 });
        }
      }
    }

    const confirmation_code = genCode();
    const reservation = await base44.asServiceRole.entities.Reservation.create({
      merchant_id,
      dealer_id: merchant.dealer_id || null,
      table_id: table_id || null,
      table_name: table?.name || null,
      customer_name,
      customer_phone: customer_phone || null,
      customer_email: customer_email || null,
      party_size,
      reservation_date,
      reservation_time,
      duration_minutes: duration_minutes || 90,
      status: 'pending',
      source: 'online',
      special_requests: special_requests || null,
      confirmation_code
    });

    return Response.json({ success: true, reservation });
  } catch (error) {
    console.error('createReservation error:', error);
    return Response.json({ success: false, error: 'Failed to create reservation' }, { status: 500 });
  }
});