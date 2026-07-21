import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { session_id } = body;

    if (!session_id) {
      return Response.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Check if this session has been authenticated
    // Query a session entity or cache to see if mobile app has connected
    const sessions = await base44.asServiceRole.entities.DeviceSession.filter({
      session_id: session_id,
      device_type: 'mobile',
      status: 'online'
    });

    if (sessions && sessions.length > 0) {
      const session = sessions[0];
      
      // Get user data
      const users = await base44.asServiceRole.entities.User.filter({
        id: session.user_id
      });

      if (users && users.length > 0) {
        const u = users[0];
        // SECURITY: Never return the raw user record — it contains the hashed
        // password, PIN, and 2FA secret. Expose only non-sensitive fields
        // needed by the mobile login flow.
        return Response.json({
          authenticated: true,
          user: {
            id: u.id,
            email: u.email,
            full_name: u.full_name,
            role: u.role,
            merchant_id: u.merchant_id,
            dealer_id: u.dealer_id,
            is_active: u.is_active,
            pos_settings: u.pos_settings || {}
          }
        });
      }
    }

    return Response.json({
      authenticated: false
    });

  } catch (error) {
    console.error('Check mobile session error:', error);
    return Response.json(
      { error: 'Failed to check session status' },
      { status: 500 }
    );
  }
});