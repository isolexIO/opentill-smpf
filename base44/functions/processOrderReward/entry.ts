import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Shared automation secret. Scheduled/entity workflows pass this in args; the
// same constant is defined in every admin-only automation function so anonymous
// internet callers (who do not know it) are rejected.
const AUTOMATION_SECRET = 'ot_automation_4f8a7c2e9b1d';

/**
 * Awards a $DUC processing-volume reward for a single completed card order.
 * Replaces the migrated calculateCCRewards for the entity-triggered workflow so
 * the caller can be authenticated via the automation secret (the legacy
 * compatibility layer did not forward workflow args, so a secret could not be
 * validated there). The order is always re-fetched from the database — the
 * caller-supplied order_id is only a pointer, never trusted for values.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({})) || {};

    // SECURITY: require an admin session OR a valid automation secret. The
    // entity-triggered workflow passes the secret in args; anonymous internet
    // callers are rejected.
    let user = null;
    try { user = await base44.auth.me(); } catch (e) {}
    const isAdmin = user && ['admin', 'super_admin', 'root_admin'].includes(user.role);
    const isAutomation = body._internal_secret === AUTOMATION_SECRET;
    if (!isAdmin && !isAutomation) {
      return Response.json({ error: 'Unauthorized: admin session or automation secret required' }, { status: 401 });
    }

    const { order_id } = body;
    if (!order_id) {
      return Response.json({ success: true, message: 'Skipped - no order_id provided' });
    }

    // Fetch the authoritative order record from the database (never trust the
    // caller payload).
    const orderResults = await base44.asServiceRole.entities.Order.filter({ id: order_id });
    if (!orderResults || orderResults.length === 0) {
      return Response.json({ success: true, message: 'Skipped - order not found in database' });
    }
    const order = orderResults[0];

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

    // Idempotency: prevent duplicate rewards on replays.
    const existingRewards = await base44.asServiceRole.entities.DUCReward.filter({
      merchant_id: order.merchant_id,
      source_reference: order.id
    });
    if (existingRewards && existingRewards.length > 0) {
      return Response.json({ success: true, message: 'Reward already exists for this order' });
    }

    // Get reward settings
    const globalSettings = await base44.asServiceRole.entities.DUCVaultSettings.filter({ merchant_id: null });
    const merchantSettings = await base44.asServiceRole.entities.DUCVaultSettings.filter({ merchant_id: order.merchant_id });
    const settings = merchantSettings[0] || globalSettings[0];

    if (!settings || !settings.vault_enabled) {
      return Response.json({ success: true, message: 'Vault not enabled for merchant' });
    }

    // Calculate reward amount based on card processing volume (default 0.1%)
    const rewardRate = settings.cc_reward_rate || 0.001;

    let cardAmount = 0;
    if (order.payment_method === 'split' && order.payment_details?.card_amount) {
      cardAmount = order.payment_details.card_amount;
    } else if (order.payment_method === 'card' || order.payment_method === 'ebt') {
      cardAmount = order.total || 0;
    }

    const rewardAmount = cardAmount * rewardRate;

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
        console.error('Customer $DUC loyalty error:', loyaltyErr.message);
      }
    }

    // Create reward record
    await base44.asServiceRole.entities.DUCReward.create({
      merchant_id: order.merchant_id,
      amount: rewardAmount,
      reward_type: 'processing_volume',
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
      action: '$DUC Reward Earned',
      description: `Earned ${rewardAmount.toFixed(4)} $DUC from CC processing`,
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
    console.error('processOrderReward error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});