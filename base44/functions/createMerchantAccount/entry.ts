import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Escape user-controlled text for safe interpolation into HTML email bodies.
const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Brochure-themed email wrapper (deep-space gradient + glowing white glass card).
const brandedEmail = (innerHtml) => `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0618;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0618;padding:40px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(123,47,214,0.28);">
<tr><td style="height:6px;background:linear-gradient(90deg,#7B2FD6 0%,#0FD17A 100%);font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:44px 48px 20px 48px;text-align:center;">
<img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6970e2871534100b4ebb8d45/8e45f76fe_DUC3.png" alt="openTILL" width="64" height="64" style="display:block;margin:0 auto 16px auto;border-radius:16px;box-shadow:0 0 24px rgba(123,47,214,0.45);" />
<h1 style="margin:0;font-size:26px;font-weight:800;color:#18181b;letter-spacing:-0.5px;">openTILL <span style="color:#7B2FD6;">SMPF</span></h1>
<p style="margin:8px 0 0 0;font-size:12px;color:#71717a;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">Structured Merchant Participation Framework</p>
</td></tr>
<tr><td style="padding:8px 48px 40px 48px;">${innerHtml}</td></tr>
<tr><td style="padding:28px 48px;background:#fafafa;border-top:1px solid #e4e4e7;">
<p style="margin:0 0 8px 0;font-size:13px;color:#52525b;line-height:1.6;"><strong style="color:#18181b;">openTILL SMPF</strong> — The blockchain-integrated Point of Sale for modern commerce.</p>
<p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.6;">&copy; ${new Date().getFullYear()} Isolex Corporation. All rights reserved.<br>This is an automated message — please do not reply directly to this email.</p>
</td></tr>
<tr><td style="height:6px;background:linear-gradient(90deg,#0FD17A 0%,#7B2FD6 100%);font-size:0;line-height:0;">&nbsp;</td></tr>
</table></td></tr></table></body></html>`;

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
        let referrerCustomer = null;
        if (referral_code) {
            const referrers = await base44.asServiceRole.entities.Merchant.filter({
                referral_code: referral_code.toUpperCase().trim()
            });
            if (referrers && referrers.length > 0) {
                referrerMerchant = referrers[0];
            } else {
                // No merchant matched — check if this is a customer's personal
                // referral code, so the customer (not a merchant) gets credited.
                const customers = await base44.asServiceRole.entities.Customer.filter({
                    referral_code: referral_code.toUpperCase().trim()
                });
                if (customers && customers.length > 0) {
                    referrerCustomer = customers[0];
                }
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

        // If the referral code belonged to a customer, create a pending
        // customer→merchant referral link. The customer earns $DUC once this
        // merchant processes $100 via openTILL Payments.
        if (referrerCustomer) {
            await base44.asServiceRole.entities.CustomerMerchantLink.create({
                customer_id: referrerCustomer.id,
                customer_phone: referrerCustomer.phone || null,
                merchant_id: merchant.id,
                merchant_name: merchant.business_name,
                dealer_id: merchant.dealer_id || null,
                link_type: 'referred',
                referral_status: 'pending',
                added_at: new Date().toISOString()
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
                    body: brandedEmail(`
                        <p style="margin:0 0 8px 0;font-size:14px;color:#71717a;">Welcome to openTILL,</p>
                        <h2 style="margin:0 0 20px 0;font-size:22px;font-weight:700;color:#18181b;">${escapeHtml(owner_name)}!</h2>
                        <p style="margin:0 0 16px 0;font-size:16px;color:#3f3f46;line-height:1.7;">
                            Your merchant application for <strong style="color:#7B2FD6;">${escapeHtml(business_name)}</strong> has been received successfully.
                        </p>
                        <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:16px 20px;margin:24px 0;">
                            <p style="margin:0;font-size:14px;color:#065f46;">
                                <strong>&#9989; Application Received</strong><br>
                                <span style="font-size:13px;color:#047857;">Our team will review your application and activate your account within 24 hours.</span>
                            </p>
                        </div>
                        <p style="margin:0 0 16px 0;font-size:15px;color:#3f3f46;line-height:1.7;">
                            Once activated, you'll receive a follow-up email with your login credentials and can sign in at:
                        </p>
                        <div style="text-align:center;margin:32px 0;">
                            <a href="https://chainlinkpos.isolex.io/EmailLogin" style="display:inline-block;padding:14px 40px;background:linear-gradient(90deg,#7B2FD6 0%,#0FD17A 100%);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:10px;box-shadow:0 4px 16px rgba(123,47,214,0.35);">Go to Login &rarr;</a>
                        </div>
                        <p style="margin:24px 0 0 0;font-size:14px;color:#52525b;line-height:1.7;">
                            Thank you for choosing openTILL!<br>
                            <strong style="color:#7B2FD6;">The openTILL SMPF Team</strong>
                        </p>
                    `)
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