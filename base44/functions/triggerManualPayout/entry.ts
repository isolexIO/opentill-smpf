import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Manually trigger a payout (bypasses scheduling)
 * For root admin or dealer admin emergency payouts
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { payout_id, bypass_minimum } = await req.json();

    // Load payout
    const payout = await base44.asServiceRole.entities.DealerPayout.get(payout_id);
    if (!payout) {
      return Response.json({ error: 'Payout not found' }, { status: 404 });
    }

    // Verify access
    if (user.role !== 'root_admin' && user.role !== 'dealer_admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (user.role === 'dealer_admin' && user.dealer_id !== payout.dealer_id) {
      return Response.json({ error: 'Unauthorized - can only trigger own payouts' }, { status: 403 });
    }

    // Check status
    if (!['pending', 'on_hold', 'failed'].includes(payout.status)) {
      return Response.json({ 
        error: `Cannot manually trigger payout with status: ${payout.status}` 
      }, { status: 400 });
    }

    // Load dealer
    const dealers = await base44.asServiceRole.entities.Dealer.filter({ id: payout.dealer_id });
    if (!dealers || dealers.length === 0) {
      return Response.json({ error: 'Dealer not found' }, { status: 404 });
    }

    const dealer = dealers[0];

    // Check minimum unless bypassed (root admin only)
    if (!bypass_minimum || user.role !== 'root_admin') {
      const minimumPayout = dealer.payout_minimum || 20.0;
      if (payout.commission_amount < minimumPayout) {
        return Response.json({
          error: `Payout amount ($${payout.commission_amount}) is below minimum ($${minimumPayout})`,
          can_bypass: user.role === 'root_admin'
        }, { status: 400 });
      }
    }

    // Update to scheduled and trigger
    await base44.asServiceRole.entities.DealerPayout.update(payout_id, {
      status: 'scheduled',
      scheduled_at: new Date().toISOString(),
      notes: `${payout.notes || ''}\nManually triggered by ${user.email} at ${new Date().toISOString()}`
    });

    // Process payout
    const result = await base44.functions.invoke('processDealerPayout', { payout_id });

    // Create audit log
    await base44.functions.invoke('createAuditLog', {
      merchant_id: null,
      action_type: 'manual_payment',
      severity: 'info',
      actor_id: user.id,
      actor_email: user.email,
      actor_role: user.role,
      target_entity: payout_id,
      description: `Manual payout triggered for dealer ${dealer.name}`,
      metadata: {
        payout_id,
        dealer_id: dealer.id,
        amount: payout.commission_amount,
        bypass_minimum
      }
    });

    return Response.json({
      success: true,
      payout_id,
      result: result.data
    });

  } catch (error) {
    console.error('Manual payout trigger error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});