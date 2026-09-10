import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Public lookup of a merchant by referral code. Used by the onboarding
// referral step, which is viewed by logged-out visitors — a direct entity
// read is blocked by Merchant RLS, so this runs with the service role and
// returns only public-safe fields.

// In-memory per-IP rate limiting to prevent anonymous enumeration abuse.
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

    let body = {};
    try { body = await req.json(); } catch {}
    const referral_code = (body.referral_code || '').toString().trim().toUpperCase();

    if (!referral_code) {
      return Response.json({ success: false, error: 'referral_code is required' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const merchants = await base44.asServiceRole.entities.Merchant.filter({ referral_code });

    if (merchants && merchants.length > 0) {
      const m = merchants[0];
      return Response.json({
        success: true,
        merchant: { id: m.id, business_name: m.business_name, referral_code: m.referral_code },
        referrer: { type: 'merchant', name: m.business_name, referral_code: m.referral_code },
      });
    }

    // No merchant matched — a customer's personal referral code also qualifies
    // (customers earn $DUC for referring merchants). Return it as a referrer.
    const customers = await base44.asServiceRole.entities.Customer.filter({ referral_code });
    if (customers && customers.length > 0) {
      const c = customers[0];
      return Response.json({
        success: true,
        merchant: null,
        referrer: { type: 'customer', name: c.name || 'openTILL Customer', referral_code: c.referral_code },
      });
    }

    return Response.json({ success: false, error: 'No merchant found with this referral code.' });
  } catch (error) {
    console.error('getMerchantByReferralCode error:', error);
    return Response.json({ success: false, error: 'Failed to look up referral code' }, { status: 500 });
  }
});