import nodemailer from 'npm:nodemailer@6.9.7';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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
        
        // If merchant_id is provided, activate existing merchant
         if (merchant_id) {
             // Update merchant status to trial and set activated_at
             if (activate) {
                 await base44.asServiceRole.entities.Merchant.update(merchant_id, {
                     status: 'trial',
                     activated_at: new Date().toISOString(),
                     trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                 });
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

        // Send confirmation email if SMTP is configured
        const smtpHost = Deno.env.get('SMTP_HOST');
        if (smtpHost) {
           try {
               const transporter = nodemailer.createTransport({
                   host: smtpHost,
                   port: parseInt(Deno.env.get('SMTP_PORT') || '587'),
                   secure: Deno.env.get('SMTP_PORT') === '465',
                   auth: {
                       user: Deno.env.get('SMTP_USER'),
                       pass: Deno.env.get('SMTP_PASS')
                   }
               });

               await transporter.sendMail({
                   from: `"openTILL" <${Deno.env.get('SMTP_USER')}>`,
                   to: owner_email.toLowerCase().trim(),
                   subject: 'Welcome to openTILL - Registration Received',
                   html: `
                       <h2>Welcome to openTILL, ${owner_name}!</h2>
                       <p>Your merchant registration has been received successfully.</p>

                       <h3>What's Next?</h3>
                       <p>Our team will review your application and activate your account within 24 hours.</p>
                       <p>You will receive an email with your login credentials once your account is ready.</p>

                       <h3>Your Registration Details:</h3>
                       <p><strong>Business Name:</strong> ${business_name}</p>
                       <p><strong>Email:</strong> ${owner_email.toLowerCase().trim()}</p>

                       <p>Thank you for choosing openTILL!</p>
                   `,
                   text: `Welcome to openTILL, ${owner_name}!\n\nYour merchant registration has been received successfully.\n\nWhat's Next?\nOur team will review your application and activate your account within 24 hours.\nYou will receive an email with your login credentials once your account is ready.\n\nYour Registration Details:\nBusiness Name: ${business_name}\nEmail: ${owner_email.toLowerCase().trim()}\n\nThank you for choosing openTILL!`
               });
           } catch (emailError) {
               console.error('Failed to send confirmation email:', emailError);
               // Don't fail registration if email fails
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