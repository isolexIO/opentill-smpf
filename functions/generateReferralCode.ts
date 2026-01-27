import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (!user.merchant_id && user.role !== 'admin')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { merchant_id } = await req.json();
    const targetMerchantId = merchant_id || user.merchant_id;

    if (!targetMerchantId) {
      return Response.json({ error: 'merchant_id required' }, { status: 400 });
    }

    // Get merchant
    const merchants = await base44.asServiceRole.entities.Merchant.filter({ id: targetMerchantId });
    if (!merchants || merchants.length === 0) {
      return Response.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const merchant = merchants[0];

    // Check if merchant already has a referral code
    if (merchant.referral_code) {
      return Response.json({
        success: true,
        referral_code: merchant.referral_code,
        message: 'Existing referral code'
      });
    }

    // Generate unique referral code
    let referralCode;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      // Create code from business name + random chars
      const businessSlug = merchant.business_name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 8);
      
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      referralCode = `${businessSlug}${randomSuffix}`.toUpperCase();

      // Check if code already exists
      const existing = await base44.asServiceRole.entities.Merchant.filter({ 
        referral_code: referralCode 
      });
      
      isUnique = !existing || existing.length === 0;
      attempts++;
    }

    if (!isUnique) {
      return Response.json({ error: 'Failed to generate unique code' }, { status: 500 });
    }

    // Update merchant with referral code
    await base44.asServiceRole.entities.Merchant.update(targetMerchantId, {
      referral_code: referralCode
    });

    // Log the action
    await base44.asServiceRole.entities.SystemLog.create({
      merchant_id: targetMerchantId,
      log_type: 'merchant_action',
      action: 'Referral Code Generated',
      description: `Generated referral code: ${referralCode}`,
      severity: 'info',
      actor_id: user.id,
      actor_email: user.email
    });

    return Response.json({
      success: true,
      referral_code: referralCode,
      share_url: `${req.headers.get('origin')}/MerchantOnboarding?ref=${referralCode}`
    });

  } catch (error) {
    console.error('Generate referral code error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});