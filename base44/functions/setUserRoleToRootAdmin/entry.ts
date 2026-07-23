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

    // Privilege check: only an existing root_admin may perform elevation. A
    // standard 'admin' role must NOT be able to self-elevate to root_admin,
    // which would be a privilege-escalation vector.
    if (user.role !== 'root_admin') {
      console.warn('Unauthorized role elevation attempt by:', user.email, 'role:', user.role);
      return Response.json({ 
        error: 'Forbidden: only an existing root administrator may perform this action' 
      }, { status: 403 });
    }

    // Prevent self-elevation redundancy and prevent demoting other admins unintentionally:
    // only allow elevating the caller themselves (no target user parameter accepted).
    console.log('Admin authorizing role elevation for:', user.email);

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