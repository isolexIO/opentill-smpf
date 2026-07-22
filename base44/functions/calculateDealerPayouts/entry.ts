import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Calculate and create payout records for all dealers
 * Run this monthly (or per configured cadence) via cron
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Dual-mode: allow platform automation (no authenticated user) OR root admin manual trigger.
    let user = null;
    try { user = await base44.auth.me(); } catch (e) {}
    if (user && !['root_admin', 'admin', 'super_admin'].includes(user.role)) {
      return Response.json({ error: 'Unauthorized - Platform admin only' }, { status: 403 });
    }

    const { dealer_id, force_period_start, force_period_end } = await req.json() || {};

    // Get all active dealers (or specific dealer if provided)
    const dealerFilter = dealer_id ? { legacy_dealer_id: dealer_id, status: 'active' } : { status: 'active' };
    const dealers = await base44.asServiceRole.entities.Ambassador.filter(dealerFilter);

    const results = {
      processed: 0,
      created: 0,
      skipped: 0,
      errors: [],
      payouts: []
    };

    for (const dealer of dealers) {
      try {
        // Determine payout period based on cadence
        let periodStart, periodEnd;
        
        if (force_period_start && force_period_end) {
          periodStart = new Date(force_period_start);
          periodEnd = new Date(force_period_end);
        } else {
          const now = new Date();
          
          switch (dealer.payout_cadence) {
            case 'weekly':
              periodEnd = new Date(now);
              periodEnd.setDate(periodEnd.getDate() - periodEnd.getDay()); // Last Sunday
              periodStart = new Date(periodEnd);
              periodStart.setDate(periodStart.getDate() - 7);
              break;
            
            case 'biweekly':
              periodEnd = new Date(now);
              periodEnd.setDate(periodEnd.getDate() - periodEnd.getDay());
              periodStart = new Date(periodEnd);
              periodStart.setDate(periodStart.getDate() - 14);
              break;
            
            case 'monthly':
            default:
              periodEnd = new Date(now.getFullYear(), now.getMonth(), 1);
              periodStart = new Date(periodEnd);
              periodStart.setMonth(periodStart.getMonth() - 1);
              break;
          }
        }

        // Check if payout already exists for this period
        const existingPayouts = await base44.asServiceRole.entities.DealerPayout.filter({
          dealer_id: dealer.legacy_dealer_id || dealer.id,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString()
        });

        if (existingPayouts && existingPayouts.length > 0) {
          results.skipped++;
          continue;
        }

        // Get all merchant subscriptions for this dealer in the period
        const merchants = await base44.asServiceRole.entities.Merchant.filter({
          dealer_id: dealer.legacy_dealer_id || dealer.id
        });

        let grossAmount = 0;
        const payoutItems = [];

        for (const merchant of merchants) {
          // Get active subscription
          const subscriptions = await base44.asServiceRole.entities.Subscription.filter({
            merchant_id: merchant.id,
            status: 'active'
          });

          if (subscriptions && subscriptions.length > 0) {
            const subscription = subscriptions[0];
            const subscriptionAmount = subscription.price || 0;
            
            // Calculate commission for this merchant
            const commissionAmount = (subscriptionAmount * dealer.commission_percent) / 100;
            
            grossAmount += subscriptionAmount;
            
            payoutItems.push({
              merchant_id: merchant.id,
              merchant_name: merchant.business_name,
              subscription_id: subscription.id,
              amount: commissionAmount,
              commission_percent: dealer.commission_percent,
              billing_period_start: periodStart.toISOString(),
              billing_period_end: periodEnd.toISOString()
            });
          }
        }

        // Calculate base commission
        const commissionAmount = (grossAmount * dealer.commission_percent) / 100;

        // Calculate ambassador bonuses (ambassadors pay no platform fees)
        const activeMerchantCount = payoutItems.length;
        let bonusAmount = activeMerchantCount * (dealer.bonus_per_active_merchant || 0);
        const milestoneThreshold = dealer.milestone_bonus_threshold || 0;
        if (milestoneThreshold > 0 && activeMerchantCount >= milestoneThreshold) {
          bonusAmount += dealer.milestone_bonus_amount || 0;
        }

        const rootShare = grossAmount - commissionAmount;

        // Get carryover from previous period if any
        const previousPayouts = await base44.asServiceRole.entities.DealerPayout.filter({
          dealer_id: dealer.legacy_dealer_id || dealer.id,
          status: 'on_hold'
        });

        const carryover = previousPayouts.reduce((sum, p) => sum + (p.carryover_amount || 0), 0);
        const totalCommission = commissionAmount + bonusAmount + carryover;

        // Check minimum payout threshold
        let status = 'pending';
        let scheduledAt = null;
        let notes = '';

        if (totalCommission < dealer.payout_minimum) {
          status = 'on_hold';
          notes = `Below minimum payout threshold of $${dealer.payout_minimum}. Amount will carry over to next period.`;
        } else {
          // Calculate scheduled date (period_end + hold_days). Created as
          // 'pending' so the daily schedulePayouts job picks it up when due
          // and triggers processing — 'scheduled' is set by that job.
          scheduledAt = new Date(periodEnd);
          scheduledAt.setDate(scheduledAt.getDate() + (dealer.payout_hold_days || 7));
          status = 'pending';
        }

        // Create payout record
        const payout = await base44.asServiceRole.entities.DealerPayout.create({
          dealer_id: dealer.legacy_dealer_id || dealer.id,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          gross_amount: grossAmount,
          commission_amount: totalCommission,
          root_share: rootShare,
          fees: 0,
          payout_method: dealer.payout_method,
          status: status,
          scheduled_at: scheduledAt ? scheduledAt.toISOString() : null,
          carryover_amount: status === 'on_hold' ? totalCommission : 0,
          bonus_amount: bonusAmount,
          notes: bonusAmount > 0 ? `${notes ? notes + ' ' : ''}Includes $${bonusAmount.toFixed(2)} ambassador bonus.` : notes
        });

        // Mark carried-over on_hold payouts as canceled so their amounts
        // aren't double-counted in future cycles.
        for (const prev of previousPayouts) {
          if ((prev.carryover_amount || 0) > 0) {
            try {
              await base44.asServiceRole.entities.DealerPayout.update(prev.id, {
                status: 'canceled',
                notes: `${prev.notes || ''}\nCarried over $${prev.carryover_amount} to payout ${payout.id}.`.trim()
              });
            } catch (e) {
              console.warn(`Failed to cancel carried-over payout ${prev.id}:`, e);
            }
          }
        }

        // Create payout items
        for (const item of payoutItems) {
          await base44.asServiceRole.entities.DealerPayoutItem.create({
            payout_id: payout.id,
            ...item
          });
        }

        // Update dealer pending commission
        await base44.asServiceRole.entities.Ambassador.update(dealer.id, {
          commission_pending: totalCommission,
          next_payout_date: scheduledAt ? scheduledAt.toISOString() : null
        });

        // Send scheduled payout notification if a payout date is set
        if (scheduledAt) {
          try {
            await base44.asServiceRole.functions.invoke('sendPayoutNotification', {
              ambassador_id: dealer.id,
              type: 'scheduled',
              amount: totalCommission,
              merchant_names: payoutItems.map(item => item.merchant_name),
              details: { scheduled_at: scheduledAt.toISOString() }
            });
          } catch (notifyError) {
            console.error('Notification sending failed:', notifyError);
          }
        }

        results.created++;
        results.payouts.push({
          dealer_id: dealer.legacy_dealer_id || dealer.id,
          dealer_name: dealer.name,
          payout_id: payout.id,
          amount: totalCommission,
          status: status
        });

      } catch (error) {
        console.error(`Error processing dealer ${dealer.id}:`, error);
        results.errors.push({
          dealer_id: dealer.legacy_dealer_id || dealer.id,
          dealer_name: dealer.name,
          error: error.message
        });
      }

      results.processed++;
    }

    // Log the calculation
    await base44.asServiceRole.entities.SystemLog.create({
      log_type: 'super_admin_action',
      action: 'Dealer Payout Calculation',
      description: `Calculated payouts for ${results.processed} dealers, created ${results.created} payout records`,
      user_email: user?.email || 'automation',
      user_role: 'root_admin',
      severity: 'info',
      metadata: results
    });

    return Response.json({
      success: true,
      message: 'Payout calculation completed',
      results
    });

  } catch (error) {
    console.error('Error calculating payouts:', error);
    return Response.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});