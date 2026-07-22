import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();

        // Support both direct call and entity automation payload.
        let merchant;
        let isAutomation = false;
        if (body.event && body.data) {
            // Entity automation path.
            isAutomation = true;
            const { event, data } = body;
            if (event.type !== 'create' || !data) {
                return Response.json({ success: true, message: 'Skipped - not a create event' });
            }
            // Re-verify the merchant from the DB so a spoofed automation
            // payload cannot inject arbitrary text into Super Admin
            // notifications or create bogus entries. Only authoritative DB
            // fields are used to build the notification.
            let merchants;
            try {
                merchants = await base44.asServiceRole.entities.Merchant.filter({ id: data.id });
            } catch (lookupError) {
                return Response.json({ success: true, message: 'Merchant lookup failed, skipped' });
            }
            if (!merchants || merchants.length === 0) {
                return Response.json({ success: true, message: 'Merchant not found, skipped' });
            }
            merchant = merchants[0];
        } else {
            // Direct call: require an authenticated admin. Only admins may
            // trigger Super Admin notifications to prevent unauthorized
            // notification spam / dashboard defacement.
            let user;
            try {
                user = await base44.auth.me();
            } catch (e) {
                return Response.json({ success: false, error: 'Unauthorized: authentication required' }, { status: 401 });
            }
            if (!user || user.role !== 'admin') {
                return Response.json({ success: false, error: 'Forbidden: admin access required' }, { status: 403 });
            }
            // Verify the referenced merchant exists and is inactive.
            const merchantId = body.merchant_id || body.id;
            if (!merchantId) {
                return Response.json({ success: false, error: 'Missing merchant_id' }, { status: 400 });
            }
            const merchants = await base44.asServiceRole.entities.Merchant.filter({ id: merchantId });
            if (!merchants || merchants.length === 0) {
                return Response.json({ success: false, error: 'Merchant not found' }, { status: 404 });
            }
            merchant = merchants[0];
        }

        // Only notify for inactive merchants (pending)
        if (merchant.status !== 'inactive') {
            return Response.json({ success: true });
        }

        // Create notification for super admin
        await base44.asServiceRole.entities.MerchantNotification.create({
            title: 'New Merchant Registration',
            message: `${merchant.business_name} (${merchant.owner_email}) has registered and is pending activation.`,
            type: 'info',
            priority: 'high',
            target_merchants: [], // Empty array = all users can see (admins)
            is_active: true,
            is_dismissible: true,
            action_url: '/SuperAdmin?tab=pending',
            action_text: 'Review Application',
            created_by: 'system',
            created_by_email: 'system@chainlink.local'
        });

        console.log(`Notification created for merchant: ${merchant.business_name}`);

        return Response.json({ success: true });
    } catch (error) {
        console.error('notifyPendingMerchant ERROR:', error);
        // Don't fail the automation - just log the error
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});