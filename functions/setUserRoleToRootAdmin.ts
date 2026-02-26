import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * DEVELOPMENT ONLY: Set current user's role to root_admin
 * WARNING: This bypasses normal security. Remove or secure this in production!
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get current authenticated user
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log('Setting user role to root_admin:', user.email);

    // Use service role to update the user's role
    await base44.asServiceRole.entities.User.update(user.id, {
      role: 'root_admin',
      can_view_all_dealers: true,
      can_view_all_merchants: true
    });

    return Response.json({
      success: true,
      message: 'User role updated to root_admin',
      user_id: user.id,
      user_email: user.email
    });

  } catch (error) {
    console.error('Error updating user role:', error);
    return Response.json({ 
      error: error.message,
      details: 'Failed to update user role'
    }, { status: 500 });
  }
});