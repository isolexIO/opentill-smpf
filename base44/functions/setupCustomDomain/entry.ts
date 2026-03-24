import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'dealer_admin' && user.role !== 'root_admin')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dealer_id, domain } = await req.json();

    if (!domain) {
      return Response.json({ error: 'Domain is required' }, { status: 400 });
    }

    // Validate domain format
    const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i;
    if (!domainRegex.test(domain)) {
      return Response.json({ error: 'Invalid domain format' }, { status: 400 });
    }

    // Generate DNS records needed for verification and SSL
    const dnsRecords = [
      {
        type: 'CNAME',
        name: domain,
        value: 'chainlinkpos.com',
        verified: false
      },
      {
        type: 'TXT',
        name: `_acme-challenge.${domain}`,
        value: `chainlink-verify-${Date.now()}`,
        verified: false
      }
    ];

    // Create or update custom domain record
    const existingDomains = await base44.entities.CustomDomain.filter({ dealer_id, domain });
    
    if (existingDomains.length > 0) {
      await base44.asServiceRole.entities.CustomDomain.update(existingDomains[0].id, {
        status: 'dns_pending',
        dns_records: dnsRecords,
        verification_method: 'dns_cname',
        verification_token: dnsRecords[1].value
      });
    } else {
      await base44.asServiceRole.entities.CustomDomain.create({
        dealer_id,
        domain,
        domain_type: 'pos',
        status: 'dns_pending',
        dns_records: dnsRecords,
        verification_method: 'dns_cname',
        verification_token: dnsRecords[1].value
      });
    }

    return Response.json({
      success: true,
      status: 'dns_pending',
      dns_records: dnsRecords,
      message: 'Add the DNS records to your domain registrar to continue'
    });
  } catch (error) {
    console.error('Setup domain error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});