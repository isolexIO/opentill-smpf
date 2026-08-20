import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { verify } from 'https://deno.land/x/djwt@v2.8/mod.ts';

const JWT_SECRET = Deno.env.get('JWT_SECRET');

// Verifies a PIN-session JWT minted by authenticatePinUser. Returns the
// payload or null. Used to authorize PIN-only merchant admins (who have no
// platform User/session) to load and update their own merchant record.
async function verifyPinSessionToken(token) {
  if (!JWT_SECRET || !token) return null;
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const payload = await verify(token, key);
    if (!payload || payload.type !== 'pin_session') return null;
    return payload;
  } catch {
    return null;
  }
}

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

    // Authenticate the caller. Prefer the platform session (real platform
    // users / admins). Fall back to a PIN-session JWT for merchant owners who
    // logged in via PIN and have no platform User record yet — without this,
    // they can neither read nor update their own merchant because RLS and
    // base44.auth.me() both require a platform session that PIN login never
    // establishes.
    let user = null;
    let isPinSession = false;
    try {
      user = await base44.auth.me();
    } catch {
      user = null;
    }

    if (!user) {
      const pinPayload = await verifyPinSessionToken(body.session_token);
      if (pinPayload && pinPayload.merchant_id) {
        user = {
          email: pinPayload.email,
          role: pinPayload.role,
          merchant_id: pinPayload.merchant_id,
          dealer_id: pinPayload.dealer_id
        };
        isPinSession = true;
      }
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
      // PIN-session tokens are scoped to a single merchant; ensure the token's
      // merchant_id matches the one being accessed (defense-in-depth against
      // any token reuse across merchants with a shared owner email).
      if (isPinSession && user.merchant_id !== merchant_id) {
        isAuthorized = false;
      } else {
        isAuthorized = true;
      }
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