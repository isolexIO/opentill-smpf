import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const body = await req.json();
        const {
            merchant_id,
            device_name,
            device_type,
            station_id,
            station_name,
            user_id,
            user_name
        } = body;

        if (!merchant_id || !device_name || !device_type) {
            return Response.json({
                success: false,
                error: 'merchant_id, device_name, and device_type are required'
            }, { status: 400 });
        }

        const base44 = createClientFromRequest(req);

        // Verify user is authenticated
        let user;
        try {
            user = await base44.auth.me();
        } catch (e) {
            // Only allow customer_display and kitchen_display without auth
            if (device_type !== 'customer_display' && device_type !== 'kitchen_display') {
                return Response.json({
                    success: false,
                    error: 'Unauthorized: Authentication required for this device type'
                }, { status: 401 });
            }
            console.log('registerDeviceSession: No auth, allowing for display device');
        }
        
        // Verify merchant_id matches authenticated user (except for admins and display devices)
        if (user && user.role !== 'admin' && user.merchant_id !== merchant_id) {
            return Response.json({
                success: false,
                error: 'Forbidden: Cannot register session for different merchant'
            }, { status: 403 });
        }

        // SECURITY: For unauthenticated display-device requests, verify the
        // target merchant actually exists so an attacker cannot register fake
        // sessions for arbitrary/non-existent merchant IDs.
        if (!user) {
            const merchants = await base44.asServiceRole.entities.Merchant.filter({ id: merchant_id });
            if (!merchants || merchants.length === 0) {
                return Response.json({
                    success: false,
                    error: 'Forbidden: merchant not found for unauthenticated session'
                }, { status: 403 });
            }
        }

        // For station-attached display devices, reuse the existing session for
        // that station so a browser refresh reattaches to the same endpoint
        // instead of spawning a duplicate session every time.
        const isDisplayDevice = device_type === 'customer_display' || device_type === 'kitchen_display';
        if (isDisplayDevice && station_id) {
            const existing = await base44.asServiceRole.entities.DeviceSession.filter(
                { merchant_id, station_id, device_type },
                '-created_date',
                1
            );
            if (existing && existing.length > 0) {
                const s = existing[0];
                const nowIso = new Date().toISOString();
                await base44.asServiceRole.entities.DeviceSession.update(s.id, {
                    status: 'online',
                    last_heartbeat: nowIso,
                    connected_at: nowIso,
                    forced_disconnect: false,
                    error_message: null,
                    ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || s.ip_address || 'unknown',
                    user_agent: req.headers.get('user-agent') || s.user_agent || 'unknown',
                    user_id: user_id || user?.id || s.user_id || null,
                    user_name: user_name || user?.full_name || user?.email || s.user_name || 'Guest'
                });
                console.log('Reusing display session for station:', station_id);
                return Response.json({
                    success: true,
                    session_id: s.session_id,
                    device_id: s.id,
                    reused: true
                });
            }
        }

        // Generate a cryptographically random session ID for ALL device types.
        // Display devices still reattach to the same endpoint on refresh via the
        // existing-session lookup above, so the ID must not be predictable
        // (a guessable ID would let an attacker authorize order mutations).
        const session_id = `session_${crypto.randomUUID()}`;

        // Get IP and user agent
        const ip_address = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
        const user_agent = req.headers.get('user-agent') || 'unknown';

        const now = new Date().toISOString();

        // Create device session using service role
        const session = await base44.asServiceRole.entities.DeviceSession.create({
            merchant_id: merchant_id,
            session_id: session_id,
            device_name: device_name,
            device_type: device_type,
            station_id: station_id || null,
            station_name: station_name || null,
            user_id: user_id || user?.id || null,
            user_name: user_name || user?.full_name || user?.email || 'Guest',
            ip_address: ip_address,
            user_agent: user_agent,
            status: 'online',
            last_heartbeat: now,
            connected_at: now
        });

        console.log('Device session registered:', session_id);

        return Response.json({
            success: true,
            session_id: session_id,
            device_id: session.id
        });

    } catch (error) {
        console.error('registerDeviceSession error:', error);
        return Response.json({
            success: false,
            error: 'Failed to register device session',
            details: error.message
        }, { status: 500 });
    }
});