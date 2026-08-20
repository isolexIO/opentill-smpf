import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    let body = {};
    try { body = await req.json(); } catch {}

    const { action, email, merchant_id, data } = body;

    if (!action || !email || !merchant_id) {
      return Response.json({
        success: false,
        error: 'action, email, and merchant_id are required'
      }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const normalizedEmail = String(email).toLowerCase().trim();

    // Fetch the merchant using service role (bypasses RLS)
    const merchants = await base44.asServiceRole.entities.Merchant.filter({ id: merchant_id });
    if (!merchants || merchants.length === 0) {
      return Response.json({
        success: false,
        error: 'Merchant not found'
      }, { status: 404 });
    }

    const merchant = merchants[0];

    // Verify the caller owns this merchant (email must match owner_email)
    // or is a platform admin
    let isAuthorized = false;
    if (merchant.owner_email && merchant.owner_email.toLowerCase().trim() === normalizedEmail) {
      isAuthorized = true;
    }

    // Also check if the caller has a real platform session with admin role
    if (!isAuthorized) {
      try {
        const user = await base44.auth.me();
        if (user && user.role === 'admin') {
          isAuthorized = true;
        }
      } catch {}
    }

    if (!isAuthorized) {
      return Response.json({
        success: false,
        error: 'You are not authorized to access this merchant'
      }, { status: 403 });
    }

    if (action === 'get') {
      return Response.json({
        success: true,
        merchant: merchant
      });
    }

    if (action === 'update') {
      if (!data) {
        return Response.json({
          success: false,
          error: 'data is required for update action'
        }, { status: 400 });
      }

      const updated = await base44.asServiceRole.entities.Merchant.update(merchant_id, data);
      return Response.json({
        success: true,
        merchant: updated
      });
    }

    return Response.json({
      success: false,
      error: 'Invalid action. Use "get" or "update".'
    }, { status: 400 });
  } catch (error) {
    console.error('manageMerchantAdmin error:', error);
    return Response.json({
      success: false,
      error: 'Failed to process merchant admin request',
      details: error.message
    }, { status: 500 });
  }
});