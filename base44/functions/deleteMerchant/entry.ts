import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ 
        success: false, 
        error: 'Unauthorized. Admin access required.' 
      }, { status: 403 });
    }

    const { merchantId, merchantName } = await req.json();

    if (!merchantId) {
      return Response.json({ 
        success: false, 
        error: 'merchantId is required' 
      }, { status: 400 });
    }

    // Delete merchant
    await base44.asServiceRole.entities.Merchant.delete(merchantId);

    // Log the action
    await base44.asServiceRole.entities.SystemLog.create({
      log_type: 'super_admin_action',
      action: 'Merchant deleted',
      description: `Merchant ${merchantName || merchantId} was permanently deleted`,
      user_id: user.id,
      user_email: user.email,
      user_role: user.role,
      severity: 'critical'
    });

    return Response.json({
      success: true,
      message: 'Merchant deleted successfully'
    });

  } catch (error) {
    console.error('Delete merchant error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});