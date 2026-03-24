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

    const { merchantId, is_demo } = await req.json();

    if (!merchantId || typeof is_demo !== 'boolean') {
      return Response.json({ 
        success: false, 
        error: 'merchantId and is_demo (boolean) are required' 
      }, { status: 400 });
    }

    // Update merchant demo status
    await base44.asServiceRole.entities.Merchant.update(merchantId, {
      is_demo: is_demo
    });

    // Log the action
    await base44.asServiceRole.entities.SystemLog.create({
      log_type: 'super_admin_action',
      action: `Merchant DEMO status ${is_demo ? 'enabled' : 'disabled'}`,
      description: `Merchant ID ${merchantId} marked as ${is_demo ? 'DEMO' : 'regular'} account`,
      user_id: user.id,
      user_email: user.email,
      user_role: user.role,
      merchant_id: merchantId,
      severity: 'info'
    });

    return Response.json({
      success: true,
      message: `Merchant ${is_demo ? 'marked as DEMO - full access, no fees' : 'removed from DEMO status'}`
    });

  } catch (error) {
    console.error('Toggle demo error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});