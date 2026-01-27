import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        // Parse request body first
        let body;
        try {
            body = await req.json();
        } catch (e) {
            console.error('Error parsing request body:', e);
            return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const { session_id, active_order_id, active_order_number, status } = body;

        if (!session_id) {
            return Response.json({ error: 'session_id is required' }, { status: 400 });
        }

        // Create base44 client
        const base44 = createClientFromRequest(req);

        // Verify authentication for non-display devices
        let user;
        try {
            user = await base44.auth.me();
        } catch (e) {
            // Continue without auth for display devices only
            console.log('updateDeviceHeartbeat: No auth');
        }

        // Find the session using service role
        let sessions;
        try {
            sessions = await base44.asServiceRole.entities.DeviceSession.filter({
                session_id: session_id
            });
        } catch (e) {
            console.error('Error querying DeviceSession:', e);
            return Response.json({ 
                error: 'Database query failed',
                details: e.message 
            }, { status: 500 });
        }

        if (!sessions || sessions.length === 0) {
            // Session not found - this is OK, just return success
            // (session might have been cleaned up)
            return Response.json({ 
                success: true,
                forced_disconnect: false,
                message: 'Session not found (possibly cleaned up)'
            });
        }

        const session = sessions[0];
        
        // Verify user has access to this session (except for display devices and admins)
        if (user && user.role !== 'admin' && session.device_type !== 'customer_display' && session.device_type !== 'kitchen_display') {
            if (user.merchant_id !== session.merchant_id) {
                return Response.json({
                    success: false,
                    error: 'Forbidden: Access denied to this session'
                }, { status: 403 });
            }
        }

        // Check if session was force-disconnected
        if (session.forced_disconnect) {
            return Response.json({ 
                success: false, 
                forced_disconnect: true,
                message: 'Session was disconnected by administrator'
            });
        }

        // Update session with new heartbeat
        const updateData = {
            last_heartbeat: new Date().toISOString(),
            status: status || 'online'
        };

        // Only update active order fields if provided
        if (active_order_id !== undefined && active_order_id !== null) {
            updateData.active_order_id = active_order_id;
        }
        if (active_order_number !== undefined && active_order_number !== null) {
            updateData.active_order_number = active_order_number;
        }

        try {
            await base44.asServiceRole.entities.DeviceSession.update(session.id, updateData);
        } catch (e) {
            console.error('Error updating DeviceSession:', e);
            // Don't fail the heartbeat if update fails - just log it
            return Response.json({ 
                success: true,
                forced_disconnect: false,
                warning: 'Update failed but continuing',
                details: e.message
            });
        }

        return Response.json({ 
            success: true,
            forced_disconnect: false
        });

    } catch (error) {
        console.error('Unexpected error in updateDeviceHeartbeat:', error);
        return Response.json({ 
            error: 'Internal server error',
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});