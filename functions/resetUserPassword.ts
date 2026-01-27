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

        // Send email with temporary password using custom SMTP
        try {
            const smtpHost = Deno.env.get('SMTP_HOST');
            const smtpPort = Deno.env.get('SMTP_PORT');
            const smtpUser = Deno.env.get('SMTP_USER');
            const smtpPass = Deno.env.get('SMTP_PASS');

            if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
                throw new Error('SMTP configuration is incomplete. Contact administrator.');
            }

            const nodemailer = await import('npm:nodemailer@6.9.7');
            
            const transporter = nodemailer.default.createTransport({
                host: smtpHost,
                port: parseInt(smtpPort),
                secure: true,
                auth: {
                    user: smtpUser,
                    pass: smtpPass
                }
            });

            const emailBody = `Hello ${user.full_name},

Your password has been reset successfully.

⚠️ SECURITY NOTICE:
This email contains sensitive credentials. Please:
- Delete this email after saving your credentials securely
- Change your password immediately after login
- Do not share these credentials with anyone

TEMPORARY PASSWORD: ${tempPassword}

${user.pin ? `Your PIN: ${user.pin} (Use for quick login)` : 'PIN: Not set'}

Please login and change your password immediately in Account Settings.

If you did not request this password reset, please contact support immediately.

Thank you,
ChainLINK POS Team`;

            await transporter.sendMail({
                from: `"ChainLINK POS" <${smtpUser}>`,
                to: user.email,
                subject: 'Password Reset - ChainLINK POS',
                text: emailBody,
                html: emailBody.replace(/\n/g, '<br>')
            });
            
            console.log('Password reset email sent to:', user.email);
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