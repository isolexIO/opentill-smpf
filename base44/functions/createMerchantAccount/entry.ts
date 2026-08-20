import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Escape user-controlled text for safe interpolation into HTML email bodies.
const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

Deno.serve(async (req) => {
    try {
        const body = await req.json();
        
        const {
            merchant_id,
            business_name,
            owner_name,
            owner_email,
            phone,
            address,
            dealer_id,
            setup_demo_data,
            pin,
            temp_password,
            activate,
            referral_code,
            wallet_address
        } = body;

        const base44 = createClientFromRequest(req);

        // Resolve the caller once. The public self-registration path is
        // unauthenticated; admin-only actions (activation, email dispatch)
        // require an authenticated administrator below.
        let currentUser = null;
        try {
            currentUser = await base44.auth.me();
        } catch (e) {
            currentUser = null;
        }
        const isAdmin = !!currentUser && currentUser.role === 'admin';

        // SECURITY: The activation path is admin-only. Public self-registration
        // must never be able to activate an arbitrary existing merchant_id,
        // which would bypass admin approval controls. Use /functions/activateMerchant
        // for activations.
        if (merchant_id) {
            console.log('createMerchantAccount: merchant_id path', { merchant_id, isAdmin, hasPin: !!pin, activate });
            if (!isAdmin) {
                return Response.json({
                    success: false,
                    error: 'Forbidden: activation requires administrator access'
                }, { status: 403 });
            }

            // Look up the merchant so we can create a proper admin user
            const existingMerchant = await base44.asServiceRole.entities.Merchant.get(merchant_id);
            if (!existingMerchant) {
                return Response.json({
                    success: false,
                    error: 'Merchant not found'
                }, { status: 404 });
            }

            if (activate) {
                await base44.asServiceRole.entities.Merchant.update(merchant_id, {
                    status: 'active',
                    activated_at: new Date().toISOString(),
                    trial_ends_at: null
                });
            }

            // Create the merchant admin user with the generated PIN so they
            // can log in via PinLogin. Skip if a user already exists for this
            // merchant + email.
            if (pin) {
                const userEmail = (owner_email || existingMerchant.owner_email).toLowerCase().trim();
                const existingUsers = await base44.asServiceRole.entities.User.filter({
                    merchant_id: merchant_id,
                    email: userEmail
                });

                if (!existingUsers || existingUsers.length === 0) {
                    // Ensure the PIN is unique across all users
                    let uniquePin = pin;
                    const pinInUse = await base44.asServiceRole.entities.User.filter({ pin: uniquePin });
                    if (pinInUse && pinInUse.length > 0) {
                        const randomBytes = crypto.getRandomValues(new Uint32Array(1));
                        uniquePin = (100000 + (randomBytes[0] % 900000)).toString();
                    }

                    try {
                        const newUser = await base44.asServiceRole.entities.User.create({
                            full_name: (owner_name || existingMerchant.owner_name || 'Merchant Admin').trim(),
                            email: userEmail,
                            role: 'admin',
                            merchant_id: merchant_id,
                            dealer_id: existingMerchant.dealer_id || null,
                            pin: uniquePin,
                            temp_password: temp_password || null,
                            is_active: true,
                            permissions: [
                                'manage_products',
                                'manage_inventory',
                                'manage_orders',
                                'view_reports',
                                'manage_settings',
                                'process_refunds',
                                'submit_tickets'
                            ]
                        });
                        console.log('Merchant admin user created:', newUser?.id, 'for email:', userEmail);
                    } catch (userCreateError) {
                        console.error('Failed to create merchant admin user:', userCreateError?.message || userCreateError, userCreateError?.status, JSON.stringify(userCreateError?.data || {}));
                    }


                }
            }

            return Response.json({
                success: true,
                merchant_id: merchant_id
            });
        }

        // Otherwise, create new merchant (original flow)
        if (!business_name || !owner_name || !owner_email) {
            return Response.json({
                success: false,
                error: 'Business name, owner name, and email are required'
            }, { status: 400 });
        }

        // Check if merchant already exists
        const existingMerchants = await base44.asServiceRole.entities.Merchant.filter({ 
            owner_email: owner_email.toLowerCase().trim() 
        });
        
        if (existingMerchants && existingMerchants.length > 0) {
            return Response.json({
                success: false,
                error: 'A merchant account with this email already exists'
            }, { status: 400 });
        }

        // Handle referral code if provided
        let referrerMerchant = null;
        if (referral_code) {
            const referrers = await base44.asServiceRole.entities.Merchant.filter({
                referral_code: referral_code.toUpperCase().trim()
            });
            if (referrers && referrers.length > 0) {
                referrerMerchant = referrers[0];
            }
        }

        // Create merchant - always start as INACTIVE until Super Admin manually activates
        const merchant = await base44.asServiceRole.entities.Merchant.create({
            business_name: business_name.trim(),
            display_name: business_name.trim(),
            owner_name: owner_name.trim(),
            owner_email: owner_email.toLowerCase().trim(),
            phone: phone || '',
            address: address || '',
            dealer_id: dealer_id || null,
            wallet_address: wallet_address || null,
            status: 'inactive',
            trial_ends_at: null,
            subscription_plan: 'free',
            onboarding_completed: false,
            total_revenue: 0,
            total_orders: 0,
            referred_by_code: referral_code ? referral_code.toUpperCase().trim() : null,
            features_enabled: ['pos', 'solana_pay'],
            settings: {
                timezone: 'America/New_York',
                currency: 'USD',
                tax_rate: 0.08,
                demo_data_requested: setup_demo_data || false
            }
        });

        // Create referral record if valid referral code was used
        if (referrerMerchant) {
            await base44.asServiceRole.entities.MerchantReferral.create({
                referrer_merchant_id: referrerMerchant.id,
                referrer_name: referrerMerchant.business_name,
                referred_merchant_id: merchant.id,
                referred_name: merchant.business_name,
                referral_code: referral_code.toUpperCase().trim(),
                status: 'pending'
            });
        }

        // SECURITY: Only send the confirmation email when an authenticated admin
        // is creating the merchant. The public self-registration path is
        // unauthenticated, so sending email to a caller-supplied, unverified
        // address would let anonymous attackers abuse the platform as an open
        // mail relay. Public registrants are notified later, once an admin
        // reviews and activates their account.
        if (isAdmin) {
            try {
                await base44.asServiceRole.integrations.Core.SendEmail({
                    to: owner_email.toLowerCase().trim(),
                    subject: 'Welcome to openTILL — Application Received',
                    body: `
                        <h2>Welcome to openTILL, ${escapeHtml(owner_name)}!</h2>
                        <p>Your merchant application for <strong>${escapeHtml(business_name)}</strong> has been received successfully.</p>
                        <p>Our team will review your application and activate your account within 24 hours. You will receive a follow-up email once your account is active.</p>
                        <p>Once activated, you can log in at: <a href="https://chainlinkpos.isolex.io/EmailLogin">chainlinkpos.isolex.io/EmailLogin</a></p>
                        <p>Thank you for choosing openTILL!</p>
                    `
                });
                console.log('Welcome email sent to merchant owner:', owner_email);
            } catch (emailError) {
                console.error('Failed to send welcome email:', emailError);
            }
        }

        return Response.json({
            success: true,
            merchant: {
                id: merchant.id,
                business_name: merchant.business_name
            }
        });

    } catch (error) {
        console.error('createMerchantAccount ERROR:', error);
        
        return Response.json({
            success: false,
            error: error.message || 'Failed to submit registration'
        }, { status: 500 });
    }
});