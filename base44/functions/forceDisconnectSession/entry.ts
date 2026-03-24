import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const body = await req.json();
        const { session_id } = body;

        if (!session_id) {
            return Response.json({ 
                error: 'session_id is required' 
            }, { status: 400 });
        }

        const base44 = createClientFromRequest(req);

        // Verify user is authenticated
        let user;
        try {
            user = await base44.auth.me();
            if (!user) {
                return Response.json({ 
                    error: 'Authentication required' 
                }, { status: 401 });
            }
        } catch (e) {
            return Response.json({ 
                error: 'Authentication required' 
            }, { status: 401 });
        }

        // Find the session using service role
        const sessions = await base44.asServiceRole.entities.DeviceSession.filter({
            session_id: session_id
        });

        if (!sessions || sessions.length === 0) {
            return Response.json({ 
                error: 'Session not found' 
            }, { status: 404 });
        }

        const session = sessions[0];

        // Check permissions:
        // 1. Root admin can disconnect any session
        // 2. Dealer admin can disconnect sessions in their dealer
        // 3. Merchant admin/manager can disconnect sessions in their merchant
        const isRootAdmin = user.role === 'root_admin';
        const isDealerAdmin = user.role === 'dealer_admin' && user.dealer_id === session.merchant_dealer_id;
        const isMerchantAdmin = (user.role === 'merchant_admin' || user.role === 'admin' || user.role === 'manager') && 
                                 user.merchant_id === session.merchant_id;

        if (!isRootAdmin && !isDealerAdmin && !isMerchantAdmin) {
            return Response.json({ 
                error: 'Unauthorized: You do not have permission to disconnect this device' 
            }, { status: 403 });
        }

        // Update session to forced disconnect
        await base44.asServiceRole.entities.DeviceSession.update(session.id, {
            forced_disconnect: true,
            disconnected_by: user.id,
            disconnected_at: new Date().toISOString(),
            status: 'offline'
        });

        // Create audit log
        try {
            await base44.asServiceRole.entities.AuditLog.create({
                merchant_id: session.merchant_id,
                action_type: 'device_registered',
                severity: 'warning',
                actor_id: user.id,
                actor_email: user.email,
                actor_role: user.role,
                target_entity: session.id,
                description: `Force disconnected device: ${session.device_name} (${session.device_type})`,
                metadata: {
                    session_id: session_id,
                    device_name: session.device_name,
                    device_type: session.device_type,
                    station_id: session.station_id
                },
                pci_relevant: false
            });
        } catch (auditError) {
            console.error('Failed to create audit log:', auditError);
            // Don't fail the request if audit log fails
        }

        return Response.json({ 
            success: true,
            message: 'Device disconnected successfully'
        });

    } catch (error) {
        console.error('forceDisconnectSession error:', error);
        return Response.json({ 
            error: 'Failed to disconnect device',
            details: error.message
        }, { status: 500 });
    }
});