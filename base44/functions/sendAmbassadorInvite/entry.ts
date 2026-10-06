import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import nodemailer from 'npm:nodemailer@6.9.7';
import { verify } from 'https://deno.land/x/djwt@v2.8/mod.ts';

const JWT_SECRET = Deno.env.get('JWT_SECRET');

// Verifies a dealerToken (minted by dealerAuth) so an ambassador logged in via
// email/Google/wallet — who has NO platform User session — can still send merchant
// invite emails. This keeps the open mail relay closed: the function only ever
// sends a fixed, server-generated invite body to one validated recipient, and
// only for a caller whose dealerToken resolves to a real ambassador account.
async function verifyDealerToken(token) {
  if (!JWT_SECRET || !token) return null;
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const payload = await verify(token, key);
    if (!payload || !payload.dealer_id) return null;
    return payload;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { token, to } = body;

    // Authenticate: platform admin OR a dealerToken-bearing ambassador.
    let dealerId = null;
    let senderName = 'openTILL POS';

    let platformUser = null;
    try { platformUser = await base44.auth.me(); } catch { platformUser = null; }

    const isPlatformAdmin = platformUser && ['admin', 'root_admin', 'super_admin'].includes(platformUser.role);

    if (isPlatformAdmin) {
      // Admins may send invites for any dealer_id they pass in.
      dealerId = body.dealer_id || platformUser.dealer_id || null;
    } else {
      // Ambassador: verify the dealerToken and resolve the ambassador record.
      const payload = await verifyDealerToken(token);
      if (!payload) {
        return Response.json({ success: false, error: 'Authentication required' }, { status: 401 });
      }
      const ambassadors = await base44.asServiceRole.entities.Ambassador.filter({ legacy_dealer_id: payload.dealer_id });
      if (!ambassadors || ambassadors.length === 0) {
        return Response.json({ success: false, error: 'Ambassador account not found' }, { status: 404 });
      }
      const ambassador = ambassadors[0];
      if (ambassador.status !== 'active' && ambassador.status !== 'trial') {
        return Response.json({ success: false, error: 'Your ambassador account is not active.' }, { status: 403 });
      }
      dealerId = ambassador.legacy_dealer_id || ambassador.id;
      senderName = ambassador.name || 'openTILL POS';
    }

    if (!dealerId) {
      return Response.json({ success: false, error: 'Could not determine dealer account' }, { status: 400 });
    }

    // Validate the recipient address (single, well-formed, no header injection).
    const toStr = String(to || '').trim();
    if (!toStr || /[\r\n,;]/.test(toStr) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toStr)) {
      return Response.json({ success: false, error: 'A valid recipient email is required' }, { status: 400 });
    }

    // Build the invite link server-side so the caller can't inject a phishing URL.
    const origin = (req.headers.get('origin') || req.headers.get('referer') || 'https://opentill.base44.app').replace(/\/$/, '');
    const inviteLink = `${origin}/Home?dealer_id=${encodeURIComponent(dealerId)}`;

    const subject = `You're invited to join ${senderName} on openTILL POS`;
    const textBody = `Hi,

You're invited to sign up for openTILL POS and join ${senderName}'s merchant network.

Click the link below to learn more and get started:
${inviteLink}

This link will automatically associate your account with their network.

Best regards,
${senderName}`;

    const htmlBody = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#0a0a0a;">
      <h2 style="color:#2563eb;">You're invited to join ${senderName}</h2>
      <p>You've been invited to sign up for openTILL POS and join ${senderName}'s merchant network.</p>
      <p style="margin:24px 0;">
        <a href="${inviteLink}" style="background:#2563eb;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">Get Started</a>
      </p>
      <p style="font-size:13px;color:#737373;">Or copy this link: ${inviteLink}</p>
      <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0;">
      <p style="font-size:13px;color:#737373;">Best regards,<br/>${senderName}</p>
    </div>`;

    // An invitation is successful only when the configured mail provider
    // accepts this recipient. Do not hide sender-login failures with a fallback.
    const smtpHost = Deno.env.get('SMTP_HOST');
    const smtpUser = Deno.env.get('SMTP_USER');
    const smtpPass = Deno.env.get('SMTP_PASS');
    if (!smtpHost || !smtpUser || !smtpPass) {
      return Response.json({ success: false, error: 'The sender mailbox is not configured. No invitation was sent.' }, { status: 503 });
    }
    const smtpPortNum = parseInt(Deno.env.get('SMTP_PORT') || '465');
    const transporter = nodemailer.createTransport({
      host: smtpHost, port: smtpPortNum,
      secure: smtpPortNum === 465, requireTLS: smtpPortNum !== 465,
      connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 15000,
      auth: { user: smtpUser, pass: smtpPass }
    });
    let info;
    try {
      info = await transporter.sendMail({
        from: { name: senderName, address: smtpUser },
        to: toStr, subject, text: textBody, html: htmlBody
      });
    } catch (error) {
      console.error('Invitation mail provider failure:', error.code, error.responseCode);
      const authenticationFailed = error.code === 'EAUTH' || error.responseCode === 535;
      return Response.json({
        success: false,
        error: authenticationFailed
          ? 'Your email provider rejected the sender login (535). Update the sender mailbox username and password before retrying. No invitation was sent.'
          : `The email provider could not accept the invitation${error.responseCode ? ` (${error.responseCode})` : ''}. No invitation was sent.`
      }, { status: 502 });
    } finally {
      transporter.close();
    }
    const accepted = (info.accepted || []).some(address => String(address).toLowerCase() === toStr.toLowerCase());
    if (!accepted || (info.rejected || []).length) {
      return Response.json({ success: false, error: 'The email provider rejected the recipient. No invitation was sent.' }, { status: 502 });
    }
    console.log('Ambassador invitation accepted by mail server:', info.messageId);
    return Response.json({ success: true, via: 'smtp', delivery_status: 'server_accepted', messageId: info.messageId, recipient: toStr });
  } catch (error) {
    console.error('sendAmbassadorInvite error:', error);
    return Response.json({ success: false, error: error.message || 'Failed to send invitation' }, { status: 500 });
  }
});