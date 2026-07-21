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

        // SECURITY: Scope the signup notification so it is visible only to
        // Super Admins (always allowed via the admin RLS condition) and the
        // referring Ambassador/Dealer attached to the referral code, if any.
        // We must NOT leave target_merchants empty, because the
        // MerchantNotification read RLS treats an empty array as a broadcast
        // to all users. A non-empty sentinel ensures no regular merchant
        // matches while keeping the notification admin-only by default.
        let referrerMerchant = null;
        if (merchant.referred_by_code) {
            try {
                const referrers = await base44.asServiceRole.entities.Merchant.filter({
                    referral_code: merchant.referred_by_code.toUpperCase().trim()
                });
                if (referrers && referrers.length > 0) {
                    referrerMerchant = referrers[0];
                }
            } catch (e) {
                console.log('Could not resolve referrer merchant:', e);
            }
        }

        const targetMerchants = referrerMerchant ? [referrerMerchant.id] : ['__admin_only__'];
        const targetDealerIds = referrerMerchant && referrerMerchant.dealer_id
            ? [referrerMerchant.dealer_id]
            : [];

        await base44.asServiceRole.entities.MerchantNotification.create({
            title: 'New Merchant Registration',
            message: `${merchant.business_name} (${merchant.owner_email}) has registered and is pending activation.`,
            type: 'info',
            priority: 'high',
            target_merchants: targetMerchants,
            target_dealer_ids: targetDealerIds,
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