import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Set a temporary password for a user (super admin only). No email is sent.
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

    const users = await base44.asServiceRole.entities.User.filter({ email: emailLower });

    if (!users || users.length === 0) {
      return Response.json({
        success: false,
        error: 'No user found with that email. Ensure the ambassador admin user exists first.'
      }, { status: 404 });
    }

    const target = users[0];

    // emailPasswordLogin validates `temp_password` (plaintext) and clears it after first login.
    await base44.asServiceRole.entities.User.update(target.id, {
      temp_password: password
    });

    return Response.json({
      success: true,
      message: 'Temporary password set. The user can log in with it now; it will be cleared after first login.'
    });
  } catch (error) {
    console.error('setUserTempPassword error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Failed to set password'
    }, { status: 500 });
  }
});