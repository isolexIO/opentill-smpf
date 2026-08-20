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

        // SECURITY: creating a dealer admin account is a privileged operation
        // that grants dealer_admin access with can_view_all_merchants. It must
        // not be reachable by unauthenticated callers. Require an authenticated
        // platform administrator.
        let currentUser = null;
        try {
            currentUser = await base44.auth.me();
        } catch (e) {
            currentUser = null;
        }
        const ADMIN_ROLES = ['admin', 'root_admin', 'super_admin'];
        if (!currentUser || !ADMIN_ROLES.includes(currentUser.role)) {
            return Response.json({
                success: false,
                error: 'Forbidden: dealer account creation requires administrator access'
            }, { status: 403 });
        }

        // Check if dealer slug already exists
        console.log('Checking for existing dealer with slug:', slug);
        const existingDealers = await base44.asServiceRole.entities.Ambassador.filter({
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
            // Use a cryptographically secure PRNG for the 6-digit PIN
            const randomBytes = crypto.getRandomValues(new Uint32Array(1));
            pin = (100000 + (randomBytes[0] % 900000)).toString();
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
            status: 'active',
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

        console.log('Creating ambassador:', dealerData.name);
        const dealer = await base44.asServiceRole.entities.Ambassador.create(dealerData);
        // Bridge legacy dealer_id foreign keys to this ambassador.
        await base44.asServiceRole.entities.Ambassador.update(dealer.id, { legacy_dealer_id: dealer.id });
        console.log('Ambassador created with ID:', dealer.id);

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
            await base44.users.inviteUser(owner_email.toLowerCase().trim(), 'user');
            console.log('Invitation sent to dealer owner');
        } catch (inviteError) {
            console.error('Failed to send invitation:', inviteError);
        }

        // Also send a welcome email with PIN and portal URL via direct SMTP.
        // Core.SendEmail only reaches fully-registered users; a brand-new
        // ambassador may not be registered yet, so we send via SMTP directly.
        try {
            const smtpHost = Deno.env.get('SMTP_HOST');
            const smtpPort = Deno.env.get('SMTP_PORT');
            const smtpUser = Deno.env.get('SMTP_USER');
            const smtpPass = Deno.env.get('SMTP_PASS');

            if (smtpHost && smtpUser && smtpPass) {
                const nodemailer = await import('npm:nodemailer@6.9.7');
                const smtpPortNum = parseInt(smtpPort || '465');
                const transporter = nodemailer.default.createTransport({
                    host: smtpHost,
                    port: smtpPortNum,
                    secure: smtpPortNum === 465,
                    requireTLS: smtpPortNum !== 465,
                    connectionTimeout: 15000,
                    greetingTimeout: 15000,
                    socketTimeout: 15000,
                    auth: { user: smtpUser, pass: smtpPass }
                });

                const loginEmail = owner_email.toLowerCase().trim();
                const portalUrl = `https://${slug}.opentillpos.isolex.io`;
                const html = `
                    <h2>Welcome to openTILL, ${owner_name}!</h2>
                    <p>Your ambassador account for <strong>${dealer_name}</strong> has been created successfully.</p>

                    <h3>How to Log In</h3>
                    <p>Use <strong>Google Sign-In</strong> with ${loginEmail} (recommended), or the magic-link invitation email from openTILL to set your password.</p>
                    <p>Login URL: <a href="https://opentillpos.isolex.io/EmailLogin">opentillpos.isolex.io/EmailLogin</a></p>

                    <h3>Your POS Quick-Login PIN</h3>
                    <p style="font-size:28px; font-weight:bold; letter-spacing:6px; background:#f3f4f6; padding:12px 20px; border-radius:8px; display:inline-block;">${pin}</p>

                    <h3>Your Portal</h3>
                    <p><strong>Portal URL:</strong> <a href="${portalUrl}">${portalUrl}</a></p>

                    <p>Thank you for joining the openTILL Ambassador Program!</p>
                `;

                await transporter.sendMail({
                    from: `"openTILL" <${smtpUser}>`,
                    to: loginEmail,
                    subject: 'Welcome to openTILL Ambassador Program! Your Credentials Inside',
                    html,
                    text: html.replace(/<[^>]+>/g, '')
                });
                console.log('Welcome email sent via SMTP to:', loginEmail);
            } else {
                console.error('Welcome email skipped: SMTP not configured');
            }
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError.message || emailError);
        }

        // ── Auto-provision a demo merchant for the ambassador ──
        // Demo merchants have full access with no fees so the ambassador
        // can immediately explore the POS experience.
        let demoMerchant = null;
        try {
            console.log('Creating demo merchant for ambassador:', dealer.name);
            const demoMerchantData = {
                dealer_id: dealer.id,
                business_name: `${dealer_name.trim()} — Demo Store`,
                display_name: 'Demo Store',
                owner_email: owner_email.toLowerCase().trim(),
                owner_name: owner_name.trim(),
                phone: contact_phone || '',
                status: 'active',
                is_demo: true,
                onboarding_completed: true,
                total_revenue: 0,
                total_orders: 0,
                features_enabled: ['pos', 'inventory', 'reports'],
                settings: {
                    timezone: 'America/New_York',
                    currency: 'USD',
                    tax_rate: 0.08,
                },
            };

            demoMerchant = await base44.asServiceRole.entities.Merchant.create(demoMerchantData);
            console.log('Demo merchant created with ID:', demoMerchant.id);

            // Seed demo departments + products
            const departments = [
                { name: 'Appetizers', display_order: 1, color: '#f59e0b', icon: '🥟' },
                { name: 'Entrees', display_order: 2, color: '#ef4444', icon: '🍔' },
                { name: 'Sides', display_order: 3, color: '#10b981', icon: '🍟' },
                { name: 'Beverages', display_order: 4, color: '#3b82f6', icon: '🥤' },
                { name: 'Desserts', display_order: 5, color: '#ec4899', icon: '🍰' },
            ];

            const createdDepartments = [];
            for (const dept of departments) {
                const created = await base44.asServiceRole.entities.Department.create({
                    merchant_id: demoMerchant.id,
                    dealer_id: dealer.id,
                    ...dept,
                    is_active: true,
                });
                createdDepartments.push(created);
            }

            const products = [
                { name: 'Buffalo Wings', department: 'Appetizers', price: 12.99, description: 'Spicy chicken wings with ranch', image_url: 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=400', stock_quantity: 100, sku: 'APP001', ebt_eligible: false },
                { name: 'Mozzarella Sticks', department: 'Appetizers', price: 8.99, description: 'Breaded mozzarella with marinara', image_url: 'https://images.unsplash.com/photo-1531749668029-2db88e4276c7?w=400', stock_quantity: 100, sku: 'APP002', ebt_eligible: false },
                { name: 'Classic Burger', department: 'Entrees', price: 14.99, description: 'Beef patty with lettuce, tomato, onion', image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400', stock_quantity: 100, sku: 'ENT001', ebt_eligible: true },
                { name: 'Grilled Chicken Sandwich', department: 'Entrees', price: 13.99, description: 'Marinated chicken breast with veggies', image_url: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=400', stock_quantity: 100, sku: 'ENT002', ebt_eligible: true },
                { name: 'BBQ Ribs', department: 'Entrees', price: 22.99, description: 'Fall-off-the-bone tender ribs', image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400', stock_quantity: 100, sku: 'ENT003', ebt_eligible: true },
                { name: 'French Fries', department: 'Sides', price: 4.99, description: 'Crispy golden fries', image_url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400', stock_quantity: 100, sku: 'SID001', ebt_eligible: true },
                { name: 'Coleslaw', department: 'Sides', price: 3.99, description: 'Creamy cabbage slaw', image_url: 'https://images.unsplash.com/photo-1625938145312-598e9f0c90d6?w=400', stock_quantity: 100, sku: 'SID002', ebt_eligible: true },
                { name: 'Coca-Cola', department: 'Beverages', price: 2.99, description: 'Classic Coke', image_url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400', stock_quantity: 100, sku: 'BEV001', ebt_eligible: true },
                { name: 'Iced Tea', department: 'Beverages', price: 2.99, description: 'Freshly brewed iced tea', image_url: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=400', stock_quantity: 100, sku: 'BEV002', ebt_eligible: true },
                { name: 'Chocolate Cake', department: 'Desserts', price: 6.99, description: 'Rich chocolate layer cake', image_url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400', stock_quantity: 100, sku: 'DES001', ebt_eligible: false },
            ];

            for (const prod of products) {
                await base44.asServiceRole.entities.Product.create({
                    merchant_id: demoMerchant.id,
                    dealer_id: dealer.id,
                    ...prod,
                    is_active: true,
                    pos_mode: ['restaurant', 'retail', 'quick_service', 'food_truck'],
                });
            }

            console.log('Demo menu seeded for merchant:', demoMerchant.id);

            // Update ambassador merchant count
            await base44.asServiceRole.entities.Ambassador.update(dealer.id, {
                total_merchants: 1,
            });
        } catch (demoError) {
            console.error('Failed to create demo merchant (non-fatal):', demoError.message || demoError);
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
            demo_merchant: demoMerchant ? {
                id: demoMerchant.id,
                business_name: demoMerchant.business_name,
            } : null,
            credentials: {
                pin: pin,
                email: owner_email.toLowerCase().trim(),
            },
            message: 'Dealer account created successfully! A demo store has been provisioned. Check your email for login credentials.'
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