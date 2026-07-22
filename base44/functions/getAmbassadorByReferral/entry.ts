import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Public-safe fields shown on the merchant onboarding referral screen.
const PUBLIC_FIELDS = ['name', 'logo_url', 'contact_email', 'contact_phone', 'domain', 'slug', 'primary_color', 'secondary_color'];

const sanitize = (record) => {
  if (!record) return null;
  const safe = {};
  for (const key of PUBLIC_FIELDS) {
    if (record[key] !== undefined) safe[key] = record[key];
  }
  return safe;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let body = {};
    try { body = await req.json(); } catch { body = {}; }
    const referralId = (body.referral_id || body.dealer_id || body.id || '').toString().trim();
    if (!referralId) {
      return Response.json({ success: false, error: 'No referral id provided.' }, { status: 400 });
    }

    // 1. Try the public Ambassador entity first (preferred / "no dealers" world).
    try {
      const ambassadors = await base44.asServiceRole.entities.Ambassador.filter({ id: referralId });
      if (ambassadors && ambassadors.length > 0) {
        return Response.json({ success: true, ambassador: sanitize(ambassadors[0]), source: 'ambassador' });
      }
    } catch { /* fall through to dealer */ }

    // 2. Legacy referral links carry a Dealer id. Dealer records contain secrets
    //    (password hashes, payout details) so we read with the service role and
    //    return ONLY the public-safe fields.
    try {
      const dealers = await base44.asServiceRole.entities.Dealer.filter({ id: referralId });
      if (dealers && dealers.length > 0) {
        return Response.json({ success: true, ambassador: sanitize(dealers[0]), source: 'dealer' });
      }
    } catch { /* ignore */ }

    return Response.json({ success: false, error: 'Ambassador not found.' }, { status: 404 });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});