import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Public lookup of a merchant by referral code. Used by the onboarding
// referral step, which is viewed by logged-out visitors — a direct entity
// read is blocked by Merchant RLS, so this runs with the service role and
// returns only public-safe fields.
Deno.serve(async (req) => {
  try {
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

    return Response.json({ success: false, error: 'No merchant found with this referral code.' }, { status: 404 });
  } catch (error) {
    console.error('getMerchantByReferralCode error:', error);
    return Response.json({ success: false, error: 'Failed to look up referral code' }, { status: 500 });
  }
});