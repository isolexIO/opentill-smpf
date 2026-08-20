import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    let body = {};
    try { body = await req.json(); } catch {}
    const merchant_id = body.merchant_id || new URL(req.url).searchParams.get('merchant_id');

    if (!merchant_id) {
      return Response.json({ success: false, error: 'merchant_id is required' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const merchants = await base44.asServiceRole.entities.Merchant.filter({ id: merchant_id });
    if (!merchants || merchants.length === 0) {
      return Response.json({ success: false, error: 'Merchant not found' }, { status: 404 });
    }
    let m = merchants[0];

    // Ensure the merchant has a unique referral code. Generate one lazily if
    // missing so every merchant — including ones activated before referral
    // codes were introduced — can share a referral link.
    if (!m.referral_code) {
      let referralCode;
      let isUnique = false;
      let attempts = 0;
      while (!isUnique && attempts < 10) {
        const businessSlug = (m.business_name || 'merchant')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .substring(0, 8) || 'merchant';
        const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        referralCode = `${businessSlug}${randomSuffix}`.toUpperCase();
        const existing = await base44.asServiceRole.entities.Merchant.filter({ referral_code: referralCode });
        isUnique = !existing || existing.length === 0;
        attempts++;
      }
      if (isUnique) {
        await base44.asServiceRole.entities.Merchant.update(merchant_id, { referral_code: referralCode });
        m = { ...m, referral_code: referralCode };
      }
    }

    // Return only display-safe settings (strip anything that could hold secrets)
    const safeSettings = { ...(m.settings || {}) };
    delete safeSettings.payment_gateways;
    delete safeSettings.hardware;

    return Response.json({
      success: true,
      merchant: {
        id: m.id,
        business_name: m.business_name,
        display_name: m.display_name,
        referral_code: m.referral_code || null,
        settings: safeSettings
      }
    });
  } catch (error) {
    console.error('getPublicMerchant error:', error);
    return Response.json({ success: false, error: 'Failed to load merchant', details: error.message }, { status: 500 });
  }
});