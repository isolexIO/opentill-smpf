import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Preview upcoming payout for a dealer
 * Shows commission calculation without creating actual payout
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dealer_id, period_start, period_end } = await req.json();

    // Verify access
    if (user.role !== 'root_admin' && user.role !== 'dealer_admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (user.role === 'dealer_admin' && user.dealer_id !== dealer_id) {
      return Response.json({ error: 'Unauthorized - can only preview own payouts' }, { status: 403 });
    }

    // Load dealer
    const dealers = await base44.asServiceRole.entities.Dealer.filter({ id: dealer_id });
    if (!dealers || dealers.length === 0) {
      return Response.json({ error: 'Dealer not found' }, { status: 404 });
    }

    const dealer = dealers[0];

    // Calculate period dates if not provided
    let startDate, endDate;
    if (period_start && period_end) {
      startDate = new Date(period_start);
      endDate = new Date(period_end);
    } else {
      // Default to last month
      const now = new Date();
      endDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate = new Date(endDate);
      startDate.setMonth(startDate.getMonth() - 1);
    }

    // Get all subscriptions for this dealer's merchants in the period
    const merchants = await base44.asServiceRole.entities.Merchant.filter({ dealer_id });
    
    let grossAmount = 0;
    const lineItems = [];

    for (const merchant of merchants) {
      // Get subscriptions for this merchant in the period
      const subscriptions = await base44.asServiceRole.entities.Subscription.filter({
        merchant_id: merchant.id,
        status: { $in: ['active', 'past_due'] }
      });

      for (const sub of subscriptions) {
        // Check if subscription was active during period
        const subStart = new Date(sub.current_period_start);
        const subEnd = new Date(sub.current_period_end);

        if (subStart <= endDate && subEnd >= startDate) {
          const amount = sub.price || 0;
          grossAmount += amount;

          lineItems.push({
            merchant_id: merchant.id,
            merchant_name: merchant.business_name,
            subscription_id: sub.id,
            amount,
            billing_period_start: sub.current_period_start,
            billing_period_end: sub.current_period_end
          });
        }
      }
    }

    // Calculate commission
    const commissionPercent = dealer.commission_percent || 0;
    const commissionAmount = grossAmount * (commissionPercent / 100);
    const rootShare = grossAmount - commissionAmount;

    // Estimate fees (Stripe Connect fees are typically 0.25% for transfers)
    const estimatedFees = dealer.payout_method === 'stripe_connect' ? commissionAmount * 0.0025 : 0;
    const netPayout = commissionAmount - estimatedFees;

    // Check minimum and hold period
    const minimumPayout = dealer.payout_minimum || 20.0;
    const holdDays = dealer.payout_hold_days || 7;
    const scheduledDate = new Date(endDate);
    scheduledDate.setDate(scheduledDate.getDate() + holdDays);

    return Response.json({
      success: true,
      preview: {
        dealer_id,
        dealer_name: dealer.name,
        period_start: startDate.toISOString(),
        period_end: endDate.toISOString(),
        gross_amount: grossAmount,
        commission_percent: commissionPercent,
        commission_amount: commissionAmount,
        root_share: rootShare,
        estimated_fees: estimatedFees,
        net_payout: netPayout,
        payout_method: dealer.payout_method,
        minimum_payout: minimumPayout,
        meets_minimum: commissionAmount >= minimumPayout,
        scheduled_for: scheduledDate.toISOString(),
        line_items: lineItems,
        merchant_count: merchants.length,
        subscription_count: lineItems.length
      }
    });

  } catch (error) {
    console.error('Preview payout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});