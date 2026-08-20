import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import bcrypt from 'npm:bcryptjs@2.4.3';

// In-memory rate limiting to prevent email bombing (an attacker spamming reset
// emails to arbitrary addresses). Two buckets: per-IP and per-email, so an
// attacker rotating IPs cannot flood a single inbox and a single IP cannot
// enumerate many addresses.
const ipAttemptMap = new Map();
const emailAttemptMap = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const IP_RATE_LIMIT = 3;       // max reset requests per IP per window
const EMAIL_RATE_LIMIT = 2;    // max reset requests per email per window

function checkRateLimit(key, map, limit) {
  const now = Date.now();
  const attempts = (map.get(key) || []).filter((ts) => now - ts < RATE_LIMIT_WINDOW);
  if (attempts.length >= limit) {
    map.set(key, attempts);
    return false;
  }
  attempts.push(now);
  map.set(key, attempts);
  return true;
}

Deno.serve(async (req) => {
  try {
        console.log('resetUserPassword: Starting...');

        let body;
        try {
          body = await req.json();
        } catch (e) {
          // Body may be empty if the request was sent without a JSON payload
          // (e.g. a GET request or a redirect). Fall back to URL query params.
          const url = new URL(req.url);
          body = { email: url.searchParams.get('email') };
        }
        const { email } = body;

        if (!email) {
            return Response.json({
                success: false,
                error: 'Email is required'
            }, { status: 400 });
        }

        // Rate limit by IP and by email to prevent email bombing
        const ipAddress = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
                          req.headers.get('x-real-ip') || 'unknown';
        const normalizedEmail = email.toLowerCase().trim();
        if (!checkRateLimit(`ip:${ipAddress}`, ipAttemptMap, IP_RATE_LIMIT) ||
            !checkRateLimit(`email:${normalizedEmail}`, emailAttemptMap, EMAIL_RATE_LIMIT)) {
            return Response.json({
                success: false,
                error: 'Too many password reset requests. Please try again later.'
            }, { status: 429 });
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
            // No User record — check the Merchant entity (merchant admins
            // activated before accepting their platform invite have no User
            // record yet; their temp_password lives on the Merchant).
            const merchants = await base44.asServiceRole.entities.Merchant.filter({ owner_email: email });
            const merchant = merchants?.[0];
            if (!merchant) {
                return Response.json({
                    success: true,
                    message: 'If an account with this email exists, a password reset link has been sent.'
                });
            }

            // Generate a single-use, expiring reset token (same scheme as User).
            const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
            const token = btoa(String.fromCharCode(...tokenBytes))
                .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            const exp = Date.now() + 60 * 60 * 1000; // 1 hour
            const resetValue = `${token}.${exp}`;
            const resetTokenHash = bcrypt.hashSync(resetValue, 10);

            await base44.asServiceRole.entities.Merchant.update(merchant.id, {
                temp_password: resetTokenHash
            });

            const origin = new URL(req.url).origin;
            const resetLink = `${origin}/ResetPassword?email=${encodeURIComponent(merchant.owner_email)}&token=${encodeURIComponent(token)}&exp=${exp}`;

            try {
                const smtpHost = Deno.env.get('SMTP_HOST');
                const smtpPort = Deno.env.get('SMTP_PORT');
                const smtpUser = Deno.env.get('SMTP_USER');
                const smtpPass = Deno.env.get('SMTP_PASS');
                if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
                    throw new Error('SMTP configuration is incomplete.');
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
                    auth: { user: smtpUser, pass: smtpPass }
                });
                const emailBody = `Hello ${merchant.owner_name || 'Merchant Admin'},\n\nWe received a request to reset the password for your openTILL account.\n\nClick the link below to choose a new password. This link expires in 1 hour and can only be used once:\n\n${resetLink}\n\nIf you did not request a password reset, you can safely ignore this email — your password has not been changed.\n\nThank you,\nopenTILL SMPF Team`;
                await transporter.sendMail({
                    from: `"openTILL" <${smtpUser}>`,
                    to: merchant.owner_email,
                    subject: 'Password Reset - openTILL',
                    text: emailBody,
                    html: emailBody.replace(/\n/g, '<br>')
                });
                console.log('Password reset email sent to merchant:', merchant.owner_email);
            } catch (emailError) {
                console.error('Error sending merchant reset email:', emailError);
                return Response.json({
                    success: false,
                    error: 'Failed to send reset email. Please contact support.'
                }, { status: 500 });
            }

            return Response.json({ success: true, message: 'Password reset email sent successfully' });
        }

        const user = users[0];

        // SECURITY: Do NOT send credentials in cleartext. Generate a single-use,
        // expiring reset token. Its bcrypt hash is stored in temp_password; the
        // plaintext token is only delivered to the user via a reset link in the
        // email. completePasswordReset verifies the token and lets the user set
        // a new password, overwriting temp_password (single-use).
        const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
        const token = btoa(String.fromCharCode(...tokenBytes))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const exp = Date.now() + 60 * 60 * 1000; // 1 hour
        const resetValue = `${token}.${exp}`;
        const resetTokenHash = bcrypt.hashSync(resetValue, 10);

        try {
            await base44.asServiceRole.entities.User.update(user.id, {
                temp_password: resetTokenHash
            });
        } catch (e) {
            console.log('asServiceRole update failed, trying regular update:', e.message);
            await base44.entities.User.update(user.id, {
                temp_password: resetTokenHash
            });
        }

        const origin = new URL(req.url).origin;
        const resetLink = `${origin}/ResetPassword?email=${encodeURIComponent(user.email)}&token=${encodeURIComponent(token)}&exp=${exp}`;

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
                secure: true,
                connectionTimeout: 15000,
                greetingTimeout: 15000,
                socketTimeout: 15000,
                auth: {
                    user: smtpUser,
                    pass: smtpPass
                }
            });

            const emailBody = `Hello ${user.full_name},

We received a request to reset the password for your openTILL account.

Click the link below to choose a new password. This link expires in 1 hour and can only be used once:

${resetLink}

If you did not request a password reset, you can safely ignore this email — your password has not been changed.

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