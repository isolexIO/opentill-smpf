import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is admin
    const user = await base44.auth.me();
    if (!user || !['admin', 'super_admin', 'root_admin'].includes(user.role)) {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { settings_id, settings_data, action } = body;

    // Allow public read of global settings (no admin required for 'get')
    if (action === 'get') {
      const settings = await base44.asServiceRole.entities.cLINKVaultSettings.list();
      const global = settings.find(s => !s.merchant_id) || settings[0] || null;
      return Response.json({ success: true, settings: global });
    }

    // All write operations require admin
    if (!user || !['admin', 'super_admin', 'root_admin'].includes(user.role)) {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    let result;
    
    if (action === 'create') {
      result = await base44.asServiceRole.entities.cLINKVaultSettings.create({
        ...settings_data,
        merchant_id: null
      });
    } else if (action === 'update') {
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