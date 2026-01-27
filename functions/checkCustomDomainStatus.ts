import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dealer_id, domain } = await req.json();

    // Validate that the requesting user has access to this dealer
    if (user.role !== 'admin' && user.dealer_id !== dealer_id) {
      return Response.json({ 
        error: 'Unauthorized: You do not have access to this dealer' 
      }, { status: 403 });
    }

    // Get custom domain record
    const domains = await base44.entities.CustomDomain.filter({ dealer_id, domain });
    
    if (domains.length === 0) {
      return Response.json({ 
        success: false,
        error: 'Domain not found' 
      }, { status: 404 });
    }

    const domainRecord = domains[0];

    return Response.json({
      success: true,
      status: domainRecord.status,
      dns_records: domainRecord.dns_records || [],
      ssl_status: domainRecord.ssl_status,
      verified_at: domainRecord.verified_at
    });
  } catch (error) {
    console.error('Check domain status error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});