import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// In-memory rate limiting (in production, use Redis). Two buckets are tracked
// so attackers rotating IP addresses cannot brute-force short staff PINs:
// a per-(merchant,ip) bucket and a per-merchant aggregate bucket.
const ipAttemptMap = new Map();
const merchantAttemptMap = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const IP_RATE_LIMIT = 5;       // max attempts per (merchant, ip)
const MERCHANT_RATE_LIMIT = 20; // max attempts per merchant across all ips

function checkRateLimit(key, map, limit) {
  const now = Date.now();
  const attempts = (map.get(key) || []).filter((ts) => now - ts < RATE_LIMIT_WINDOW);
  if (attempts.length >= limit) {
    map.set(key, attempts);
    return false;
  }
  attempts.push(now);
  map.set(key, attempts);
  return true;
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { pin, merchant_id } = body;
    
    if (!pin || typeof pin !== 'string') {
      return Response.json(
        { success: false, error: 'Invalid PIN provided' },
        { status: 400 }
      );
    }

    // PINs are short numeric codes that collide across merchants. Require a
    // tenant scope so logins are isolated to the requesting merchant.
    if (!merchant_id || typeof merchant_id !== 'string') {
      return Response.json(
        { success: false, error: 'Merchant context is required for PIN login.' },
        { status: 400 }
      );
    }
    
    // Get client IP for rate limiting
    const ipAddress = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
                      req.headers.get('x-real-ip') ||
                      'unknown';

    // Rate limit by (merchant, ip) AND by merchant so attackers rotating IPs
    // still cannot brute-force short staff PINs.
    if (!checkRateLimit(`${merchant_id}:${ipAddress}`, ipAttemptMap, IP_RATE_LIMIT) ||
        !checkRateLimit(merchant_id, merchantAttemptMap, MERCHANT_RATE_LIMIT)) {
      return Response.json(
        { success: false, error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }
    
    const base44 = createClientFromRequest(req);
    
    // Use service role to securely look up PIN - never expose all users.
    // First, try to find a User record with this PIN + merchant_id. If none
    // is found, fall back to the merchant's admin_pin (set at activation,
    // before the owner accepts their platform invite and becomes a User).
    let user;
    let isVirtualUser = false;
    try {
      const users = await base44.asServiceRole.entities.User.filter({ pin, merchant_id });

      if (users && users.length > 0) {
        user = users[0];
      } else {
        // Fallback: check the merchant's admin_pin field
        const merchants = await base44.asServiceRole.entities.Merchant.filter({ id: merchant_id });
        const merchant = merchants?.[0];
        if (merchant && merchant.admin_pin && merchant.admin_pin === String(pin)) {
          // Build a virtual user from the merchant record so PIN login works
          // immediately at activation, before the owner accepts the invite.
          isVirtualUser = true;
          user = {
            id: `merchant_${merchant.id}`,
            email: merchant.owner_email,
            full_name: merchant.owner_name || 'Merchant Admin',
            role: 'admin',
            merchant_id: merchant.id,
            dealer_id: merchant.dealer_id || null,
            is_active: true
          };
        }
      }

      if (!user) {
        // Generic error - don't reveal if PIN exists
        return Response.json(
          { success: false, error: 'Invalid PIN. Please try again.' },
          { status: 401 }
        );
      }
    } catch (error) {
      console.error('Error looking up user by PIN:', error);
      return Response.json(
        { success: false, error: 'Authentication failed' },
        { status: 500 }
      );
    }

    // Verify user is active (skip for virtual merchant-admin users)
    if (!isVirtualUser && !user.is_active) {
      return Response.json(
        { success: false, error: 'Your account is inactive. Please contact support.' },
        { status: 403 }
      );
    }

    // Update last login (only for real User records)
    if (!isVirtualUser) {
      try {
        await base44.asServiceRole.entities.User.update(user.id, {
          last_login: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Could not update last login:', e);
      }
    }

    // Log successful authentication
    try {
      await base44.asServiceRole.entities.SystemLog.create({
        merchant_id: user.merchant_id || null,
        log_type: 'merchant_action',
        action: 'User PIN Login',
        description: `User ${user.full_name} logged in via PIN${isVirtualUser ? ' (merchant admin_pin)' : ''}`,
        user_id: user.id,
        user_email: user.email,
        user_role: user.role,
        ip_address: ipAddress,
        severity: 'info'
      });
    } catch (logError) {
      console.warn('Could not create log:', logError);
    }

    // Return user (without sensitive fields)
    // SECURITY: Do NOT return pos_settings — it may contain gateway API keys,
    // wallet addresses, and other private configuration that cashiers must not see.
    return Response.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        merchant_id: user.merchant_id,
        dealer_id: user.dealer_id,
        is_active: user.is_active,
      }
    });
    
  } catch (error) {
    console.error('authenticatePinUser ERROR:', error);
    return Response.json(
      { success: false, error: 'Authentication service error' },
      { status: 500 }
    );
  }
});