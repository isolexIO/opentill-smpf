import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as OTPAuth from 'npm:otpauth@9.3.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, verification_code } = await req.json();

    // Get current user data
    const users = await base44.asServiceRole.entities.User.filter({ id: user.id });
    if (!users || users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    const currentUser = users[0];

    if (action === 'enable') {
      // Generate new TOTP secret
      const secret = new OTPAuth.Secret({ size: 20 });
      const totp = new OTPAuth.TOTP({
        issuer: 'ChainLINK POS',
        label: user.email,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: secret
      });

      const otpauth_url = totp.toString();
      const qr_code = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(otpauth_url)}`;

      return Response.json({
        success: true,
        secret: secret.base32,
        qr_code: qr_code,
        otpauth_url: otpauth_url
      });

    } else if (action === 'verify') {
      if (!verification_code || !currentUser.two_factor_secret) {
        return Response.json({ 
          success: false, 
          error: 'Invalid verification code or secret not set' 
        }, { status: 400 });
      }

      // Verify the code
      const totp = new OTPAuth.TOTP({
        secret: currentUser.two_factor_secret,
        digits: 6,
        period: 30
      });

      const isValid = totp.validate({ token: verification_code, window: 1 }) !== null;

      if (!isValid) {
        return Response.json({
          success: false,
          error: 'Invalid verification code'
        }, { status: 401 });
      }

      // Enable 2FA
      await base44.asServiceRole.entities.User.update(user.id, {
        two_factor_enabled: true
      });

      await base44.asServiceRole.entities.SystemLog.create({
        log_type: 'security',
        action: '2FA Enabled',
        description: `User ${user.email} enabled two-factor authentication`,
        user_id: user.id,
        user_email: user.email,
        severity: 'info'
      });

      return Response.json({
        success: true,
        message: '2FA enabled successfully'
      });

    } else if (action === 'disable') {
      if (!verification_code) {
        return Response.json({ 
          success: false, 
          error: 'Verification code required to disable 2FA' 
        }, { status: 400 });
      }

      // Verify current code before disabling
      const totp = new OTPAuth.TOTP({
        secret: currentUser.two_factor_secret,
        digits: 6,
        period: 30
      });

      const isValid = totp.validate({ token: verification_code, window: 1 }) !== null;

      if (!isValid) {
        return Response.json({
          success: false,
          error: 'Invalid verification code'
        }, { status: 401 });
      }

      // Disable 2FA
      await base44.asServiceRole.entities.User.update(user.id, {
        two_factor_enabled: false,
        two_factor_secret: null
      });

      await base44.asServiceRole.entities.SystemLog.create({
        log_type: 'security',
        action: '2FA Disabled',
        description: `User ${user.email} disabled two-factor authentication`,
        user_id: user.id,
        user_email: user.email,
        severity: 'warning'
      });

      return Response.json({
        success: true,
        message: '2FA disabled successfully'
      });

    } else if (action === 'setup') {
      // Store the secret temporarily (not yet enabled)
      const secret = new OTPAuth.Secret({ size: 20 });
      
      await base44.asServiceRole.entities.User.update(user.id, {
        two_factor_secret: secret.base32
      });

      const totp = new OTPAuth.TOTP({
        issuer: 'ChainLINK POS',
        label: user.email,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: secret
      });

      const otpauth_url = totp.toString();
      const qr_code = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(otpauth_url)}`;

      return Response.json({
        success: true,
        secret: secret.base32,
        qr_code: qr_code,
        otpauth_url: otpauth_url
      });
    }

    return Response.json({ 
      success: false, 
      error: 'Invalid action' 
    }, { status: 400 });

  } catch (error) {
    console.error('2FA setup error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});