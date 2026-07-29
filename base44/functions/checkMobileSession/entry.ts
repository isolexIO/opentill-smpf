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

      // SECURITY: Only return user details to authenticated callers who own
      // the session. Unauthenticated callers (e.g. an attacker with a guessed
      // session_id) only learn whether the session is valid — they never
      // receive PII such as email, role, or merchant/dealer associations.
      let authenticatedUser = null;
      try {
        authenticatedUser = await base44.auth.me();
      } catch (_) {
        // Not authenticated via platform JWT — fall through to boolean-only response
      }

      if (authenticatedUser && authenticatedUser.id === session.user_id) {
        const users = await base44.asServiceRole.entities.User.filter({
          id: session.user_id
        });

        if (users && users.length > 0) {
          const u = users[0];
          return Response.json({
            authenticated: true,
            user: {
              id: u.id,
              email: u.email,
              full_name: u.full_name,
              role: u.role,
              merchant_id: u.merchant_id,
              dealer_id: u.dealer_id,
              is_active: u.is_active
            }
          });
        }
      }

      // Session is valid but caller is unauthenticated or doesn't own it.
      // Return only the boolean so the mobile app knows its session is active
      // without disclosing any user record.
      return Response.json({ authenticated: true });
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