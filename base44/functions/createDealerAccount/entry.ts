import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import bcrypt from 'npm:bcryptjs@2.4.3';

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
            console.log(`Generated PIN attempt ${attempts + 1}`);
            
            const existingPinUsers = await base44.asServiceRole.entities.User.filter({ pin: pin });
            
            if (!existingPinUsers || existingPinUsers.length === 0) {
                pinIsUnique = true;
                console.log('PIN is unique');
            } else {
                attempts++;
            }
        }

        if (!pinIsUnique) {
            console.error('Failed to generate unique PIN');
            return Response.json({
                success: false,
                error: 'Failed to generate unique PIN. Please try again.'
            }, { status: 500 });
        }

        // Generate temporary password and hash it
        const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase();
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        console.log('Generated and hashed temporary password');

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
            password_hash: hashedPassword,
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

        // Send welcome email
        try {
            console.log('Sending welcome email to dealer...');
            await base44.integrations.Core.SendEmail({
                to: owner_email.toLowerCase().trim(),
                subject: `Welcome to ChainLINK POS Dealer Program!`,
body: `
                    <h2>Welcome to ChainLINK POS, ${owner_name}!</h2>
                    <p>Your dealer account has been created successfully.</p>
                    
                    <h3>Your Dealer Account:</h3>
                    <p><strong>Dealer Name:</strong> ${dealer_name}</p>
                    <p><strong>Dealer Slug:</strong> ${slug}</p>
                    <p><strong>Email:</strong> ${owner_email.toLowerCase().trim()}</p>
                    
                    <h3>Login Credentials:</h3>
                    <div style="background-color: #f3f4f6; padding: 15px; border-left: 4px solid #6366f1; margin: 15px 0;">
                        <p style="margin: 0;"><strong>⚠️ IMPORTANT - SECURE CREDENTIALS</strong></p>
                        <p style="margin: 10px 0 0 0; color: #4b5563;">Your login credentials have been generated. For security reasons:</p>
                        <ul style="margin: 5px 0 0 20px; color: #4b5563;">
                            <li>Delete this email after saving your credentials securely</li>
                            <li>Change your password immediately after first login</li>
                            <li>Do not share these credentials with anyone</li>
                        </ul>
                    </div>
                    
                    <p><strong>PIN:</strong> ${pin} <em>(Use for quick login)</em></p>
                    <p><strong>Temporary Password:</strong> ${tempPassword} <em>(Change immediately after login)</em></p>
                    
                    <h3>Your Dealer Dashboard:</h3>
                    <p>Access your dealer dashboard to:</p>
                    <ul>
                        <li>Manage your merchants</li>
                        <li>View commission reports</li>
                        <li>Configure white-label branding</li>
                        <li>Set up Stripe Connect for payouts</li>
                    </ul>
                    
                    <p><strong>Your unique dealer URL:</strong> https://${slug}.chainlinkpos.isolex.io</p>
                    
                    <p>Your trial period ends on: ${new Date(dealerData.trial_ends_at).toLocaleDateString()}</p>
                    
                    <p><strong>Next Steps:</strong></p>
                    <ol>
                        <li>Login using your PIN or temporary password</li>
                        <li>Change your password in Account Settings</li>
                        <li>Complete your dealer profile</li>
                    </ol>
                `
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