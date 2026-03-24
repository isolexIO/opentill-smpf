import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { event, data } = await req.json();

        // Only process create events
        if (event.type !== 'create') {
            return Response.json({ success: true });
        }

        const merchant = data;

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