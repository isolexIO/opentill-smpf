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
            temp_password
        } = body;

        const base44 = createClientFromRequest(req);
        
        // If merchant_id is provided, activate existing merchant
        if (merchant_id) {
            // Check if user already exists
            let users = await base44.asServiceRole.entities.User.filter({ 
                email: owner_email.toLowerCase().trim() 
            });
            
            if (users && users.length > 0) {
                // Update existing user (without pin - will be set separately)
                const user = users[0];
                await base44.asServiceRole.entities.User.update(user.id, {
                    merchant_id: merchant_id,
                    dealer_id: dealer_id || null,
                    is_active: true,
                    full_name: owner_name,
                    role: 'merchant_admin',
                    permissions: [
                        'process_orders',
                        'manage_inventory',
                        'manage_customers',
                        'view_reports',
                        'manage_users',
                        'manage_settings',
                        'admin_settings',
                        'access_marketplace',
                        'submit_tickets'
                    ]
                });
            } else {
                // Create new user (without pin - will be set separately)
                await base44.asServiceRole.entities.User.create({
                    full_name: owner_name.trim(),
                    email: owner_email.toLowerCase().trim(),
                    role: 'merchant_admin',
                    merchant_id: merchant_id,
                    dealer_id: dealer_id || null,
                    is_active: true,
                    permissions: [
                        'process_orders',
                        'manage_inventory',
                        'manage_customers',
                        'view_reports',
                        'manage_users',
                        'manage_settings',
                        'admin_settings',
                        'access_marketplace',
                        'submit_tickets'
                    ]
                });
            }
            
            // Status is already updated before this function is called by Super Admin
            // This function only creates the user account now
            
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

        // Create merchant - always start as INACTIVE until Super Admin manually activates
        const merchant = await base44.asServiceRole.entities.Merchant.create({
            business_name: business_name.trim(),
            display_name: business_name.trim(),
            owner_name: owner_name.trim(),
            owner_email: owner_email.toLowerCase().trim(),
            phone: phone || '',
            address: address || '',
            dealer_id: dealer_id || null,
            status: 'inactive',
            trial_ends_at: null,
            subscription_plan: 'free',
            onboarding_completed: false,
            total_revenue: 0,
            total_orders: 0,
            settings: {
                timezone: 'America/New_York',
                currency: 'USD',
                tax_rate: 0.08,
                demo_data_requested: setup_demo_data || false
            }
        });

        // Send confirmation email
        try {
            const transporter = nodemailer.createTransport({
                host: Deno.env.get('SMTP_HOST'),
                port: parseInt(Deno.env.get('SMTP_PORT') || '587'),
                secure: Deno.env.get('SMTP_PORT') === '465',
                auth: {
                    user: Deno.env.get('SMTP_USER'),
                    pass: Deno.env.get('SMTP_PASSWORD')
                }
            });

            await transporter.sendMail({
                from: `"${Deno.env.get('SMTP_FROM_NAME')}" <${Deno.env.get('SMTP_FROM_EMAIL')}>`,
                to: owner_email.toLowerCase().trim(),
                subject: 'Welcome to ChainLINK POS - Registration Received',
                html: `
                    <h2>Welcome to ChainLINK POS, ${owner_name}!</h2>
                    <p>Your merchant registration has been received successfully.</p>
                    
                    <h3>What's Next?</h3>
                    <p>Our team will review your application and activate your account within 24 hours.</p>
                    <p>You will receive an email with your login credentials once your account is ready.</p>
                    
                    <h3>Your Registration Details:</h3>
                    <p><strong>Business Name:</strong> ${business_name}</p>
                    <p><strong>Email:</strong> ${owner_email.toLowerCase().trim()}</p>
                    
                    <p>Thank you for choosing ChainLINK POS!</p>
                `,
                text: `Welcome to ChainLINK POS, ${owner_name}!\n\nYour merchant registration has been received successfully.\n\nWhat's Next?\nOur team will review your application and activate your account within 24 hours.\nYou will receive an email with your login credentials once your account is ready.\n\nYour Registration Details:\nBusiness Name: ${business_name}\nEmail: ${owner_email.toLowerCase().trim()}\n\nThank you for choosing ChainLINK POS!`
            });
        } catch (emailError) {
            console.error('Failed to send confirmation email:', emailError);
            // Don't fail registration if email fails
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