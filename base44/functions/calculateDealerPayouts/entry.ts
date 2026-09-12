import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Calculate and create payout records for all dealers
 * Run this monthly (or per configured cadence) via cron
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // SECURITY: require an admin session OR a valid automation secret. Anonymous
    // internet callers are rejected; scheduled workflows pass the secret in args.
    let user = null;
    try { user = await base44.auth.me(); } catch (e) {}
    const isAdmin = user && ['root_admin', 'admin', 'super_admin'].includes(user.role);
    const body = await req.json() || {};
    const { dealer_id, force_period_start, force_period_end, _internal_secret } = body;
    const AUTOMATION_SECRET = Deno.env.get('AUTOMATION_SECRET') || '';
    const isAutomation = _internal_secret === AUTOMATION_SECRET;
    if (!isAdmin && !isAutomation) {
      return Response.json({ error: 'Unauthorized - Platform admin or automation secret required' }, { status: 401 });
    }

    // Get all active dealers (or specific dealer if provided)
    const dealerFilter = dealer_id ? { legacy_dealer_id: dealer_id, status: 'active' } : { status: 'active' };
    const dealers = await base44.asServiceRole.entities.Ambassador.filter(dealerFilter);

    // Track each dealer's base commission and created payout so recruitment
    // override commissions can be attributed to upline ambassadors after the
    // main loop. The override is additive — it never reduces the sub's
    // commission. The override % is configured per-ambassador by super admins
    // (Ambassador.referral_commission_percent).
    const dealerMap = {};
    const commissionByDealer = {};
    const payoutByDealer = {};
    for (const d of dealers) {
      dealerMap[d.legacy_dealer_id || d.id] = d;
      dealerMap[d.id] = d;
    }

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
        commissionByDealer[dealer.legacy_dealer_id || dealer.id] = commissionAmount;

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

        // Track payout for override attribution
        payoutByDealer[dealer.legacy_dealer_id || dealer.id] = payout;

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

    // ── Recruitment override commissions ──
    // Each ambassador with a referral_commission_percent earns that % of the
    // residual commission of ambassadors they recruited. This is ADDITIVE —
    // the sub-ambassador's commission is never reduced. The override % is
    // configured per-ambassador by super admins.
    const overrideByUpline = {};
    for (const sub of dealers) {
      const uplineId = sub.referred_by_ambassador_id;
      if (!uplineId) continue;
      const subKey = sub.legacy_dealer_id || sub.id;
      const subCommission = commissionByDealer[subKey] || 0;
      if (subCommission <= 0) continue;
      const upline = dealerMap[uplineId];
      if (!upline) continue;
      const overridePct = upline.referral_commission_percent || 0;
      if (overridePct <= 0) continue;
      const override = (subCommission * overridePct) / 100;
      const uplineKey = upline.legacy_dealer_id || upline.id;
      if (!overrideByUpline[uplineKey]) {
        overrideByUpline[uplineKey] = { upline, total: 0, subs: [] };
      }
      overrideByUpline[uplineKey].total += override;
      overrideByUpline[uplineKey].subs.push({ name: sub.name, amount: override, pct: overridePct });
      const uplinePayout = payoutByDealer[uplineKey];
      if (uplinePayout) {
        await base44.asServiceRole.entities.DealerPayoutItem.create({
          payout_id: uplinePayout.id,
          merchant_id: subKey,
          merchant_name: `Recruitment override from ${sub.name}`,
          amount: override,
          commission_percent: overridePct,
          billing_period_start: uplinePayout.period_start,
          billing_period_end: uplinePayout.period_end
        });
      }
    }
    let overrideTotal = 0;
    for (const [uplineKey, info] of Object.entries(overrideByUpline)) {
      const uplinePayout = payoutByDealer[uplineKey];
      if (!uplinePayout) continue;
      const newCommission = (uplinePayout.commission_amount || 0) + info.total;
      const update = { commission_amount: newCommission };
      if (uplinePayout.status === 'on_hold') {
        update.carryover_amount = (uplinePayout.carryover_amount || 0) + info.total;
      }
      const subSummary = info.subs.map((s) => `${s.name} (${s.pct}% = $${s.amount.toFixed(2)})`).join(', ');
      update.notes = `${uplinePayout.notes || ''} Includes $${info.total.toFixed(2)} recruitment override commission [${subSummary}].`.trim();
      await base44.asServiceRole.entities.DealerPayout.update(uplinePayout.id, update);
      await base44.asServiceRole.entities.Ambassador.update(info.upline.id, {
        commission_earned: (info.upline.commission_earned || 0) + info.total,
        commission_pending: newCommission
      });
      overrideTotal += info.total;
    }
    results.override_total = overrideTotal;
    results.override_uplines = Object.keys(overrideByUpline).length;

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