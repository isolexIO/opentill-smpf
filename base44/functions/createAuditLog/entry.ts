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

        // Get request metadata
        const ipAddress = req.headers.get('x-forwarded-for') || 
                         req.headers.get('x-real-ip') || 
                         'Unknown';
        const userAgent = req.headers.get('user-agent') || 'Unknown';

        // Create audit log entry
        const logData = {
            merchant_id: merchant_id || null,
            action_type: action_type,
            severity: severity,
            actor_id: actor_id,
            actor_email: actor_email,
            actor_role: actor_role,
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
            actor: actor_email
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