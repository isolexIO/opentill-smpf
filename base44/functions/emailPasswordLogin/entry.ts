import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as OTPAuth from 'npm:otpauth@9.3.6';
import bcrypt from 'npm:bcryptjs@2.4.3';
import { create } from 'https://deno.land/x/djwt@v2.8/mod.ts';

const JWT_SECRET = Deno.env.get('JWT_SECRET');

// Mints a short-lived HMAC-signed JWT so PIN-only / magic-link merchant admins
// (who have no platform User record and thus no platform session) can authorize
// against backend functions like manageMerchantAdmin. Mirrors authenticatePinUser.
async function generatePinSessionToken(user) {
  if (!JWT_SECRET) return null;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    merchant_id: user.merchant_id || null,
    dealer_id: user.dealer_id || null,
    type: 'pin_session',
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
  };
  return await create({ alg: 'HS256', typ: 'JWT' }, payload, key);
}

// Simple in-memory rate limiting (in production, use Redis)
const rateLimitMap = new Map();
const RATE_LIMIT = 10; // Max attempts per window
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(key) {
  const now = Date.now();
  if (!rateLimitMap.has(key)) rateLimitMap.set(key, []);
  const attempts = rateLimitMap.get(key).filter((t) => now - t < RATE_LIMIT_WINDOW);
  rateLimitMap.set(key, attempts);
  if (attempts.length >= RATE_LIMIT) return false;
  attempts.push(now);
  return true;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, password, two_factor_code } = await req.json();

    if (!email || !password) {
      return Response.json({ 
        success: false, 
        error: 'Email and password are required' 
      }, { status: 400 });
    }

    // Rate limit by email + IP to prevent password brute-forcing.
    const ipAddress = req.headers.get('x-forwarded-for') ||
                      req.headers.get('x-real-ip') || 'unknown';
    const rlKey = `${email.toLowerCase().trim()}|${ipAddress}`;
    if (!checkRateLimit(rlKey)) {
      return Response.json({
        success: false,
        error: 'Too many login attempts. Please try again later.'
      }, { status: 429 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email in the User entity
    const users = await base44.asServiceRole.entities.User.filter({ 
      email: normalizedEmail 
    });

    let user = null;
    let isVirtualUser = false;

    if (users && users.length > 0) {
      user = users[0];
      // Enrich: if the User record doesn't have merchant_id, check if they
      // own a Merchant account so the redirect lands on the right dashboard.
      if (!user.merchant_id) {
        try {
          const merchants = await base44.asServiceRole.entities.Merchant.filter({
            owner_email: normalizedEmail
          });
          const merchant = merchants?.[0];
          if (merchant) {
            user.merchant_id = merchant.id;
            if (!user.dealer_id) user.dealer_id = merchant.dealer_id;
          }
        } catch (e) {
          console.warn('Could not enrich user with merchant data:', e);
        }
      }
    } else {
      // Fallback: no User record exists (the platform blocks User.create,
      // so merchant admins activated before accepting their invite have no
      // User record yet). Look up the Merchant by owner_email and authenticate
      // against the bcrypt-hashed temp_password stored on the Merchant record
      // at activation (or via password reset).
      const merchants = await base44.asServiceRole.entities.Merchant.filter({ 
        owner_email: normalizedEmail 
      });
      const merchant = merchants?.[0];
      if (merchant && merchant.status === 'active') {
        let merchantPwValid = false;
        // Primary: verify against bcrypt-hashed temp_password
        if (merchant.temp_password) {
          try {
            merchantPwValid = await bcrypt.compare(String(password), merchant.temp_password);
          } catch (e) {
            merchantPwValid = false;
          }
        }
        // Fallback: merchants activated before temp_password was introduced
        // only have an admin_pin. Allow them to log in with it as the password
        // so they aren't locked out.
        if (!merchantPwValid && merchant.admin_pin) {
          merchantPwValid = String(password) === String(merchant.admin_pin);
        }
        if (merchantPwValid) {
          isVirtualUser = true;
          user = {
            id: `merchant_${merchant.id}`,
            email: merchant.owner_email,
            full_name: merchant.owner_name || 'Merchant Admin',
            // Use 'merchant_admin' (merchant-scoped), NOT 'admin' (platform-wide
            // super-admin). 'admin' would bypass feature gating in
            // useMerchantFeatures and unlock every feature for every merchant.
            role: 'merchant_admin',
            merchant_id: merchant.id,
            dealer_id: merchant.dealer_id || null,
            is_active: true,
            temp_password: null
          };
          // Only clear temp_password (not admin_pin) after login
          if (merchant.temp_password) {
            user._merchant_id_for_clear = merchant.id;
          }
        }
      }
    }

    if (!user) {
      return Response.json({ 
        success: false, 
        error: 'Invalid email or password' 
      }, { status: 401 });
    }

    // Check if user is active (skip for virtual merchant-admin users)
    if (!isVirtualUser && user.is_active === false) {
      return Response.json({ 
        success: false, 
        error: 'Account is inactive. Please contact support.' 
      }, { status: 401 });
    }

    // Verify password against the stored temp_password (bcrypt hash) for real
    // User records. Virtual merchant-admin users were already authenticated
    // above by matching the admin_pin.
    if (!isVirtualUser) {
      if (!user.temp_password) {
        return Response.json({ 
          success: false, 
          error: 'No password set for this account. Please use password reset.' 
        }, { status: 401 });
      }

      let passwordValid = false;
      try {
        passwordValid = await bcrypt.compare(password, user.temp_password);
      } catch (e) {
        passwordValid = false;
      }
      if (!passwordValid) {
        return Response.json({ 
          success: false, 
          error: 'Invalid email or password' 
        }, { status: 401 });
      }
    }

    // Check if 2FA is enabled
    if (user.two_factor_enabled && user.two_factor_secret) {
      if (!two_factor_code) {
        // Require 2FA code
        return Response.json({
          success: true,
          requires_2fa: true,
          user_id: user.id
        });
      }

      // Verify 2FA code
      try {
        const totp = new OTPAuth.TOTP({
          secret: user.two_factor_secret,
          digits: 6,
          period: 30
        });

        const isValid = totp.validate({ token: two_factor_code, window: 1 }) !== null;

        if (!isValid) {
          return Response.json({
            success: false,
            error: 'Invalid 2FA code. Please try again.'
          }, { status: 401 });
        }
      } catch (error) {
        console.error('2FA validation error:', error);
        return Response.json({
          success: false,
          error: 'Failed to verify 2FA code'
        }, { status: 500 });
      }
    }

    // Clear temp password after first successful login.
    // Real User records: clear on the User entity.
    // Virtual merchant-admin users: clear on the Merchant entity.
    if (!isVirtualUser && user.temp_password) {
      await base44.asServiceRole.entities.User.update(user.id, {
        temp_password: null
      });
    }
    if (isVirtualUser && user._merchant_id_for_clear) {
      try {
        await base44.asServiceRole.entities.Merchant.update(user._merchant_id_for_clear, {
          temp_password: null
        });
      } catch (e) {
        console.warn('Could not clear merchant temp_password:', e);
      }
    }

    // Log the login
    await base44.asServiceRole.entities.SystemLog.create({
      log_type: 'security',
      action: 'User Email Login',
      description: `User ${user.email} logged in via email/password${isVirtualUser ? ' (merchant admin_pin)' : (user.two_factor_enabled ? ' with 2FA' : '')}`,
      user_id: user.id,
      user_email: user.email,
      user_role: user.role,
      merchant_id: user.merchant_id || null,
      severity: 'info'
    });

    // Return user data
    const session_token = await generatePinSessionToken(user);
    return Response.json({
      success: true,
      session_token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        merchant_id: user.merchant_id,
        dealer_id: user.dealer_id,
        permissions: user.permissions || []
      }
    });

  } catch (error) {
    console.error('Email login error:', error);
    return Response.json({ 
      success: false, 
      error: 'Login failed. Please try again.' 
    }, { status: 500 });
  }
});