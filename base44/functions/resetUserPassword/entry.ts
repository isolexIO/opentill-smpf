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

        // Generate a cryptographically secure temporary password
        const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
        const randomBytes = crypto.getRandomValues(new Uint8Array(16));
        let tempPassword = '';
        for (let i = 0; i < 16; i++) {
            tempPassword += charset[randomBytes[i] % charset.length];
        }
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
            
            const smtpPortNum = parseInt(smtpPort);
            const transporter = nodemailer.default.createTransport({
                host: smtpHost,
                port: smtpPortNum,
                secure: smtpPortNum === 465,
                requireTLS: smtpPortNum !== 465,
                connectionTimeout: 15000,
                greetingTimeout: 15000,
                socketTimeout: 15000,
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
openTILL SMPF Team`;

            await transporter.sendMail({
                from: `"openTILL" <${smtpUser}>`,
                to: user.email,
                subject: 'Password Reset - openTILL',
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