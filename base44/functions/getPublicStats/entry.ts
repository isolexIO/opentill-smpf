import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Public endpoint to fetch platform statistics for the home page
 * Uses service role to bypass RLS restrictions
 */

// In-memory per-IP rate limiting + short response cache. This is a public
// endpoint that scans several full tables per call; rate-limiting caps
// anonymous abuse and the cache collapses repeated home-page loads.
const ipHits = new Map<string, number[]>();
const IP_WINDOW_MS = 60_000;
const IP_MAX = 30;
let statsCache = { data: null as any, expiresAt: 0 };
const STATS_TTL_MS = 60_000;

function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

Deno.serve(async (req) => {
  try {
    // Rate-limit anonymous callers to protect this public endpoint.
    const now = Date.now();
    const clientIp = getClientIp(req);
    const hits = (ipHits.get(clientIp) || []).filter(t => now - t < IP_WINDOW_MS);
    if (hits.length >= IP_MAX) {
      return Response.json({
        success: false,
        error: 'Too many requests. Please try again later.'
      }, { status: 429 });
    }
    hits.push(now);
    ipHits.set(clientIp, hits);
    if (ipHits.size > 5000) ipHits.clear();

    // Serve cached stats if still fresh.
    if (statsCache.data && now < statsCache.expiresAt) {
      return Response.json({ success: true, stats: statsCache.data });
    }

    const base44 = createClientFromRequest(req);

    // Use service role to bypass RLS and get stats
    const merchants = await base44.asServiceRole.entities.Merchant.list();
    const activeMerchants = merchants.filter(m => (m.status === 'active' || m.status === 'trial') && !m.is_demo);
    
    const dealers = await base44.asServiceRole.entities.Ambassador.list();
    const activeDealers = dealers.filter(d => d.status === 'active' || d.status === 'trial');

    // Calculate additional stats
    const totalRevenue = merchants.reduce((sum, m) => sum + (m.total_revenue || 0), 0);
    const totalBuilders = await base44.asServiceRole.entities.Builder.list();
    const verifiedBuilders = totalBuilders.filter(b => b.status === 'verified').length;

    const stats = {
      activeMerchants: activeMerchants.length,
      activeDealers: activeDealers.length,
      totalMerchants: merchants.length,
      totalDealers: dealers.length,
      totalRevenue: totalRevenue,
      totalBuilders: totalBuilders.length,
      verifiedBuilders: verifiedBuilders
    };
    statsCache = { data: stats, expiresAt: Date.now() + STATS_TTL_MS };

    return Response.json({ success: true, stats });

  } catch (error) {
    console.error('Error fetching public stats:', error);
    return Response.json({
      success: false,
      error: 'Failed to fetch stats',
      stats: {
        activeMerchants: 0,
        activeDealers: 0,
        totalMerchants: 0,
        totalDealers: 0,
        totalRevenue: 0,
        totalBuilders: 0,
        verifiedBuilders: 0
      }
    }, { status: 500 });
  }
});