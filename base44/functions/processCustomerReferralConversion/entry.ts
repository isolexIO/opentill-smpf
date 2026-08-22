import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// A customer earns this flat $DUC bonus when a merchant they referred signs up
// for openTILL Payments and processes $100 in card/openTILL volume.
const CUSTOMER_REFERRAL_REWARD_DUC = 50;
const PROCESSING_THRESHOLD_USD = 100;
// Payment methods that count as "openTILL Payments" processing volume.
const PROCESSING_METHODS = ['card', 'opentill'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let body = {};
    try { body = await req.json(); } catch { body = {}; }

    // Support both entity-automation payloads and direct calls.
    let merchant_id;
    if (body.event && body.data) {
      const { event, data } = body;
      if ((event.type !== 'create' && event.type !== 'update') || !data) {
        return Response.json({ success: true, message: 'Skipped - not relevant' });
      }
      merchant_id = data.merchant_id;
    } else {
      merchant_id = body.merchant_id;
    }

    if (!merchant_id) {
      return Response.json({ success: true, message: 'No merchant_id' });
    }

    // Find pending customer referrals for this merchant.
    const links = await base44.asServiceRole.entities.CustomerMerchantLink.filter({
      merchant_id,
      link_type: 'referred',
      referral_status: 'pending',
    });
    if (!links || links.length === 0) {
      return Response.json({ success: true, message: 'No pending customer referrals' });
    }

    // Compute the merchant's openTILL Payments processing volume from completed orders.
    const orders = await base44.asServiceRole.entities.Order.filter(
      { merchant_id, status: 'completed' },
      '-created_date',
      1000
    );
    const processed = (orders || [])
      .filter((o) => PROCESSING_METHODS.includes(o.payment_method))
      .reduce((sum, o) => sum + (o.total || 0), 0);

    if (processed < PROCESSING_THRESHOLD_USD) {
      return Response.json({
        success: true,
        message: `Processed $${processed.toFixed(2)} < $${PROCESSING_THRESHOLD_USD}`,
      });
    }

    let converted = 0;
    for (const link of links) {
      // Idempotency: mark converted before crediting so a replay can't double-issue.
      await base44.asServiceRole.entities.CustomerMerchantLink.update(link.id, {
        referral_status: 'converted',
        converted_at: new Date().toISOString(),
        reward_amount_duc: CUSTOMER_REFERRAL_REWARD_DUC,
      });

      const customers = await base44.asServiceRole.entities.Customer.filter({ id: link.customer_id });
      const customer = customers && customers[0];
      if (customer) {
        await base44.asServiceRole.entities.Customer.update(customer.id, {
          duc_balance: Math.round(((customer.duc_balance || 0) + CUSTOMER_REFERRAL_REWARD_DUC) * 1e6) / 1e6,
          duc_lifetime_earned: Math.round(((customer.duc_lifetime_earned || 0) + CUSTOMER_REFERRAL_REWARD_DUC) * 1e6) / 1e6,
          ref_conversions: (customer.ref_conversions || 0) + 1,
          ref_duc_earned: Math.round(((customer.ref_duc_earned || 0) + CUSTOMER_REFERRAL_REWARD_DUC) * 1e6) / 1e6,
        });
      }

      await base44.asServiceRole.entities.SystemLog.create({
        merchant_id,
        log_type: 'merchant_action',
        action: 'Customer Referral Converted',
        description: `Customer ${link.customer_id} earned ${CUSTOMER_REFERRAL_REWARD_DUC} $DUC — referred merchant processed $${processed.toFixed(2)}.`,
        severity: 'info',
        metadata: {
          customer_id: link.customer_id,
          merchant_id,
          reward_duc: CUSTOMER_REFERRAL_REWARD_DUC,
          processed_usd: processed,
        },
      });
      converted++;
    }

    return Response.json({
      success: true,
      converted,
      reward_each: CUSTOMER_REFERRAL_REWARD_DUC,
      processed_usd: processed,
    });
  } catch (error) {
    console.error('processCustomerReferralConversion error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});