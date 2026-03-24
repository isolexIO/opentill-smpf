import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        console.log('createDealerAccount: Starting dealer registration...');
        
        const body = await req.json();
        const {
            dealer_name,
            owner_name,
            owner_email,
            contact_phone,
            slug
        } = body;

        // Validate required fields
        if (!dealer_name || !owner_name || !owner_email || !slug) {
            console.error('Missing required fields');
            return Response.json({
                success: false,
                error: 'Dealer name, owner name, email, and slug are required'
            }, { status: 400 });
        }

        const base44 = createClientFromRequest(req);

        // Check if dealer slug already exists
        console.log('Checking for existing dealer with slug:', slug);
        const existingDealers = await base44.asServiceRole.entities.Dealer.filter({ 
            slug: slug.toLowerCase().trim() 
        });
        
        if (existingDealers && existingDealers.length > 0) {
            console.error('Dealer slug already exists:', slug);
            return Response.json({
                success: false,
                error: 'This dealer slug is already taken. Please choose a different one.'
            }, { status: 400 });
        }

        // Check if user already exists
        console.log('Checking for existing user with email:', owner_email);
        const existingUsers = await base44.asServiceRole.entities.User.filter({ 
            email: owner_email.toLowerCase().trim() 
        });
        
        if (existingUsers && existingUsers.length > 0) {
            console.error('User already exists:', owner_email);
            return Response.json({
                success: false,
                error: 'An account with this email already exists. Please use a different email.'
            }, { status: 400 });
        }

        // Generate a unique 6-digit PIN for dealer
        let pin;
        let pinIsUnique = false;
        let attempts = 0;
        const maxAttempts = 10;

        while (!pinIsUnique && attempts < maxAttempts) {
            pin = Math.floor(100000 + Math.random() * 900000).toString();
            const existingPinUsers = await base44.asServiceRole.entities.User.filter({ pin: pin });
            if (!existingPinUsers || existingPinUsers.length === 0) {
                pinIsUnique = true;
            } else {
                attempts++;
            }
        }

        if (!pinIsUnique) {
            return Response.json({ success: false, error: 'Failed to generate unique PIN. Please try again.' }, { status: 500 });
        }

        // Create dealer
        const dealerData = {
            name: dealer_name.trim(),
            slug: slug.toLowerCase().trim(),
            owner_name: owner_name.trim(),
            owner_email: owner_email.toLowerCase().trim(),
            contact_email: owner_email.toLowerCase().trim(),
            contact_phone: contact_phone || '',
            status: 'trial',
            trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            billing_mode: 'root_fallback',
            platform_fee_monthly: 0,
            commission_percent: 20,
            payout_method: 'stripe_connect',
            payout_minimum: 20.0,
            payout_cadence: 'monthly',
            payout_hold_days: 7,
            payout_enabled: false,
            total_merchants: 0,
            settings: {
                allow_merchant_self_signup: true,
                default_merchant_plan: 'basic',
                custom_pricing_enabled: false
            }
        };

        console.log('Creating dealer:', dealerData.name);
        const dealer = await base44.asServiceRole.entities.Dealer.create(dealerData);
        console.log('Dealer created with ID:', dealer.id);

        // Create dealer admin user
        const userData = {
            full_name: owner_name.trim(),
            email: owner_email.toLowerCase().trim(),
            role: 'dealer_admin',
            dealer_id: dealer.id,
            merchant_id: null,
            pin: pin,
            employee_id: `DEALER-${Date.now()}`,
            is_active: true,
            permissions: [
                'manage_dealers',
                'manage_merchants',
                'view_reports',
                'manage_settings',
                'submit_tickets',
                'admin_settings',
                'access_marketplace'
            ],
            can_view_all_merchants: true,
            can_view_all_dealers: false,
            wallet_address: null,
            wallet_provider: null,
            pos_settings: {},
            last_login: null,
            hourly_rate: 0
        };

        console.log('Creating dealer admin user');
        const user = await base44.asServiceRole.entities.User.create(userData);
        console.log('Dealer admin user created with ID:', user.id);

        // Invite dealer via base44 so they get platform login email (Google / magic link)
        try {
            await base44.asServiceRole.users.inviteUser(owner_email.toLowerCase().trim(), 'user');
            console.log('Invitation sent to dealer owner');
        } catch (inviteError) {
            console.error('Failed to send invitation:', inviteError);
        }

        // Also send a welcome email with PIN and portal URL
        try {
            await base44.asServiceRole.integrations.Core.SendEmail({
                to: owner_email.toLowerCase().trim(),
                subject: `Welcome to openTILL Ambassador Program! Your Credentials Inside`,
                body: `
                    <h2>Welcome to openTILL, ${owner_name}!</h2>
                    <p>Your ambassador account for <strong>${dealer_name}</strong> has been created successfully.</p>

                    <h3>How to Log In</h3>
                    <p>You will receive a separate invitation email to set up your account. Log in using:</p>
                    <ul>
                        <li><strong>Google Sign-In</strong> with ${owner_email.toLowerCase().trim()} (recommended), or</li>
                        <li><strong>Magic link</strong> from your invitation email</li>
                    </ul>
                    <p>Login URL: <a href="https://chainlinkpos.isolex.io">chainlinkpos.isolex.io</a></p>

                    <h3>Your POS Quick-Login PIN</h3>
                    <p>Once inside the platform, you can use your PIN for quick POS access:</p>
                    <p style="font-size:28px; font-weight:bold; letter-spacing:6px; background:#f3f4f6; padding:12px 20px; border-radius:8px; display:inline-block;">${pin}</p>

                    <h3>Your Portal</h3>
                    <p><strong>Portal URL:</strong> https://${slug}.chainlinkpos.isolex.io</p>
                    <p><strong>Trial ends:</strong> ${new Date(dealerData.trial_ends_at).toLocaleDateString()}</p>

                    <p>Thank you for joining the openTILL Ambassador Program!</p>
                `,
            });
            console.log('Welcome email sent');
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
        }

        console.log('Dealer registration completed successfully');

        return Response.json({
            success: true,
            dealer: {
                id: dealer.id,
                name: dealer.name,
                slug: dealer.slug,
                status: dealer.status
            },
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role
            },
            message: 'Dealer account created successfully! Check your email for login credentials.'
        });

    } catch (error) {
        console.error('createDealerAccount FATAL ERROR:', error);
        console.error('Error stack:', error.stack);
        
        return Response.json({
            success: false,
            error: 'Failed to create dealer account. Please try again or contact support.',
            details: error.message
        }, { status: 500 });
    }
});