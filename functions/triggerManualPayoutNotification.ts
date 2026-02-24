import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Trigger notification for manual payout actions
 * Called by PayoutControl when admin manually approves, rejects, or processes payouts
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin access
    const user = await base44.auth.me();
    if (!user || !['root_admin', 'dealer_admin'].includes(user.role)) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { ambassador_id, action, reason, amount, payout_id } = await req.json();

    if (!ambassador_id || !action) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Log the manual action
    await base44.asServiceRole.entities.SystemLog.create({
      log_type: 'super_admin_action',
      action: `Manual Payout Action: ${action}`,
      description: `Admin performed manual payout action for ambassador: ${action}`,
      user_email: user.email,
      user_role: user.role,
      severity: 'info',
      metadata: { ambassador_id, payout_id, action, reason, amount }
    });

    // Send notification
    try {
      await base44.asServiceRole.functions.invoke('sendPayoutNotification', {
        ambassador_id,
        type: 'admin_action',
        amount: amount || 0,
        merchant_names: [],
        details: {
          action: action,
          reason: reason || 'No reason provided',
          performed_by: user.email,
          payout_id: payout_id
        }
      });
    } catch (notifyError) {
      console.error('Notification sending failed:', notifyError);
    }

    return Response.json({
      success: true,
      message: 'Manual action logged and notification sent'
    });

  } catch (error) {
    console.error('Error in triggerManualPayoutNotification:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});