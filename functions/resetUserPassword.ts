import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import bcrypt from 'npm:bcryptjs@2.4.3';

Deno.serve(async (req) => {
    try {
        console.log('resetUserPassword: Starting...');
        
        const body = await req.json();
        const { email } = body;

        if (!email) {
            return Response.json({
                success: false,
                error: 'Email is required'
            }, { status: 400 });
        }

        // Create base44 client - asServiceRole will use service token automatically
        const base44 = createClientFromRequest(req);

        // Find user by email - use regular entities if asServiceRole fails
        let users;
        try {
            users = await base44.asServiceRole.entities.User.filter({ email: email });
        } catch (e) {
            console.log('asServiceRole failed, trying regular query:', e.message);
            users = await base44.entities.User.filter({ email: email });
        }
        
        if (!users || users.length === 0) {
            // Don't reveal if user exists or not for security
            return Response.json({
                success: true,
                message: 'If an account with this email exists, a password reset link has been sent.'
            });
        }

        const user = users[0];

        // Generate a temporary password
        const tempPassword = Math.random().toString(36).slice(-12);
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        // Update user with new password
        try {
            await base44.asServiceRole.entities.User.update(user.id, {
                password_hash: passwordHash
            });
        } catch (e) {
            console.log('asServiceRole update failed, trying regular update:', e.message);
            await base44.entities.User.update(user.id, {
                password_hash: passwordHash
            });
        }

        // Send email with temporary password
        try {
            let emailResult;
            try {
                emailResult = await base44.asServiceRole.integrations.Core.SendEmail({
                    to: user.email,
                    from_name: 'ChainLINK POS',
                    subject: 'Password Reset - ChainLINK POS',
                    body: `Hello ${user.full_name},\n\nYour temporary password is: ${tempPassword}\n\nPlease use this password to login and then change it in your account settings.\n\nYour PIN: ${user.pin || 'Not set'}\n\nYou can also login using your PIN if available.\n\nThank you,\nChainLINK POS Team`
                });
            } catch (e) {
                console.log('asServiceRole email failed, trying regular integration:', e.message);
                emailResult = await base44.integrations.Core.SendEmail({
                    to: user.email,
                    from_name: 'ChainLINK POS',
                    subject: 'Password Reset - ChainLINK POS',
                    body: `Hello ${user.full_name},\n\nYour temporary password is: ${tempPassword}\n\nPlease use this password to login and then change it in your account settings.\n\nYour PIN: ${user.pin || 'Not set'}\n\nYou can also login using your PIN if available.\n\nThank you,\nChainLINK POS Team`
                });
            }
            
            console.log('Password reset email sent to:', user.email, emailResult);
        } catch (emailError) {
            console.error('Error sending email:', emailError);
            return Response.json({
                success: false,
                error: 'Failed to send reset email. Please contact support.'
            }, { status: 500 });
        }

        return Response.json({
            success: true,
            message: 'Password reset email sent successfully'
        });

    } catch (error) {
        console.error('resetUserPassword error:', error);
        return Response.json({
            success: false,
            error: 'Failed to reset password',
            details: error.message
        }, { status: 500 });
    }
});