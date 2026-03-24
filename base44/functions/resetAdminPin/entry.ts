import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // CRITICAL: Verify the requesting user is a super admin
    const requestingUser = await base44.auth.me();
    
    if (!requestingUser) {
      return Response.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    if (requestingUser.role !== 'admin') {
      return Response.json({
        success: false,
        error: 'Forbidden: Super admin privileges required'
      }, { status: 403 });
    }

    const { email, new_pin } = await req.json();

    console.log('resetAdminPin called for:', email, 'by:', requestingUser.email);

    if (!email) {
      return Response.json({
        success: false,
        error: 'Email is required'
      }, { status: 400 });
    }

    // Find user by email (case-insensitive)
    const allUsers = await base44.asServiceRole.entities.User.list();
    const user = allUsers.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      console.log('User not found. Available emails:', allUsers.map(u => u.email));
      return Response.json({
        success: false,
        error: `User not found with email: ${email}`
      }, { status: 404 });
    }

    console.log('Found user:', {
      id: user.id,
      email: user.email,
      role: user.role,
      current_pin: user.pin
    });

    // Generate new PIN if not provided
    const pin = new_pin && new_pin.length === 4 ? new_pin : Math.floor(1000 + Math.random() * 9000).toString();

    console.log('Setting new PIN:', pin);

    // Update user with new PIN
    const updatedUser = await base44.asServiceRole.entities.User.update(user.id, {
      pin: pin,
      is_active: true
    });

    console.log('User updated successfully. New PIN:', updatedUser.pin);

    // Log the action
    try {
      await base44.asServiceRole.entities.SystemLog.create({
        merchant_id: user.merchant_id || null,
        log_type: 'security',
        action: 'PIN Reset',
        description: `PIN reset for user ${user.email} by super admin ${requestingUser.email}`,
        user_id: requestingUser.id,
        user_email: requestingUser.email,
        severity: 'warning',
        metadata: {
          target_user: user.email,
          target_user_id: user.id
        }
      });
    } catch (logError) {
      console.warn('Could not create log:', logError);
    }

    return Response.json({
      success: true,
      message: 'PIN updated successfully',
      email: user.email,
      new_pin: pin,
      user_id: user.id,
      role: user.role
    });

  } catch (error) {
    console.error('resetAdminPin error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Failed to reset PIN'
    }, { status: 500 });
  }
});