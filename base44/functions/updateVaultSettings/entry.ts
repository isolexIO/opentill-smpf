import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is admin
    const user = await base44.auth.me();
    if (!user || !['admin', 'super_admin', 'root_admin'].includes(user.role)) {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { settings_id, settings_data, action } = await req.json();

    const isPlatformAdmin = ['admin', 'super_admin', 'root_admin'].includes(user.role);
    const adminMerchantId = user.data?.merchant_id;

    let result;
    
    if (action === 'create') {
      // Only platform-wide admins may create global vault settings.
      if (!isPlatformAdmin) {
        return Response.json({ error: 'Forbidden: only platform admins may create global vault settings' }, { status: 403 });
      }
      result = await base44.asServiceRole.entities.cLINKVaultSettings.create({
        ...settings_data,
        merchant_id: null
      });
    } else if (action === 'update') {
      // Verify the caller owns the vault settings record they are trying to modify.
      const existing = await base44.asServiceRole.entities.cLINKVaultSettings.get(settings_id);
      if (!existing) {
        return Response.json({ error: 'Vault settings not found' }, { status: 404 });
      }
      const isGlobal = !existing.merchant_id;
      if (isGlobal && !isPlatformAdmin) {
        return Response.json({ error: 'Forbidden: only platform admins may modify global vault settings' }, { status: 403 });
      }
      if (!isGlobal && !isPlatformAdmin) {
        if (!adminMerchantId || existing.merchant_id !== adminMerchantId) {
          return Response.json({ error: 'Forbidden: you can only modify vault settings for your own merchant' }, { status: 403 });
        }
      }
      result = await base44.asServiceRole.entities.cLINKVaultSettings.update(settings_id, settings_data);
    } else if (action === 'get') {
      const settings = await base44.asServiceRole.entities.cLINKVaultSettings.list();
      const global = settings.find(s => !s.merchant_id) || settings[0] || null;
      return Response.json({ success: true, settings: global });
    }

    return Response.json({ success: true, data: result });
  } catch (error) {
    console.error('Vault settings error:', error);
    return Response.json({ 
      error: error.message || 'Failed to process vault settings' 
    }, { status: 500 });
  }
});