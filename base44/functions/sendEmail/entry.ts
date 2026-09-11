import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import nodemailer from 'npm:nodemailer@6.9.7';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verify user is authenticated
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { to, subject, html, text } = body;

        if (!to || !subject || (!html && !text)) {
            return Response.json({
                success: false,
                error: 'Missing required fields: to, subject, and html or text'
            }, { status: 400 });
        }

        // SECURITY (open mail relay): prevent the function from being used as
        // a platform-branded phishing relay. Platform admins may send fully
        // controlled HTML to any address for legitimate admin/invite comms.
        // Non-admin users (including ambassadors) may only send plain-text
        // bodies — this preserves the merchant/ambassador invite flow (which
        // uses text) while neutralizing the attacker-controlled HTML vector.
        // Non-admins without a dealer scope may only send to their own address.
        const isAdmin = user.role === 'admin' || user.role === 'root_admin' || user.role === 'super_admin';
        const isAmbassador = !!(user.data && user.data.dealer_id);
        const normalizedTo = String(to).trim().toLowerCase();
        const selfEmail = String(user.email || '').trim().toLowerCase();

        // Reject header injection / multiple recipients / malformed addresses
        const toStr = String(to).trim();
        if (/[\r\n,;]/.test(toStr) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toStr)) {
            return Response.json({
                success: false,
                error: 'Invalid recipient address'
            }, { status: 400 });
        }

        if (!isAdmin) {
            // Non-admins cannot send attacker-controlled HTML bodies
            if (html) {
                return Response.json({
                    success: false,
                    error: 'HTML email bodies are restricted to administrators'
                }, { status: 403 });
            }
            // Non-admins (including ambassadors) may only email themselves,
            // closing the open mail relay via dealer scope.
            if (normalizedTo !== selfEmail) {
                return Response.json({
                    success: false,
                    error: 'You may only send emails to your own registered address'
                }, { status: 403 });
            }
        }

        // Verify SMTP credentials are configured
        const smtpHost = Deno.env.get('SMTP_HOST');
        const smtpUser = Deno.env.get('SMTP_USER');
        const smtpPass = Deno.env.get('SMTP_PASS');

        if (!smtpHost || !smtpUser || !smtpPass) {
            return Response.json({
                success: false,
                error: 'Email service not configured. Please contact administrator.'
            }, { status: 503 });
        }

        // Create transporter with SMTP credentials from environment
        const smtpPortNum = parseInt(Deno.env.get('SMTP_PORT') || '465');
        const transporter = nodemailer.createTransport({
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

        // Send via SMTP. Fall back to the platform email service
        // (Core.SendEmail) if SMTP fails, mirroring activateMerchant /
        // manageLead so admin/invite comms still go out when SMTP is
        // unavailable. Core.SendEmail reaches registered users always;
        // unregistered recipients require a paid plan + custom domain.
        let smtpError = null;
        try {
            const info = await transporter.sendMail({
                from: `"openTILL POS" <${smtpUser}>`,
                to: to,
                subject: subject,
                text: text || (html ? html.replace(/<[^>]+>/g, '') : undefined),
                html: html
            });
            console.log('Email sent via SMTP:', info.messageId);
            return Response.json({ success: true, messageId: info.messageId, via: 'smtp' });
        } catch (err) {
            smtpError = err;
            console.error('SMTP send failed, falling back to Core.SendEmail:', err);
        }

        try {
            await base44.asServiceRole.integrations.Core.SendEmail({
                to,
                subject,
                html: html || text,
                text: text || (html ? html.replace(/<[^>]+>/g, '') : undefined)
            });
            console.log('Email sent via Core.SendEmail to:', to);
            return Response.json({ success: true, via: 'core', smtpError: smtpError?.message });
        } catch (coreError) {
            console.error('Core.SendEmail also failed:', coreError);
            return Response.json({
                success: false,
                error: (smtpError?.message || 'SMTP failed') + ' | ' + (coreError.message || 'Core email failed')
            }, { status: 500 });
        }

    } catch (error) {
        console.error('sendEmail ERROR:', error);
        return Response.json({
            success: false,
            error: error.message || 'Failed to send email'
        }, { status: 500 });
    }
});