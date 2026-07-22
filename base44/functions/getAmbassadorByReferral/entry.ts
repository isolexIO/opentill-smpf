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

    // Resolve by whatever identifier the referral link carries: legacy dealer id
    // (migrated), the Ambassador record id, or the URL slug.
    let ambassadors = [];
    try {
      ambassadors = await base44.asServiceRole.entities.Ambassador.filter({ legacy_dealer_id: referralId });
    } catch { /* try next */ }
    if (!ambassadors || ambassadors.length === 0) {
      try {
        ambassadors = await base44.asServiceRole.entities.Ambassador.filter({ id: referralId });
      } catch { /* try next */ }
    }
    if ((!ambassadors || ambassadors.length === 0) && referralId.length < 40) {
      try {
        ambassadors = await base44.asServiceRole.entities.Ambassador.filter({ slug: referralId.toLowerCase() });
      } catch { /* not found */ }
    }
    if (ambassadors && ambassadors.length > 0) {
      return Response.json({ success: true, ambassador: sanitize(ambassadors[0]), source: 'ambassador' });
    }

    return Response.json({ success: false, error: 'Ambassador not found.' }, { status: 404 });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});