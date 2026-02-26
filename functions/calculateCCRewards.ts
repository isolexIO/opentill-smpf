import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data, old_data } = body;

    // Only process completed orders with card payments
    if (event.type !== 'create' && event.type !== 'update') {
      return Response.json({ success: true, message: 'Skipped - not a relevant event' });
    }

    if (!data || data.status !== 'completed') {
      return Response.json({ success: true, message: 'Skipped - order not completed' });
    }

    // Check if this is a card payment (card, ebt, or split with card)
    const isCardPayment = data.payment_method === 'card' || 
                          data.payment_method === 'ebt' ||
                          (data.payment_method === 'split' && data.payment_details?.card_amount > 0);

    if (!isCardPayment) {
      return Response.json({ success: true, message: 'Skipped - not a card payment' });
    }

    // Prevent duplicate rewards on order updates
    if (event.type === 'update') {
      // Check if reward already exists for this order
      const existingRewards = await base44.asServiceRole.entities.cLINKReward.filter({
        merchant_id: data.merchant_id,
        source_reference: data.id
      });

      if (existingRewards && existingRewards.length > 0) {
        return Response.json({ success: true, message: 'Reward already exists for this order' });
      }
    }

    // Get reward settings
    const globalSettings = await base44.asServiceRole.entities.cLINKVaultSettings.filter({
      merchant_id: null
    });

    const merchantSettings = await base44.asServiceRole.entities.cLINKVaultSettings.filter({
      merchant_id: data.merchant_id
    });

    const settings = merchantSettings[0] || globalSettings[0];
    
    if (!settings || !settings.vault_enabled) {
      return Response.json({ success: true, message: 'Vault not enabled for merchant' });
    }

    // Calculate reward amount based on card processing volume
    // Default: 0.1% of card processing volume in $cLINK
    const rewardRate = settings.cc_reward_rate || 0.001; // 0.1%
    
    // Calculate card amount
    let cardAmount = 0;
    if (data.payment_method === 'split' && data.payment_details?.card_amount) {
      cardAmount = data.payment_details.card_amount;
    } else if (data.payment_method === 'card' || data.payment_method === 'ebt') {
      cardAmount = data.total || 0;
    }

    const rewardAmount = cardAmount * rewardRate;

    // Only create reward if amount is above minimum threshold
    const minReward = settings.min_reward_amount || 0.01;
    if (rewardAmount < minReward) {
      return Response.json({ 
        success: true, 
        message: `Reward amount ${rewardAmount} below minimum ${minReward}` 
      });
    }

    // Create reward record
    await base44.asServiceRole.entities.cLINKReward.create({
      merchant_id: data.merchant_id,
      amount: rewardAmount,
      reward_type: 'cc_processing',
      status: 'available',
      source_reference: data.id,
      description: `CC processing reward for order ${data.order_number || data.id}`,
      metadata: {
        order_id: data.id,
        order_number: data.order_number,
        card_amount: cardAmount,
        reward_rate: rewardRate
      }
    });

    // Log the reward creation
    await base44.asServiceRole.entities.SystemLog.create({
      merchant_id: data.merchant_id,
      log_type: 'merchant_action',
      action: '$cLINK Reward Earned',
      description: `Earned ${rewardAmount.toFixed(4)} $cLINK from CC processing`,
      severity: 'info',
      metadata: {
        order_id: data.id,
        card_amount: cardAmount,
        reward_amount: rewardAmount
      }
    });

    return Response.json({
      success: true,
      reward_amount: rewardAmount,
      card_amount: cardAmount,
      order_id: data.id
    });

  } catch (error) {
    console.error('CC Rewards calculation error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});