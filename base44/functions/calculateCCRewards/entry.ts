import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    // Only process completed orders with card payments
    if (event.type !== 'create' && event.type !== 'update') {
      return Response.json({ success: true, message: 'Skipped - not a relevant event' });
    }

    if (!data || !data.id) {
      return Response.json({ success: true, message: 'Skipped - missing order id in payload' });
    }

    // SECURITY: Do not trust the inbound payload. Fetch the authoritative order
    // record from the database and use its values. This prevents unauthenticated
    // callers from forging event payloads to mint rewards for non-existent or
    // non-qualifying orders.
    const orderResults = await base44.asServiceRole.entities.Order.filter({ id: data.id });
    if (!orderResults || orderResults.length === 0) {
      return Response.json({ success: true, message: 'Skipped - order not found in database' });
    }
    const order = orderResults[0];

    // Use DB-trusted values, not the payload
    if (order.status !== 'completed') {
      return Response.json({ success: true, message: 'Skipped - order not completed' });
    }

    // Check if this is a card payment (card, ebt, or split with card)
    const isCardPayment = order.payment_method === 'card' || 
                          order.payment_method === 'ebt' ||
                          (order.payment_method === 'split' && order.payment_details?.card_amount > 0);

    if (!isCardPayment) {
      return Response.json({ success: true, message: 'Skipped - not a card payment' });
    }

    // Prevent duplicate rewards on ANY event (create or update) — an attacker
    // replaying a create event must not be able to mint a second reward.
    const existingRewards = await base44.asServiceRole.entities.cLINKReward.filter({
      merchant_id: order.merchant_id,
      source_reference: order.id
    });

    if (existingRewards && existingRewards.length > 0) {
      return Response.json({ success: true, message: 'Reward already exists for this order' });
    }

    // Get reward settings
    const globalSettings = await base44.asServiceRole.entities.cLINKVaultSettings.filter({
      merchant_id: null
    });

    const merchantSettings = await base44.asServiceRole.entities.cLINKVaultSettings.filter({
      merchant_id: order.merchant_id
    });

    const settings = merchantSettings[0] || globalSettings[0];
    
    if (!settings || !settings.vault_enabled) {
      return Response.json({ success: true, message: 'Vault not enabled for merchant' });
    }

    // Calculate reward amount based on card processing volume
    // Default: 0.1% of card processing volume in $cLINK
    const rewardRate = settings.cc_reward_rate || 0.001; // 0.1%
    
    // Calculate card amount (using DB-trusted order values)
    let cardAmount = 0;
    if (order.payment_method === 'split' && order.payment_details?.card_amount) {
      cardAmount = order.payment_details.card_amount;
    } else if (order.payment_method === 'card' || order.payment_method === 'ebt') {
      cardAmount = order.total || 0;
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

    // Issue $DUC to customer if merchant has loyalty enabled and order has a customer
    if (order.customer_id || order.customer_phone) {
      try {
        await base44.functions.invoke('issueDUCToCustomer', {
          merchant_id: order.merchant_id,
          customer_id: order.customer_id || null,
          customer_phone: order.customer_phone || null,
          order_id: order.id,
          order_total: order.total || 0
        });
      } catch (loyaltyErr) {
        // Non-fatal: log but don't fail the reward creation
        console.error('Customer $DUC loyalty error:', loyaltyErr.message);
      }
    }

    // Create reward record
    await base44.asServiceRole.entities.cLINKReward.create({
      merchant_id: order.merchant_id,
      amount: rewardAmount,
      reward_type: 'cc_processing',
      status: 'available',
      source_reference: order.id,
      description: `CC processing reward for order ${order.order_number || order.id}`,
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
        card_amount: cardAmount,
        reward_rate: rewardRate
      }
    });

    // Log the reward creation
    await base44.asServiceRole.entities.SystemLog.create({
      merchant_id: order.merchant_id,
      log_type: 'merchant_action',
      action: '$cLINK Reward Earned',
      description: `Earned ${rewardAmount.toFixed(4)} $cLINK from CC processing`,
      severity: 'info',
      metadata: {
        order_id: order.id,
        card_amount: cardAmount,
        reward_amount: rewardAmount
      }
    });

    return Response.json({
      success: true,
      reward_amount: rewardAmount,
      card_amount: cardAmount,
      order_id: order.id
    });

  } catch (error) {
    console.error('CC Rewards calculation error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});