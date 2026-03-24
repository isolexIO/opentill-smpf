import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'merchant_admin' && user.role !== 'admin')) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { merchant_id, action, new_subdomain, wallet_signature } = await req.json();

    // Admin-only actions: approve, regenerate, disable
    const adminActions = ['approve', 'regenerate', 'disable'];
    if (adminActions.includes(action) && user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get merchant
    const merchants = await base44.asServiceRole.entities.Merchant.filter({
      id: merchant_id
    });

    if (!merchants || merchants.length === 0) {
      return Response.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const merchant = merchants[0];

    // Generate slug from business name
    const generateSlug = (name) => {
      return name
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    };

    // Check for collisions
    const checkCollision = async (slug) => {
      const existing = await base44.asServiceRole.entities.Merchant.filter({
        chainlink_subdomain: slug
      });
      return existing.length > 0;
    };

    // Generate unique subdomain
    const generateUniqueSubdomain = async (baseName) => {
      let slug = generateSlug(baseName);
      let counter = 1;

      while (await checkCollision(slug)) {
        slug = `${generateSlug(baseName)}-${counter}`;
        counter++;
      }

      return slug;
    };

    switch (action) {
      case 'request': {
        // Merchant requests subdomain
        if (merchant.chainlink_subdomain && merchant.subdomain_status === 'active') {
          return Response.json({
            success: false,
            error: 'Subdomain already exists and is active'
          }, { status: 400 });
        }

        const proposedSubdomain = new_subdomain || merchant.business_name;
        const uniqueSubdomain = await generateUniqueSubdomain(proposedSubdomain);

        await base44.asServiceRole.entities.Merchant.update(merchant_id, {
          chainlink_subdomain: uniqueSubdomain,
          subdomain_status: 'pending',
          subdomain_requested_at: new Date().toISOString(),
          subdomain_wallet: user.wallet_address || null
        });

        await base44.asServiceRole.entities.SystemLog.create({
          merchant_id: merchant_id,
          log_type: 'merchant_action',
          action: 'Subdomain Requested',
          description: `Merchant requested subdomain: ${uniqueSubdomain}.chainlink-pos.sol`,
          user_email: user.email,
          severity: 'info'
        });

        return Response.json({
          success: true,
          subdomain: `${uniqueSubdomain}.chainlink-pos.sol`,
          status: 'pending'
        });
      }

      case 'approve': {
        // Super Admin approves subdomain
        if (!merchant.chainlink_subdomain) {
          return Response.json({
            success: false,
            error: 'No subdomain to approve'
          }, { status: 400 });
        }

        await base44.asServiceRole.entities.Merchant.update(merchant_id, {
          subdomain_status: 'active',
          subdomain_approved_at: new Date().toISOString()
        });

        await base44.asServiceRole.entities.SystemLog.create({
          merchant_id: merchant_id,
          log_type: 'super_admin_action',
          action: 'Subdomain Approved',
          description: `Super Admin approved subdomain: ${merchant.chainlink_subdomain}.chainlink-pos.sol`,
          user_email: user.email,
          severity: 'info'
        });

        return Response.json({
          success: true,
          subdomain: `${merchant.chainlink_subdomain}.chainlink-pos.sol`,
          status: 'active'
        });
      }

      case 'regenerate': {
        // Super Admin regenerates subdomain
        const proposedSubdomain = new_subdomain || merchant.business_name;
        const uniqueSubdomain = await generateUniqueSubdomain(proposedSubdomain);

        await base44.asServiceRole.entities.Merchant.update(merchant_id, {
          chainlink_subdomain: uniqueSubdomain,
          subdomain_status: 'pending',
          subdomain_requested_at: new Date().toISOString(),
          subdomain_wallet: wallet_signature || merchant.subdomain_wallet
        });

        await base44.asServiceRole.entities.SystemLog.create({
          merchant_id: merchant_id,
          log_type: 'super_admin_action',
          action: 'Subdomain Regenerated',
          description: `Super Admin regenerated subdomain from ${merchant.chainlink_subdomain} to ${uniqueSubdomain}`,
          user_email: user.email,
          severity: 'info'
        });

        return Response.json({
          success: true,
          subdomain: `${uniqueSubdomain}.chainlink-pos.sol`,
          status: 'pending'
        });
      }

      case 'disable': {
        // Super Admin disables subdomain
        await base44.asServiceRole.entities.Merchant.update(merchant_id, {
          subdomain_status: 'disabled'
        });

        await base44.asServiceRole.entities.SystemLog.create({
          merchant_id: merchant_id,
          log_type: 'super_admin_action',
          action: 'Subdomain Disabled',
          description: `Super Admin disabled subdomain: ${merchant.chainlink_subdomain}.chainlink-pos.sol`,
          user_email: user.email,
          severity: 'warning'
        });

        return Response.json({
          success: true,
          status: 'disabled'
        });
      }

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Subdomain generation error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});