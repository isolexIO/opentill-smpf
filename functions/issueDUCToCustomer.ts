import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Issues $DUC loyalty rewards to a customer, funded from the merchant's vault.
 * Called after order completion if merchant has duc_rewards_enabled.
 *
 * Payload:
 *   merchant_id   - the merchant's ID
 *   customer_id   - the customer's ID (optional, if phone provided)
 *   customer_phone - fallback lookup if no customer_id
 *   order_id      - the completed order ID
 *   order_total   - the order total in USD
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { merchant_id, customer_id, customer_phone, order_id, order_total } = await req.json();

    if (!merchant_id || !order_id || !order_total) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Load merchant settings
    const merchants = await base44.asServiceRole.entities.Merchant.filter({ id: merchant_id });
    if (!merchants || merchants.length === 0) {
      return Response.json({ success: false, error: 'Merchant not found' }, { status: 404 });
    }
    const merchant = merchants[0];
    const loyaltySettings = merchant.settings?.loyalty_program || {};

    if (!loyaltySettings.duc_rewards_enabled) {
      return Response.json({ success: true, message: '$DUC rewards not enabled for this merchant' });
    }

    const ducPerDollar = loyaltySettings.duc_per_dollar || 0.01;
    const ducAmount = order_total * ducPerDollar;

    if (ducAmount <= 0) {
      return Response.json({ success: true, message: 'No $DUC to issue' });
    }

    // Check merchant vault balance (available cLINKReward records)
    const vaultRewards = await base44.asServiceRole.entities.cLINKReward.filter({
      merchant_id: merchant_id,
      status: 'available'
    });
    const vaultBalance = vaultRewards.reduce((sum, r) => sum + (r.amount || 0), 0);

    if (vaultBalance < ducAmount) {
      // Log insufficient vault - auto-disable to prevent repeated failures
      await base44.asServiceRole.entities.SystemLog.create({
        merchant_id,
        log_type: 'merchant_action',
        action: '$DUC Loyalty Skipped',
        description: `Vault insufficient (${vaultBalance.toFixed(4)} available, ${ducAmount.toFixed(4)} needed). Customer reward skipped.`,
        severity: 'warning',
        metadata: { order_id, duc_amount: ducAmount, vault_balance: vaultBalance }
      });
      return Response.json({ success: false, error: 'Merchant vault insufficient for customer reward' });
    }

    // Find the customer
    let customer = null;
    if (customer_id) {
      const customers = await base44.asServiceRole.entities.Customer.filter({ id: customer_id, merchant_id });
      if (customers.length > 0) customer = customers[0];
    }
    if (!customer && customer_phone) {
      const customers = await base44.asServiceRole.entities.Customer.filter({ phone: customer_phone, merchant_id });
      if (customers.length > 0) customer = customers[0];
    }

    if (!customer) {
      return Response.json({ success: false, error: 'Customer not found' });
    }

    // Deduct from merchant vault (oldest available rewards first)
    let remaining = ducAmount;
    const sortedRewards = vaultRewards.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

    for (const reward of sortedRewards) {
      if (remaining <= 0) break;
      if (reward.amount <= remaining) {
        // Consume entire reward record
        await base44.asServiceRole.entities.cLINKReward.update(reward.id, {
          status: 'claimed',
          claimed_at: new Date().toISOString(),
          claimed_by: `customer:${customer.id}`,
          transaction_signature: `loyalty_${order_id}_${Date.now()}`
        });
        remaining -= reward.amount;
      } else {
        // Partially consume - split isn't supported so we just mark and note remainder
        // We update the amount to reflect what's left
        await base44.asServiceRole.entities.cLINKReward.update(reward.id, {
          amount: reward.amount - remaining
        });
        remaining = 0;
      }
    }

    // Credit customer
    const newBalance = (customer.duc_balance || 0) + ducAmount;
    const newLifetime = (customer.duc_lifetime_earned || 0) + ducAmount;
    await base44.asServiceRole.entities.Customer.update(customer.id, {
      duc_balance: Math.round(newBalance * 1e6) / 1e6,
      duc_lifetime_earned: Math.round(newLifetime * 1e6) / 1e6
    });

    // Log
    await base44.asServiceRole.entities.SystemLog.create({
      merchant_id,
      log_type: 'merchant_action',
      action: '$DUC Customer Loyalty Issued',
      description: `Issued ${ducAmount.toFixed(4)} $DUC to customer ${customer.name} (order ${order_id})`,
      severity: 'info',
      metadata: { order_id, customer_id: customer.id, duc_amount: ducAmount, order_total }
    });

    return Response.json({
      success: true,
      duc_issued: ducAmount,
      customer_id: customer.id,
      new_duc_balance: newBalance
    });

  } catch (error) {
    console.error('issueDUCToCustomer error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});