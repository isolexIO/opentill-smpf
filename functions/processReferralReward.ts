import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Only process when new rewards are created for merchants
    if (event.type !== 'create' || !data || !data.merchant_id) {
      return Response.json({ success: true, message: 'Skipped - not relevant' });
    }

    // Check if this merchant was referred by someone
    const referrals = await base44.asServiceRole.entities.MerchantReferral.filter({
      referred_merchant_id: data.merchant_id,
      status: 'active'
    });

    if (!referrals || referrals.length === 0) {
      return Response.json({ success: true, message: 'No active referral found' });
    }

    const referral = referrals[0];

    // Get vault settings for referral reward rate
    const globalSettings = await base44.asServiceRole.entities.cLINKVaultSettings.filter({
      merchant_id: null
    });

    const settings = globalSettings[0];
    if (!settings || !settings.referral_reward_rate) {
      return Response.json({ success: true, message: 'Referral rewards not configured' });
    }

    // Calculate referral reward (percentage of the referred merchant's reward)
    const referralRewardAmount = data.amount * settings.referral_reward_rate;

    // Check minimum threshold
    const minReferralReward = settings.min_referral_reward || 0.001;
    if (referralRewardAmount < minReferralReward) {
      return Response.json({ 
        success: true, 
        message: `Referral reward ${referralRewardAmount} below minimum ${minReferralReward}` 
      });
    }

    // Create referral reward for the referrer
    await base44.asServiceRole.entities.cLINKReward.create({
      merchant_id: referral.referrer_merchant_id,
      amount: referralRewardAmount,
      reward_type: 'referral_bonus',
      status: 'available',
      source_reference: data.id,
      description: `Referral bonus from ${referral.referred_name}'s rewards`,
      metadata: {
        referred_merchant_id: referral.referred_merchant_id,
        referred_merchant_name: referral.referred_name,
        original_reward_id: data.id,
        original_reward_amount: data.amount,
        referral_id: referral.id
      }
    });

    // Update referral stats
    await base44.asServiceRole.entities.MerchantReferral.update(referral.id, {
      total_rewards_earned: (referral.total_rewards_earned || 0) + referralRewardAmount
    });

    // Log the referral reward
    await base44.asServiceRole.entities.SystemLog.create({
      merchant_id: referral.referrer_merchant_id,
      log_type: 'merchant_action',
      action: 'Referral Reward Earned',
      description: `Earned ${referralRewardAmount.toFixed(4)} $cLINK from referring ${referral.referred_name}`,
      severity: 'info',
      metadata: {
        referral_id: referral.id,
        reward_amount: referralRewardAmount,
        referred_merchant: referral.referred_name
      }
    });

    return Response.json({
      success: true,
      referral_reward: referralRewardAmount,
      referrer_merchant_id: referral.referrer_merchant_id
    });

  } catch (error) {
    console.error('Process referral reward error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});