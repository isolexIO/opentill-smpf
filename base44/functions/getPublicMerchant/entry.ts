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
    const m = merchants[0];

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
        settings: safeSettings
      }
    });
  } catch (error) {
    console.error('getPublicMerchant error:', error);
    return Response.json({ success: false, error: 'Failed to load merchant', details: error.message }, { status: 500 });
  }
});