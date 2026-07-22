import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const body = await req.json();
        const {
            merchant_id,
            action_type,
            severity = 'info',
            actor_id,
            actor_email,
            actor_role,
            target_entity,
            description,
            metadata = {},
            pci_relevant = false
        } = body;

        if (!action_type || !actor_id || !description) {
            return Response.json({
                error: 'action_type, actor_id, and description are required'
            }, { status: 400 });
        }

        const base44 = createClientFromRequest(req);

        // SECURITY: Require an authenticated session so anonymous attackers
        // cannot forge audit-log entries. The actor identity is taken from the
        // verified session (not the client-supplied body) to prevent spoofing.
        let user;
        try {
            user = await base44.auth.me();
        } catch (e) {
            user = null;
        }
        if (!user) {
            return Response.json({
                error: 'Unauthorized: authentication required to write audit logs'
            }, { status: 401 });
        }

        // Get request metadata
        const ipAddress = req.headers.get('x-forwarded-for') || 
                         req.headers.get('x-real-ip') || 
                         'Unknown';
        const userAgent = req.headers.get('user-agent') || 'Unknown';

        // Create audit log entry. Actor identity is sourced from the verified
        // session to prevent clients from spoofing another user/admin action.
        // SECURITY: enforce strict ownership mapping for merchant_id. A non-admin
        // caller may only log against their own session merchant_id; any
        // merchant_id supplied in the request body is ignored to prevent
        // cross-tenant audit-log forgery. Only verified admins may attribute a
        // log to an arbitrary merchant (or null for global/platform actions).
        const resolvedMerchantId = user.role === 'admin'
            ? (merchant_id || user.merchant_id || null)
            : (user.merchant_id || null);
        const logData = {
            merchant_id: resolvedMerchantId,
            action_type: action_type,
            severity: severity,
            actor_id: user.id,
            actor_email: user.email,
            actor_role: user.role,
            target_entity: target_entity || null,
            description: description,
            ip_address: ipAddress,
            user_agent: userAgent,
            metadata: metadata,
            pci_relevant: pci_relevant
        };

        const auditLog = await base44.asServiceRole.entities.AuditLog.create(logData);

        console.log('Audit log created:', {
            id: auditLog.id,
            action_type: action_type,
            actor: user.email
        });

        return Response.json({
            success: true,
            audit_log_id: auditLog.id
        });

    } catch (error) {
        console.error('createAuditLog error:', error);
        return Response.json({
            error: 'Failed to create audit log',
            details: error.message
        }, { status: 500 });
    }
});