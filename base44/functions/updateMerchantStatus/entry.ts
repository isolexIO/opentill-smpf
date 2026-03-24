import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { merchantId, newStatus } = await req.json();

    if (!merchantId || !newStatus) {
      return Response.json({ error: 'Missing merchantId or newStatus' }, { status: 400 });
    }

    const updates = { status: newStatus };
    
    if (newStatus === 'suspended') {
      updates.suspended_at = new Date().toISOString();
      updates.suspension_reason = 'Manually suspended by admin';
    } else if (newStatus === 'active') {
      updates.suspended_at = null;
      updates.suspension_reason = null;
    }

    const merchant = await base44.asServiceRole.entities.Merchant.get(merchantId);
    if (!merchant) {
      return Response.json({ error: 'Merchant not found' }, { status: 404 });
    }

    await base44.asServiceRole.entities.Merchant.update(merchantId, updates);
    
    await base44.asServiceRole.entities.SystemLog.create({
      log_type: 'super_admin_action',
      action: `Merchant status changed to ${newStatus}`,
      description: `Merchant ${merchant.business_name} status changed from ${merchant.status} to ${newStatus}`,
      user_email: user.email,
      user_role: 'super_admin',
      merchant_id: merchantId,
      severity: 'info'
    });

    return Response.json({ success: true, merchant: { id: merchantId, status: newStatus } });
  } catch (error) {
    console.error('Error updating merchant status:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});