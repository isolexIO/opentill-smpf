import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verify admin authentication
        const user = await base44.auth.me();
        if (!user || !['admin', 'super_admin', 'dealer_admin'].includes(user.role)) {
            return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
        }
        
        // Parse request body
        const { session_id } = await req.json();

        if (!session_id) {
            return Response.json({ error: 'session_id is required' }, { status: 400 });
        }

        // Find the session
        const sessions = await base44.asServiceRole.entities.DeviceSession.filter({
            session_id: session_id
        });

        if (!sessions || sessions.length === 0) {
            return Response.json({ 
                success: true,
                message: 'Session not found or already disconnected'
            });
        }

        const session = sessions[0];

        // Update session to disconnected
        await base44.asServiceRole.entities.DeviceSession.update(session.id, {
            status: 'offline',
            disconnected_at: new Date().toISOString()
        });

        return Response.json({ 
            success: true,
            message: 'Session disconnected successfully'
        });

    } catch (error) {
        console.error('Error disconnecting device session:', error);
        return Response.json({ 
            error: error.message || 'Internal server error',
            details: error.toString()
        }, { status: 500 });
    }
});