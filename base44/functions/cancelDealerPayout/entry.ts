import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Cancel a scheduled or pending payout
 * Root admin only
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'root_admin') {
      return Response.json({ error: 'Unauthorized - Root admin only' }, { status: 403 });
    }

    const { payout_id, reason } = await req.json();

    // Load payout
    const payout = await base44.asServiceRole.entities.DealerPayout.get(payout_id);
    if (!payout) {
      return Response.json({ error: 'Payout not found' }, { status: 404 });
    }

    // Check status
    if (!['pending', 'scheduled', 'on_hold'].includes(payout.status)) {
      return Response.json({ 
        error: `Cannot cancel payout with status: ${payout.status}` 
      }, { status: 400 });
    }

    // Update to canceled
    await base44.asServiceRole.entities.DealerPayout.update(payout_id, {
      status: 'canceled',
      notes: `${payout.notes || ''}\nCanceled by ${user.email} at ${new Date().toISOString()}\nReason: ${reason || 'No reason provided'}`
    });

    // Create audit log
    await base44.functions.invoke('createAuditLog', {
      merchant_id: null,
      action_type: 'manual_payment',
      severity: 'warning',
      actor_id: user.id,
      actor_email: user.email,
      actor_role: user.role,
      target_entity: payout_id,
      description: `Payout canceled for dealer`,
      metadata: {
        payout_id,
        dealer_id: payout.dealer_id,
        amount: payout.commission_amount,
        reason
      }
    });

    return Response.json({
      success: true,
      payout_id,
      status: 'canceled'
    });

  } catch (error) {
    console.error('Cancel payout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});