import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { verify } from 'https://deno.land/x/djwt@v2.8/mod.ts';

const JWT_SECRET = Deno.env.get('JWT_SECRET');

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

// Send via SMTP directly so emails reach leads who may not be registered Base44
// users (Core.SendEmail has per-recipient daily limits). Falls back to
// Core.SendEmail if SMTP is not configured.
const sendEmail = async (base44, to, subject, htmlBody) => {
  const html = brandedEmail(htmlBody);
  const smtpHost = Deno.env.get('SMTP_HOST');
  const smtpPort = Deno.env.get('SMTP_PORT');
  const smtpUser = Deno.env.get('SMTP_USER');
  const smtpPass = Deno.env.get('SMTP_PASS');

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const nodemailer = await import('npm:nodemailer@6.9.7');
      const smtpPortNum = parseInt(smtpPort || '465');
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
      await transporter.sendMail({
        from: `"openTILL SMPF" <${smtpUser}>`,
        to,
        subject,
        html,
        text: html.replace(/<[^>]+>/g, '')
      });
      console.log(`Email sent via SMTP to ${to}: ${subject}`);
      return;
    } catch (smtpError) {
      console.error(`SMTP send failed for ${to}, falling back to Core.SendEmail:`, smtpError);
    }
  }

  // Fallback: Core.SendEmail
  await base44.asServiceRole.integrations.Core.SendEmail({ to, subject, body: html });
};

async function verifyToken(token) {
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    return await verify(token, key);
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { action, token, dealer_id, lead_data, lead_id, note, appointment, invite_link } = body;

    const base44 = createClientFromRequest(req);

    // Resolve dealer_id from a verified identity only — never trust the
    // client-supplied `dealer_id` directly (would allow cross-dealer access).
    let resolvedDealerId;
    let authorEmail = 'Admin';
    let isAdmin = false;

    if (token) {
      const payload = await verifyToken(token);
      if (!payload) {
        return Response.json({ success: false, error: 'Invalid or expired token' }, { status: 401 });
      }
      resolvedDealerId = payload.dealer_id;
      authorEmail = payload.email || 'Ambassador';
    } else {
      // Fall back to the authenticated Base44 session.
      let me = null;
      try {
        me = await base44.auth.me();
      } catch {
        me = null;
      }
      if (!me) {
        return Response.json({ success: false, error: 'Authentication required' }, { status: 401 });
      }
      // Only admins may act on an arbitrary dealer_id; everyone else is
      // scoped to their own verified dealer_id.
      isAdmin = me.role === 'admin' || me.role === 'super_admin' || me.role === 'root_admin';
      if (isAdmin && dealer_id) {
        resolvedDealerId = dealer_id;
      } else {
        resolvedDealerId = me.dealer_id;
      }
      authorEmail = me.email || 'Admin';
    }

    if (!resolvedDealerId) {
      return Response.json({ success: false, error: 'Dealer ID required' }, { status: 400 });
    }

    // LIST
    if (action === 'list') {
      const leads = await base44.asServiceRole.entities.Lead.filter(
        { dealer_id: resolvedDealerId },
        '-created_date'
      );
      return Response.json({ success: true, leads: leads || [] });
    }

    // CREATE
    if (action === 'create') {
      const lead = await base44.asServiceRole.entities.Lead.create({
        ...lead_data,
        dealer_id: resolvedDealerId,
        estimated_value: parseFloat(lead_data?.estimated_value) || 0,
        activities: [{
          type: 'note',
          text: 'Lead created',
          timestamp: new Date().toISOString(),
          author: authorEmail,
        }],
      });
      return Response.json({ success: true, lead });
    }

    // UPDATE
    if (action === 'update') {
      const existing = await base44.asServiceRole.entities.Lead.filter({ id: lead_id, dealer_id: resolvedDealerId });
      if (!existing || existing.length === 0) {
        return Response.json({ success: false, error: 'Lead not found' }, { status: 404 });
      }
      const lead = await base44.asServiceRole.entities.Lead.update(lead_id, lead_data);
      return Response.json({ success: true, lead });
    }

    // DELETE
    if (action === 'delete') {
      await base44.asServiceRole.entities.Lead.deleteMany({ id: lead_id, dealer_id: resolvedDealerId });
      return Response.json({ success: true });
    }

    // ADD NOTE
    if (action === 'add_note') {
      const leads = await base44.asServiceRole.entities.Lead.filter({ id: lead_id, dealer_id: resolvedDealerId });
      if (!leads || leads.length === 0) {
        return Response.json({ success: false, error: 'Lead not found' }, { status: 404 });
      }
      const lead = leads[0];
      const activities = lead.activities || [];
      activities.push({
        type: 'note',
        text: note,
        timestamp: new Date().toISOString(),
        author: authorEmail,
      });
      const updated = await base44.asServiceRole.entities.Lead.update(lead_id, {
        activities,
        last_contacted_at: new Date().toISOString(),
      });
      return Response.json({ success: true, lead: updated });
    }

    // ADD APPOINTMENT
    if (action === 'add_appointment') {
      const leads = await base44.asServiceRole.entities.Lead.filter({ id: lead_id, dealer_id: resolvedDealerId });
      if (!leads || leads.length === 0) {
        return Response.json({ success: false, error: 'Lead not found' }, { status: 404 });
      }
      const lead = leads[0];
      const appointments = lead.appointments || [];
      appointments.push({
        ...appointment,
        id: `appt-${Date.now()}`,
        status: 'scheduled',
        created_at: new Date().toISOString(),
      });
      const activities = lead.activities || [];
      activities.push({
        type: 'appointment',
        text: `Appointment scheduled: ${appointment.title || 'Meeting'} for ${appointment.date || ''} ${appointment.time || ''}`,
        timestamp: new Date().toISOString(),
        author: authorEmail,
      });
      const updated = await base44.asServiceRole.entities.Lead.update(lead_id, {
        appointments,
        activities,
        next_follow_up: appointment.date ? new Date(appointment.date).toISOString() : lead.next_follow_up,
      });
      return Response.json({ success: true, lead: updated });
    }

    // UPDATE APPOINTMENT
    if (action === 'update_appointment') {
      const leads = await base44.asServiceRole.entities.Lead.filter({ id: lead_id, dealer_id: resolvedDealerId });
      if (!leads || leads.length === 0) {
        return Response.json({ success: false, error: 'Lead not found' }, { status: 404 });
      }
      const lead = leads[0];
      const appointments = (lead.appointments || []).map((a) =>
        a.id === appointment.id ? { ...a, ...appointment } : a
      );
      const updated = await base44.asServiceRole.entities.Lead.update(lead_id, { appointments });
      return Response.json({ success: true, lead: updated });
    }

    // SEND INVITE EMAIL
    if (action === 'send_invite') {
      const leads = await base44.asServiceRole.entities.Lead.filter({ id: lead_id, dealer_id: resolvedDealerId });
      if (!leads || leads.length === 0) {
        return Response.json({ success: false, error: 'Lead not found' }, { status: 404 });
      }
      const lead = leads[0];
      if (!lead.email) {
        return Response.json({ success: false, error: 'No email on file' }, { status: 400 });
      }

      await sendEmail(
        base44,
        lead.email,
        'Join Our Network - openTILL POS',
        `
          <p style="margin:0 0 8px 0;font-size:14px;color:#71717a;">You're invited to join our network,</p>
          <h2 style="margin:0 0 20px 0;font-size:22px;font-weight:700;color:#18181b;">${escapeHtml(lead.contact_name || 'there')}!</h2>
          <p style="margin:0 0 16px 0;font-size:16px;color:#3f3f46;line-height:1.7;">
            You've been invited to sign up for <strong style="color:#7B2FD6;">openTILL POS</strong> and join our merchant network.
          </p>
          <p style="margin:0 0 16px 0;font-size:15px;color:#3f3f46;line-height:1.7;">
            Click the button below to get started. This link will automatically associate your account with our network.
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${escapeHtml(invite_link)}" style="display:inline-block;padding:14px 40px;background:linear-gradient(90deg,#7B2FD6 0%,#0FD17A 100%);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:10px;box-shadow:0 4px 16px rgba(123,47,214,0.35);">Accept Invitation &rarr;</a>
          </div>
          <p style="margin:24px 0 0 0;font-size:13px;color:#71717a;line-height:1.6;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <span style="color:#7B2FD6;word-break:break-all;">${escapeHtml(invite_link)}</span>
          </p>
          <p style="margin:24px 0 0 0;font-size:14px;color:#52525b;line-height:1.7;">
            Best regards,<br>
            <strong style="color:#7B2FD6;">The openTILL SMPF Team</strong>
          </p>
        `
      );

      const activities = lead.activities || [];
      activities.push({
        type: 'email',
        text: 'Invitation email sent',
        timestamp: new Date().toISOString(),
        author: authorEmail,
      });

      const updated = await base44.asServiceRole.entities.Lead.update(lead_id, {
        status: lead.status === 'new' ? 'contacted' : lead.status,
        last_contacted_at: new Date().toISOString(),
        activities,
      });
      return Response.json({ success: true, lead: updated });
    }

    // LOG CALL
    if (action === 'log_call') {
      const leads = await base44.asServiceRole.entities.Lead.filter({ id: lead_id, dealer_id: resolvedDealerId });
      if (!leads || leads.length === 0) {
        return Response.json({ success: false, error: 'Lead not found' }, { status: 404 });
      }
      const lead = leads[0];
      const activities = lead.activities || [];
      activities.push({
        type: 'call',
        text: note || 'Call logged',
        timestamp: new Date().toISOString(),
        author: authorEmail,
      });
      const updated = await base44.asServiceRole.entities.Lead.update(lead_id, {
        activities,
        last_contacted_at: new Date().toISOString(),
      });
      return Response.json({ success: true, lead: updated });
    }

    return Response.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('manageLead error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});