import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Calculate monthly $DUC rewards based on CC processing volume.
 * (Hardened: anonymous callers may only run the bulk path; targeted
 * reward minting requires an admin session or the internal secret.)
 * - Per-merchant path: pass { merchant_id } (admin manual trigger).
 * - Bulk path (automation): omit merchant_id to calculate for every active merchant.
 * Idempotent: skips merchants that already have a processing_volume reward for the period.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Dual-mode: allow platform automation (no authenticated user) OR admin manual trigger.
    let user = null;
    try { user = await base44.auth.me(); } catch (e) {}
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({})) || {};
    const { merchant_id, processing_volume, override_percentage, _internal_secret } = body;

    // SECURITY: anonymous (automation) callers may only run the default bulk
    // reward calculation. Targeting a specific merchant or injecting a custom
    // processing_volume / override_percentage requires either a platform
    // admin session or the server internal secret (JWT_SECRET), preventing
    // unauthenticated reward minting / token inflation.
    const isTargeted = !!(merchant_id || processing_volume || override_percentage);
    if (!user && isTargeted) {
      const internalSecret = Deno.env.get('JWT_SECRET');
      const isAutomation = !!(internalSecret && _internal_secret && _internal_secret === internalSecret);
      if (!isAutomation) {
        return Response.json({ error: 'Unauthorized - Platform admin or internal automation secret required for targeted reward minting' }, { status: 401 });
      }
    }

    // Billing period = previous calendar month.
    const periodStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
    const periodEnd = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    if (!merchant_id) {
      return await runBulkMonthlyRewards(base44, user, periodStart, periodEnd);
    }

    const result = await runMerchantMonthlyReward(base44, user, merchant_id, processing_volume, override_percentage, periodStart, periodEnd);
    return Response.json(result);
  } catch (error) {
    console.error('Calculate rewards error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});

async function runBulkMonthlyRewards(base44, user, periodStart, periodEnd) {
  const merchants = await base44.asServiceRole.entities.Merchant.filter({ status: 'active' });
  const results = { processed: 0, created: 0, skipped_existing: 0, skipped_zero: 0, errors: [] };

  for (const merchant of merchants) {
    try {
      results.processed++;

      // Idempotency: skip if a processing_volume reward already exists for this period.
      const existing = await base44.asServiceRole.entities.cLINKReward.filter({
        merchant_id: merchant.id,
        reward_type: 'processing_volume',
        period_start: periodStart.toISOString()
      });
      if (existing && existing.length > 0) {
        results.skipped_existing++;
        continue;
      }

      const result = await runMerchantMonthlyReward(base44, user, merchant.id, null, null, periodStart, periodEnd);
      if (result.reward_amount > 0) {
        results.created++;
      } else {
        results.skipped_zero++;
      }
    } catch (e) {
      results.errors.push({ merchant_id: merchant.id, error: e.message });
    }
  }

  await base44.asServiceRole.entities.SystemLog.create({
    log_type: 'super_admin_action',
    action: 'Bulk Monthly $DUC Rewards Calculated',
    description: `Processed ${results.processed} merchants, created ${results.created} rewards (${results.skipped_existing} already existed, ${results.skipped_zero} zero volume)`,
    user_email: user?.email || 'automation',
    severity: 'info',
    metadata: results
  });

  return Response.json({ success: true, results });
}

async function runMerchantMonthlyReward(base44, user, merchant_id, processing_volume, override_percentage, periodStart, periodEnd) {
  // Get reward percentage
  const merchantSettings = await base44.asServiceRole.entities.cLINKVaultSettings.filter({ merchant_id });
  const globalSettings = await base44.asServiceRole.entities.cLINKVaultSettings.filter({ merchant_id: null });

  const rewardPercentage = override_percentage ||
    merchantSettings[0]?.reward_percentage ||
    globalSettings[0]?.reward_percentage ||
    0.5;

  // Calculate volume if not provided
  let volume = processing_volume;
  if (!volume) {
    const orders = await base44.asServiceRole.entities.Order.filter({
      merchant_id,
      status: 'completed',
      payment_method: { $in: ['card', 'stripe'] },
      created_date: {
        $gte: periodStart.toISOString(),
        $lt: periodEnd.toISOString()
      }
    });
    volume = orders.reduce((sum, order) => sum + (order.total || 0), 0);
  }

  const rewardAmount = (volume * rewardPercentage) / 100;

  if (rewardAmount <= 0) {
    return {
      success: true,
      message: 'No reward to issue (zero volume)',
      volume,
      reward_amount: 0
    };
  }

  const reward = await base44.asServiceRole.entities.cLINKReward.create({
    merchant_id,
    reward_type: 'processing_volume',
    amount: rewardAmount,
    processing_volume: volume,
    reward_percentage: rewardPercentage,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    status: 'available'
  });

  await base44.asServiceRole.entities.SystemLog.create({
    merchant_id,
    log_type: 'super_admin_action',
    action: 'Monthly $DUC Rewards Calculated',
    description: `Merchant earned ${rewardAmount} $DUC from $${volume} processing volume`,
    user_email: user?.email || 'automation',
    severity: 'info',
    metadata: { volume, reward_amount: rewardAmount, percentage: rewardPercentage }
  });

  return {
    success: true,
    merchant_id,
    processing_volume: volume,
    reward_percentage: rewardPercentage,
    reward_amount: rewardAmount,
    reward_id: reward.id
  };
}