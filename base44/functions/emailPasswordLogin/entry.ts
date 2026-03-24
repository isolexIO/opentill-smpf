import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as OTPAuth from 'npm:otpauth@9.3.6';

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

    // Find user by email
    const users = await base44.asServiceRole.entities.User.filter({ 
      email: email.toLowerCase().trim() 
    });

    if (!users || users.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'Invalid email or password' 
      }, { status: 401 });
    }

    const user = users[0];

    // Check if user is active
    if (user.is_active === false) {
      return Response.json({ 
        success: false, 
        error: 'Account is inactive. Please contact support.' 
      }, { status: 401 });
    }

    // Verify password (temp_password takes priority)
    const passwordToCheck = user.temp_password || password;
    
    if (user.temp_password) {
      if (password !== user.temp_password) {
        return Response.json({ 
          success: false, 
          error: 'Invalid email or password' 
        }, { status: 401 });
      }
    } else {
      // In production, you would verify against a hashed password
      // For now, using temp_password field as plaintext (NOT SECURE - just for demo)
      return Response.json({ 
        success: false, 
        error: 'No password set for this account. Please use password reset.' 
      }, { status: 401 });
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

    // Clear temp password after first successful login
    if (user.temp_password) {
      await base44.asServiceRole.entities.User.update(user.id, {
        temp_password: null
      });
    }

    // Log the login
    await base44.asServiceRole.entities.SystemLog.create({
      log_type: 'security',
      action: 'User Email Login',
      description: `User ${user.email} logged in via email/password${user.two_factor_enabled ? ' with 2FA' : ''}`,
      user_id: user.id,
      user_email: user.email,
      user_role: user.role,
      severity: 'info'
    });

    // Return user data
    return Response.json({
      success: true,
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