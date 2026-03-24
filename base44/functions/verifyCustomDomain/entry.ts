import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { domain_id } = await req.json();

    // Get domain record
    const domains = await base44.asServiceRole.entities.CustomDomain.filter({ id: domain_id });
    if (!domains || domains.length === 0) {
      return Response.json({ error: 'Domain not found' }, { status: 404 });
    }

    const domain = domains[0];

    // Verify user has access to this domain
    if (domain.merchant_id !== user.merchant_id && user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Verify DNS records using Deno's native DNS resolution
    let allVerified = true;
    const updatedRecords = [];

    for (const record of domain.dns_records) {
      let verified = false;

      try {
        if (record.type === 'TXT') {
          // Use Deno's native DNS resolution
          const result = await Deno.resolveDns(record.name, 'TXT');
          // Flatten and check for verification token
          const flatRecords = result.flat();
          verified = flatRecords.some(r => r.includes(domain.verification_token));
        } else if (record.type === 'CNAME') {
          const result = await Deno.resolveDns(record.name, 'CNAME');
          verified = result.some(r => r === record.value);
        } else if (record.type === 'A') {
          const result = await Deno.resolveDns(record.name, 'A');
          verified = result.includes(record.value);
        }
      } catch (error) {
        console.error(`Error verifying ${record.type} record for ${record.name}:`, error.message);
        verified = false;
      }

      updatedRecords.push({
        ...record,
        verified
      });

      if (!verified) {
        allVerified = false;
      }
    }

    // Update domain record
    const updateData = {
      dns_records: updatedRecords,
      last_checked: new Date().toISOString()
    };

    if (allVerified) {
      updateData.status = 'verified';
      updateData.verified_at = new Date().toISOString();
      updateData.ssl_status = 'provisioning';
      
      // Log verification
      await base44.asServiceRole.entities.SystemLog.create({
        merchant_id: domain.merchant_id,
        log_type: 'merchant_action',
        action: 'Custom domain verified',
        description: `Domain ${domain.domain} was successfully verified`,
        user_email: user.email,
        severity: 'info'
      });

      // Simulate SSL provisioning (in production, integrate with Let's Encrypt or similar)
      setTimeout(async () => {
        try {
          await base44.asServiceRole.entities.CustomDomain.update(domain_id, {
            ssl_status: 'active',
            ssl_issued_at: new Date().toISOString(),
            ssl_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
            status: 'active',
            force_https: true
          });

          await base44.asServiceRole.entities.SystemLog.create({
            merchant_id: domain.merchant_id,
            log_type: 'merchant_action',
            action: 'Custom domain activated',
            description: `Domain ${domain.domain} is now active with SSL certificate`,
            user_email: user.email,
            severity: 'info'
          });
        } catch (e) {
          console.error('Error activating domain:', e);
        }
      }, 5000);
    } else {
      updateData.status = 'pending_verification';
      updateData.error_message = 'One or more DNS records could not be verified. DNS changes can take 24-48 hours to propagate.';
    }

    await base44.asServiceRole.entities.CustomDomain.update(domain_id, updateData);

    return Response.json({
      verified: allVerified,
      message: allVerified 
        ? 'Domain verified successfully! SSL certificate provisioning in progress.' 
        : 'DNS records not yet propagated. Please wait a few minutes and try again. DNS changes can take up to 24-48 hours.',
      dns_records: updatedRecords
    });

  } catch (error) {
    console.error('Domain verification error:', error);
    return Response.json({ 
      error: error.message,
      verified: false,
      message: 'Failed to verify domain. Please try again later.'
    }, { status: 500 });
  }
});