import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Background Job: Calculate and create dealer commission records
 * This should be run monthly (e.g., via cron job)
 * 
 * Calculates commissions for all active dealers based on their merchant subscriptions
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verify root admin access
    const user = await base44.auth.me();
    if (!user || user.role !== 'root_admin') {
      return Response.json({ error: 'Unauthorized - Root admin only' }, { status: 403 });
    }

    // Get all active dealers
    const dealers = await base44.asServiceRole.entities.Dealer.filter({ status: 'active' });
    
    // Calculate billing period (last month)
    const now = new Date();
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodStart = new Date(periodEnd);
    periodStart.setMonth(periodStart.getMonth() - 1);

    const results = {
      processed: 0,
      created: 0,
      errors: [],
      total_commission_amount: 0
    };

    for (const dealer of dealers) {
      try {
        // Get all active merchants for this dealer
        const merchants = await base44.asServiceRole.entities.Merchant.filter({
          dealer_id: dealer.id,
          status: 'active'
        });

        for (const merchant of merchants) {
          // Get active subscription for this merchant
          const subscriptions = await base44.asServiceRole.entities.Subscription.filter({
            merchant_id: merchant.id,
            status: 'active'
          });

          if (subscriptions && subscriptions.length > 0) {
            const subscription = subscriptions[0];
            
            // Check if commission already exists for this period
            const existingCommissions = await base44.asServiceRole.entities.DealerCommission.filter({
              dealer_id: dealer.id,
              merchant_id: merchant.id,
              billing_period_start: periodStart.toISOString()
            });

            if (existingCommissions && existingCommissions.length > 0) {
              console.log(`Commission already exists for dealer ${dealer.id}, merchant ${merchant.id}`);
              continue;
            }

            // Calculate commission
            const commissionAmount = (subscription.price * dealer.commission_percent) / 100;

            // Create commission record
            await base44.asServiceRole.entities.DealerCommission.create({
              dealer_id: dealer.id,
              merchant_id: merchant.id,
              merchant_name: merchant.business_name,
              billing_period_start: periodStart.toISOString(),
              billing_period_end: periodEnd.toISOString(),
              merchant_subscription_amount: subscription.price,
              commission_percent: dealer.commission_percent,
              commission_amount: commissionAmount,
              status: 'pending'
            });

            // Update dealer commission_earned
            await base44.asServiceRole.entities.Dealer.update(dealer.id, {
              commission_earned: (dealer.commission_earned || 0) + commissionAmount
            });

            results.created++;
            results.total_commission_amount += commissionAmount;
          }
        }

        results.processed++;
      } catch (error) {
        console.error(`Error processing dealer ${dealer.id}:`, error);
        results.errors.push({
          dealer_id: dealer.id,
          dealer_name: dealer.name,
          error: error.message
        });
      }
    }

    // Log the job execution
    await base44.asServiceRole.entities.SystemLog.create({
      log_type: 'super_admin_action',
      action: 'Dealer Commission Calculation',
      description: `Calculated commissions for ${results.processed} dealers, created ${results.created} commission records totaling $${results.total_commission_amount.toFixed(2)}`,
      severity: 'info',
      user_email: user.email,
      metadata: results
    });

    return Response.json({
      success: true,
      message: 'Commission calculation completed',
      results
    });

  } catch (error) {
    console.error('Error calculating commissions:', error);
    return Response.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});