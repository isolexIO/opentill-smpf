import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import Stripe from 'npm:stripe@14.14.0';

/**
 * Reconcile SurchargeSettlement records against actual Stripe processor fees.
 * Dual-mode (matches existing scheduled-function convention):
 *   - Bulk path (automation): no authenticated user — reconciles the recent window.
 *   - Admin manual trigger: pass { since?, until?, limit? }.
 * For each settlement in the window, pulls the real processor fee from the
 * Stripe balance transaction and back-fills actual_fee_cents / variance / flags.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let user = null;
    try { user = await base44.auth.me(); } catch (e) {}
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({})) || {};
    const since = body.since ? new Date(body.since) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const until = body.until ? new Date(body.until) : new Date();
    const limit = Math.min(Number(body.limit) || 250, 500);

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return Response.json({ error: 'STRIPE_SECRET_KEY not configured' }, { status: 500 });
    }
    const stripe = new Stripe(stripeSecretKey);

    // Load settlements in the window. Fallback to a recent list if filter is unsupported.
    let inWindow = [];
    try {
      inWindow = await base44.asServiceRole.entities.SurchargeSettlement.filter({
        settlement_date: { $gte: since.toISOString(), $lte: until.toISOString() },
      }, '-settlement_date', limit);
    } catch (e) {
      const recent = await base44.asServiceRole.entities.SurchargeSettlement.list('-settlement_date', limit);
      inWindow = (recent || []).filter(s => {
        const d = s.settlement_date ? new Date(s.settlement_date) : null;
        return d && d >= since && d <= until;
      });
    }

    let reconciled = 0, skipped = 0, flagged = 0, errors = 0;
    for (const s of (inWindow || [])) {
      try {
        const order = await base44.asServiceRole.entities.Order.get(s.order_id);
        const piId = order?.payment_details?.stripe_payment_intent_id;
        if (!piId) {
          await base44.asServiceRole.entities.SurchargeSettlement.update(s.id, {
            variance_type: 'missing_settlement', flagged: true,
          });
          flagged++; skipped++; continue;
        }

        const pi = await stripe.paymentIntents.retrieve(piId, {
          expand: ['latest_charge.balance_transaction'],
        });
        const bt = pi?.latest_charge?.balance_transaction;
        if (!bt || typeof bt === 'string') {
          skipped++; continue; // not settled yet
        }

        const actualFeeCents = Number(bt.fee || 0);
        const calculatedFeeCents = Number(s.calculated_fee_cents || 0);
        const customerAdjustment = Number(s.customer_adjustment_cents || 0);
        const variance = actualFeeCents - calculatedFeeCents;

        let varianceType = 'none';
        if (Math.abs(variance) <= 1) varianceType = 'rounding_variance';
        else if (variance > 0) varianceType = 'undercollection'; // processor charged more than estimated
        else varianceType = 'overcollection';

        const merchantAbsorbed = Math.max(0, actualFeeCents - customerAdjustment);
        const isFlagged = Math.abs(variance) > 5; // > $0.05 variance

        await base44.asServiceRole.entities.SurchargeSettlement.update(s.id, {
          actual_fee_cents: actualFeeCents,
          variance_cents: variance,
          variance_type: varianceType,
          merchant_absorbed_cents: merchantAbsorbed,
          recoverable_fee_cents: customerAdjustment,
          flagged: isFlagged,
        });
        reconciled++;
        if (isFlagged) flagged++;
      } catch (e) {
        errors++;
      }
    }

    await base44.asServiceRole.entities.SystemLog.create({
      log_type: 'super_admin_action',
      action: 'Surcharge Settlement Reconciliation',
      description: `Reconciled ${reconciled} settlements (${flagged} flagged, ${skipped} skipped, ${errors} errors) in window ${since.toISOString()} → ${until.toISOString()}`,
      user_email: user?.email || 'automation',
      severity: 'info',
      metadata: { reconciled, flagged, skipped, errors, considered: (inWindow || []).length },
    });

    return Response.json({
      status: 'ok',
      window: { since: since.toISOString(), until: until.toISOString() },
      considered: (inWindow || []).length,
      reconciled, skipped, flagged, errors,
    });
  } catch (error) {
    console.error('reconcileSurchargeSettlements error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});