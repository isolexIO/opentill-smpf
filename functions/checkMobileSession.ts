import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const sessionId = url.pathname.split('/').pop();

    if (!sessionId) {
      return Response.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Check if this session has been authenticated
    // Query a session entity or cache to see if mobile app has connected
    const sessions = await base44.asServiceRole.entities.DeviceSession.filter({
      session_id: sessionId,
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
        return Response.json({
          authenticated: true,
          user: users[0]
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