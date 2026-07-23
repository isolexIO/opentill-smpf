import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import bcrypt from 'npm:bcryptjs@2.4.3';

// Set a temporary password for an ambassador admin (super admin only). No email is sent.
// Handles two auth paths:
//  1. Ambassadors created by a super admin -> have a User entity -> set temp_password (cleared after first login).
//  2. Self-registered ambassadors (Ambassador Hub) -> credentials live on Ambassador.password_hash -> reset it directly.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Super admin only
    if (!user || user.role !== 'admin') {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const { email, password } = await req.json();

    if (!email || !password) {
      return Response.json({
        success: false,
        error: 'Email and password are required'
      }, { status: 400 });
    }

    if (password.length < 6) {
      return Response.json({
        success: false,
        error: 'Password must be at least 6 characters'
      }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();

    // Path 1: platform User entity (super-admin-created ambassadors)
    const users = await base44.asServiceRole.entities.User.filter({ email: emailLower });
    if (users && users.length > 0) {
      // Store temp_password as a bcrypt hash; emailPasswordLogin verifies with
      // bcrypt.compare and clears it after first successful login.
      const tempPasswordHash = bcrypt.hashSync(password, 10);
      await base44.asServiceRole.entities.User.update(users[0].id, {
        temp_password: tempPasswordHash
      });
      return Response.json({
        success: true,
        message: 'Temporary password set. The ambassador can log in via email login with it now; it will be cleared after first login.'
      });
    }

    // Path 2: self-registered ambassador (Ambassador Hub) — credentials on Ambassador entity
    const ambassadors = await base44.asServiceRole.entities.Ambassador.filter({ owner_email: emailLower });
    if (ambassadors && ambassadors.length > 0) {
      const hash = bcrypt.hashSync(password, 10);
      await base44.asServiceRole.entities.Ambassador.update(ambassadors[0].id, {
        password_hash: hash
      });
      return Response.json({
        success: true,
        message: 'Password reset for this ambassador. They can log in via the Ambassador Hub with the new password.'
      });
    }

    return Response.json({
      success: false,
      error: 'No ambassador account found with that email.'
    }, { status: 404 });
  } catch (error) {
    console.error('setUserTempPassword error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Failed to set password'
    }, { status: 500 });
  }
});