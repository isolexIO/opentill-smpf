import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import bcrypt from 'npm:bcryptjs@2.4.3';

Deno.serve(async (req) => {
    try {
        console.log('emailPasswordLogin: Starting...');
        
        const body = await req.json();
        const { email, password } = body;

        if (!email || !password) {
            return Response.json({
                success: false,
                error: 'Email and password are required'
            }, { status: 400 });
        }

        const base44 = createClientFromRequest(req);

        // Find user by email
        const users = await base44.asServiceRole.entities.User.filter({ email: email });
        
        if (!users || users.length === 0) {
            return Response.json({
                success: false,
                error: 'Invalid email or password'
            }, { status: 401 });
        }

        const user = users[0];

        // Check if user has a password hash
        if (!user.password_hash) {
            return Response.json({
                success: false,
                error: 'Password not set up for this account. Please use the "Forgot Password" link below to set up your password, or use PIN login.'
            }, { status: 401 });
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        
        if (!passwordMatch) {
            return Response.json({
                success: false,
                error: 'Invalid email or password'
            }, { status: 401 });
        }

        // Check if user is active
        if (!user.is_active) {
            return Response.json({
                success: false,
                error: 'Your account is inactive. Please contact support.'
            }, { status: 403 });
        }

        // Update last login
        try {
            await base44.asServiceRole.entities.User.update(user.id, {
                last_login: new Date().toISOString()
            });
        } catch (updateError) {
            console.warn('Could not update last login:', updateError);
        }

        // Log the login
        try {
            await base44.asServiceRole.entities.SystemLog.create({
                merchant_id: user.merchant_id || null,
                log_type: 'merchant_action',
                action: 'User Email Login',
                description: `User ${user.full_name} logged in via email`,
                user_id: user.id,
                user_email: user.email,
                user_role: user.role,
                severity: 'info'
            });
        } catch (logError) {
            console.warn('Could not create log:', logError);
        }

        console.log('Login successful for user:', user.email);

        return Response.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                merchant_id: user.merchant_id,
                dealer_id: user.dealer_id,
                permissions: user.permissions,
                is_active: user.is_active
            }
        });

    } catch (error) {
        console.error('emailPasswordLogin error:', error);
        return Response.json({
            success: false,
            error: 'Login failed',
            details: error.message
        }, { status: 500 });
    }
});