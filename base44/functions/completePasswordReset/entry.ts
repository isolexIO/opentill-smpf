import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import bcrypt from 'npm:bcryptjs@2.4.3';

// Consumes a single-use, expiring reset token (issued by resetUserPassword) and
// sets a new password. The token's bcrypt hash is stored in temp_password as
// `${token}.${exp}`; we verify it with bcrypt.compare, check the expiry, then
// overwrite temp_password with a hash of the new password so the link can only
// be used once. emailPasswordLogin then works unchanged with the new password.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, token, exp, new_password } = await req.json();

    if (!email || !token || !exp || !new_password) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }
    if (String(new_password).length < 8) {
      return Response.json({ success: false, error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const expNum = Number(exp);
    if (!Number.isFinite(expNum) || expNum < Date.now()) {
      return Response.json({ success: false, error: 'Reset link has expired. Please request a new one.' }, { status: 401 });
    }

    let users;
    try {
      users = await base44.asServiceRole.entities.User.filter({ email: email });
    } catch (e) {
      users = await base44.entities.User.filter({ email: email });
    }
    if (!users || users.length === 0) {
      // No User record — check the Merchant entity (merchant admins without a
      // User record store their reset token in Merchant.temp_password).
      const merchants = await base44.asServiceRole.entities.Merchant.filter({ owner_email: email });
      const merchant = merchants?.[0];
      if (!merchant || !merchant.temp_password) {
        return Response.json({ success: false, error: 'Invalid or expired reset link.' }, { status: 401 });
      }

      const resetValue = `${token}.${exp}`;
      let tokenValid = false;
      try {
        tokenValid = bcrypt.compareSync(resetValue, merchant.temp_password);
      } catch (e) {
        tokenValid = false;
      }
      if (!tokenValid) {
        return Response.json({ success: false, error: 'Invalid or expired reset link.' }, { status: 401 });
      }

      const newPasswordHash = bcrypt.hashSync(String(new_password), 10);
      await base44.asServiceRole.entities.Merchant.update(merchant.id, {
        temp_password: newPasswordHash
      });

      try {
        await base44.asServiceRole.entities.SystemLog.create({
          log_type: 'security',
          action: 'Password Reset Completed',
          description: `Merchant ${merchant.owner_email} completed a password reset via secure link.`,
          merchant_id: merchant.id,
          user_email: merchant.owner_email,
          severity: 'info'
        });
      } catch (logError) {
        console.log('Could not log password reset completion:', logError);
      }

      return Response.json({ success: true, message: 'Password updated. You can now log in.' });
    }
    const user = users[0];

    if (!user.temp_password) {
      return Response.json({ success: false, error: 'Invalid or expired reset link.' }, { status: 401 });
    }

    const resetValue = `${token}.${exp}`;
    let tokenValid = false;
    try {
      tokenValid = bcrypt.compareSync(resetValue, user.temp_password);
    } catch (e) {
      tokenValid = false;
    }
    if (!tokenValid) {
      return Response.json({ success: false, error: 'Invalid or expired reset link.' }, { status: 401 });
    }

    // Token is single-use: overwrite temp_password with the new password hash.
    const newPasswordHash = bcrypt.hashSync(String(new_password), 10);
    try {
      await base44.asServiceRole.entities.User.update(user.id, {
        temp_password: newPasswordHash
      });
    } catch (e) {
      await base44.entities.User.update(user.id, {
        temp_password: newPasswordHash
      });
    }

    try {
      await base44.asServiceRole.entities.SystemLog.create({
        log_type: 'security',
        action: 'Password Reset Completed',
        description: `User ${user.email} completed a password reset via secure link.`,
        user_id: user.id,
        user_email: user.email,
        user_role: user.role,
        severity: 'info'
      });
    } catch (logError) {
      console.log('Could not log password reset completion:', logError);
    }

    return Response.json({ success: true, message: 'Password updated. You can now log in.' });
  } catch (error) {
    console.error('completePasswordReset error:', error);
    return Response.json({ success: false, error: 'Failed to reset password.' }, { status: 500 });
  }
});