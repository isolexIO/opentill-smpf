import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Calculate monthly $cLINK rewards based on CC processing volume
 * Should be run as a scheduled automation at end of each month
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only function
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { merchant_id, processing_volume, override_percentage } = body;

    if (!merchant_id) {
      return Response.json({
        success: false,
        error: 'Merchant ID required'
      }, { status: 400 });
    }

    // Get reward percentage
    const merchantSettings = await base44.asServiceRole.entities.cLINKVaultSettings.filter({
      merchant_id: merchant_id
    });
    
    const globalSettings = await base44.asServiceRole.entities.cLINKVaultSettings.filter({
      merchant_id: null
    });

    const rewardPercentage = override_percentage || 
                             merchantSettings[0]?.reward_percentage || 
                             globalSettings[0]?.reward_percentage || 
                             0.5;

    // Calculate volume if not provided
    let volume = processing_volume;
    if (!volume) {
      // Get last month's completed orders with card payment
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      lastMonth.setDate(1);
      lastMonth.setHours(0, 0, 0, 0);
      
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const orders = await base44.asServiceRole.entities.Order.filter({
        merchant_id: merchant_id,
        status: 'completed',
        payment_method: { $in: ['card', 'stripe'] },
        created_date: {
          $gte: lastMonth.toISOString(),
          $lt: thisMonth.toISOString()
        }
      });

      volume = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    }

    // Calculate reward
    const rewardAmount = (volume * rewardPercentage) / 100;

    if (rewardAmount <= 0) {
      return Response.json({
        success: true,
        message: 'No reward to issue (zero volume)',
        volume: volume,
        reward: 0
      });
    }

    // Create reward record
    const reward = await base44.asServiceRole.entities.cLINKReward.create({
      merchant_id: merchant_id,
      reward_type: 'processing_volume',
      amount: rewardAmount,
      processing_volume: volume,
      reward_percentage: rewardPercentage,
      period_start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString(),
      period_end: new Date().toISOString(),
      status: 'available'
    });

    // Log the reward
    await base44.asServiceRole.entities.SystemLog.create({
      merchant_id: merchant_id,
      log_type: 'super_admin_action',
      action: 'Monthly $cLINK Rewards Calculated',
      description: `Merchant earned ${rewardAmount} $cLINK from $${volume} processing volume`,
      user_email: user.email,
      severity: 'info',
      metadata: {
        volume: volume,
        reward_amount: rewardAmount,
        percentage: rewardPercentage
      }
    });

    return Response.json({
      success: true,
      merchant_id: merchant_id,
      processing_volume: volume,
      reward_percentage: rewardPercentage,
      reward_amount: rewardAmount,
      reward_id: reward.id
    });

  } catch (error) {
    console.error('Calculate rewards error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});