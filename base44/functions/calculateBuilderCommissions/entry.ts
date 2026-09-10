import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

/**
 * Background Job: Calculate and create BuilderPayout records for all verified
 * builders based on their chips' paid ChipSubscription revenue for the previous
 * month. Run monthly via workflow.
 *
 * Builder revenue is denominated in $DUC (chips are priced in $DUC), so payouts
 * are settled in $DUC via Solana by processBuilderPayouts.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Dual-mode: platform automation (no authenticated user) OR admin manual trigger.
    let user = null;
    try { user = await base44.auth.me(); } catch (e) {}
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Billing period = previous calendar month.
    const now = new Date();
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodStart = new Date(periodEnd);
    periodStart.setMonth(periodStart.getMonth() - 1);

    const results = {
      processed: 0,
      created: 0,
      skipped: 0,
      errors: [],
      total_commission: 0
    };

    const builders = await base44.asServiceRole.entities.Builder.filter({ status: 'verified' });

    for (const builder of builders) {
      try {
        results.processed++;

        // Idempotency: skip if a payout already exists for this builder + period.
        const existing = await base44.asServiceRole.entities.BuilderPayout.filter({
          builder_id: builder.id,
          period_start: periodStart.toISOString()
        });
        if (existing && existing.length > 0) {
          results.skipped++;
          continue;
        }

        // Find chips owned by this builder (requires Chip.builder_id to be set).
        const chips = await base44.asServiceRole.entities.Chip.filter({ builder_id: builder.id });
        let grossRevenue = 0;
        const breakdown = [];

        for (const chip of chips) {
          const subs = await base44.asServiceRole.entities.ChipSubscription.filter({
            chip_id: chip.id,
            status: 'ACTIVE'
          });

          let chipRevenue = 0;
          let paidCount = 0;
          for (const sub of subs) {
            const paidAt = sub.last_payment_at ? new Date(sub.last_payment_at) : null;
            if (paidAt && paidAt >= periodStart && paidAt < periodEnd) {
              chipRevenue += (sub.recurring_price_duc || 0);
              paidCount++;
            }
          }

          if (chipRevenue > 0) {
            const share = chip.revenue_share_percent ?? 70;
            const commission = (chipRevenue * share) / 100;
            grossRevenue += chipRevenue;
            breakdown.push({
              chip_id: chip.id,
              chip_name: chip.name,
              subscriptions: paidCount,
              revenue: chipRevenue,
              revenue_share_percent: share,
              commission
            });
          }
        }

        const commissionAmount = breakdown.reduce((s, b) => s + b.commission, 0);
        if (commissionAmount <= 0) {
          continue;
        }

        // Schedule processing for 7 days after period end (hold period).
        const scheduledAt = new Date(periodEnd);
        scheduledAt.setDate(scheduledAt.getDate() + 7);

        await base44.asServiceRole.entities.BuilderPayout.create({
          builder_id: builder.id,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          gross_revenue: grossRevenue,
          commission_amount: commissionAmount,
          revenue_share_percent: 70,
          platform_share: grossRevenue - commissionAmount,
          payout_method: builder.payout_method || 'solana',
          status: 'pending',
          scheduled_at: scheduledAt.toISOString(),
          breakdown
        });

        await base44.asServiceRole.entities.Builder.update(builder.id, {
          total_earnings: (builder.total_earnings || 0) + commissionAmount
        });

        results.created++;
        results.total_commission += commissionAmount;
      } catch (e) {
        results.errors.push({ builder_id: builder.id, error: e.message });
      }
    }

    await base44.asServiceRole.entities.SystemLog.create({
      log_type: 'super_admin_action',
      action: 'Builder Commission Calculation',
      description: `Processed ${results.processed} builders, created ${results.created} payouts totaling ${results.total_commission} $DUC`,
      user_email: user?.email || 'automation',
      severity: 'info',
      metadata: results
    });

    return Response.json({ success: true, results });
  } catch (error) {
    console.error('calculateBuilderCommissions error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});