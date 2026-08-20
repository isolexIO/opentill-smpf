import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    let body = {};
    try { body = await req.json(); } catch {}

    const { action, merchant_id, data } = body;

    if (!action || !merchant_id) {
      return Response.json({
        success: false,
        error: 'action and merchant_id are required'
      }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Authenticate the caller strictly via the platform session.
    // Never trust a request-body email for authorization decisions.
    let user;
    try {
      user = await base44.auth.me();
    } catch {
      return Response.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    if (!user) {
      return Response.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Fetch the merchant using service role (bypasses RLS)
    const merchants = await base44.asServiceRole.entities.Merchant.filter({ id: merchant_id });
    if (!merchants || merchants.length === 0) {
      return Response.json({
        success: false,
        error: 'Merchant not found'
      }, { status: 404 });
    }

    const merchant = merchants[0];

    // Authorize: platform admin, or the merchant owner (verified via session email).
    // The caller's identity is derived from base44.auth.me(), never from the request body.
    let isAuthorized = false;
    if (user.role === 'admin') {
      isAuthorized = true;
    } else if (merchant.owner_email && user.email &&
               merchant.owner_email.toLowerCase().trim() === String(user.email).toLowerCase().trim()) {
      isAuthorized = true;
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