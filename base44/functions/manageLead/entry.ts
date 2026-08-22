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
    const { action, token, dealer_id, lead_data, lead_id, note, appointment, invite_link,
            leads: leadsPayload, lead_ids, updates, list_data, list_id, add_to_list, import_source,
            staff_id, staff_name, commission_rate, earning_id, earning_updates } = body;

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
      const lead = existing[0];
      const updates = { ...lead_data };
      if (updates.status === 'converted' && lead.status !== 'converted') {
        updates.converted_at = new Date().toISOString();
      }
      const updated = await base44.asServiceRole.entities.Lead.update(lead_id, updates);
      // Auto-create earning record when lead converts with an assigned staff
      if (updates.status === 'converted' && lead.status !== 'converted' && lead.assigned_to) {
        const rate = parseFloat(lead.commission_rate) || 0;
        const dealValue = parseFloat(lead.estimated_value) || 0;
        const amount = dealValue * rate / 100;
        if (amount > 0) {
          try {
            await base44.asServiceRole.entities.StaffEarning.create({
              dealer_id: resolvedDealerId,
              staff_id: lead.assigned_to,
              staff_name: lead.assigned_to_name || '',
              lead_id: lead.id,
              lead_name: lead.business_name || '',
              commission_rate: rate,
              deal_value: dealValue,
              amount,
              status: 'pending',
            });
            await base44.asServiceRole.entities.Lead.update(lead_id, { earned_amount: amount });
          } catch (e) {
            console.error('Failed to create StaffEarning:', e);
          }
        }
      }
      return Response.json({ success: true, lead: updated });
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

    // IMPORT LEADS (bulk create from CSV / CRM export)
    if (action === 'import_leads') {
      const incoming = Array.isArray(leadsPayload) ? leadsPayload : [];
      if (incoming.length === 0) {
        return Response.json({ success: false, error: 'No leads provided' }, { status: 400 });
      }
      const now = new Date().toISOString();
      const records = incoming.map((l) => ({
        dealer_id: resolvedDealerId,
        business_name: (l.business_name || '').trim(),
        contact_name: (l.contact_name || '').trim(),
        email: (l.email || '').trim(),
        phone: (l.phone || '').trim(),
        status: l.status || 'new',
        source: l.source || 'other',
        business_type: l.business_type || 'other',
        estimated_value: parseFloat(l.estimated_value) || 0,
        notes: l.notes || '',
        tags: Array.isArray(l.tags) ? l.tags : [],
        list_ids: Array.isArray(l.list_ids) ? l.list_ids : [],
        import_source: import_source || 'csv',
        external_id: l.external_id || '',
        activities: [{
          type: 'note',
          text: `Lead imported${import_source ? ` from ${import_source}` : ''}`,
          timestamp: now,
          author: authorEmail,
        }],
      })).filter((r) => r.business_name);

      if (records.length === 0) {
        return Response.json({ success: false, error: 'No valid leads (business name required)' }, { status: 400 });
      }

      const created = await base44.asServiceRole.entities.Lead.bulkCreate(records);
      return Response.json({ success: true, imported: created.length, leads: created });
    }

    // BULK UPDATE (e.g. change status for many leads)
    if (action === 'bulk_update') {
      const ids = Array.isArray(lead_ids) ? lead_ids : [];
      if (ids.length === 0) {
        return Response.json({ success: false, error: 'No leads selected' }, { status: 400 });
      }
      const set = { ...updates };
      if (set.status) {
        set.last_contacted_at = new Date().toISOString();
        if (set.status === 'converted') set.converted_at = new Date().toISOString();
      }
      // If converting, auto-create earning records for assigned leads
      if (set.status === 'converted') {
        const matching = await base44.asServiceRole.entities.Lead.filter(
          { id: { $in: ids }, dealer_id: resolvedDealerId, status: { $ne: 'converted' } }
        );
        const toCreate = [];
        const earnedUpdates = [];
        for (const lead of (matching || [])) {
          if (!lead.assigned_to) continue;
          const rate = parseFloat(lead.commission_rate) || 0;
          const dealValue = parseFloat(lead.estimated_value) || 0;
          const amount = dealValue * rate / 100;
          if (amount > 0) {
            toCreate.push({
              dealer_id: resolvedDealerId,
              staff_id: lead.assigned_to,
              staff_name: lead.assigned_to_name || '',
              lead_id: lead.id,
              lead_name: lead.business_name || '',
              commission_rate: rate,
              deal_value: dealValue,
              amount,
              status: 'pending',
            });
            earnedUpdates.push({ id: lead.id, earned_amount: amount });
          }
        }
        if (toCreate.length > 0) {
          try { await base44.asServiceRole.entities.StaffEarning.bulkCreate(toCreate); } catch (e) { console.error('bulkCreate earnings:', e); }
        }
        if (earnedUpdates.length > 0) {
          try { await base44.asServiceRole.entities.Lead.bulkUpdate(earnedUpdates); } catch (e) { console.error('bulkUpdate earned_amount:', e); }
        }
      }
      const result = await base44.asServiceRole.entities.Lead.updateMany(
        { id: { $in: ids }, dealer_id: resolvedDealerId },
        { $set: set }
      );
      return Response.json({ success: true, updated: result?.modified || ids.length });
    }

    // BULK DELETE
    if (action === 'bulk_delete') {
      const ids = Array.isArray(lead_ids) ? lead_ids : [];
      if (ids.length === 0) {
        return Response.json({ success: false, error: 'No leads selected' }, { status: 400 });
      }
      await base44.asServiceRole.entities.Lead.deleteMany({ id: { $in: ids }, dealer_id: resolvedDealerId });
      return Response.json({ success: true, deleted: ids.length });
    }

    // BULK SET LIST (add or remove a list from many leads)
    if (action === 'bulk_set_list') {
      const ids = Array.isArray(lead_ids) ? lead_ids : [];
      if (ids.length === 0 || !list_id) {
        return Response.json({ success: false, error: 'Leads and list required' }, { status: 400 });
      }
      const matching = await base44.asServiceRole.entities.Lead.filter(
        { id: { $in: ids }, dealer_id: resolvedDealerId }
      );
      if (!matching || matching.length === 0) {
        return Response.json({ success: false, error: 'No matching leads' }, { status: 404 });
      }
      const updatesBatch = matching.map((lead) => {
        let listIds = lead.list_ids || [];
        if (add_to_list) {
          if (!listIds.includes(list_id)) listIds = [...listIds, list_id];
        } else {
          listIds = listIds.filter((id) => id !== list_id);
        }
        return { id: lead.id, list_ids: listIds };
      });
      await base44.asServiceRole.entities.Lead.bulkUpdate(updatesBatch);
      return Response.json({ success: true, updated: updatesBatch.length });
    }

    // BULK SEND INVITE
    if (action === 'bulk_send_invite') {
      const ids = Array.isArray(lead_ids) ? lead_ids : [];
      if (ids.length === 0) {
        return Response.json({ success: false, error: 'No leads selected' }, { status: 400 });
      }
      const matching = await base44.asServiceRole.entities.Lead.filter(
        { id: { $in: ids }, dealer_id: resolvedDealerId }
      );
      if (!matching) {
        return Response.json({ success: false, error: 'No matching leads' }, { status: 404 });
      }
      let sent = 0;
      const now = new Date().toISOString();
      const updatesBatch = [];
      for (const lead of matching) {
        if (!lead.email) continue;
        try {
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
                <a href="${escapeHtml(invite_link || '')}" style="display:inline-block;padding:14px 40px;background:linear-gradient(90deg,#7B2FD6 0%,#0FD17A 100%);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:10px;box-shadow:0 4px 16px rgba(123,47,214,0.35);">Accept Invitation &rarr;</a>
              </div>
              <p style="margin:24px 0 0 0;font-size:13px;color:#71717a;line-height:1.6;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <span style="color:#7B2FD6;word-break:break-all;">${escapeHtml(invite_link || '')}</span>
              </p>
              <p style="margin:24px 0 0 0;font-size:14px;color:#52525b;line-height:1.7;">
                Best regards,<br>
                <strong style="color:#7B2FD6;">The openTILL SMPF Team</strong>
              </p>
            `
          );
          const activities = lead.activities || [];
          activities.push({ type: 'email', text: 'Invitation email sent (bulk)', timestamp: now, author: authorEmail });
          updatesBatch.push({
            id: lead.id,
            status: lead.status === 'new' ? 'contacted' : lead.status,
            last_contacted_at: now,
            activities,
          });
          sent++;
        } catch (e) {
          console.error(`Bulk invite failed for ${lead.email}:`, e);
        }
      }
      if (updatesBatch.length > 0) {
        await base44.asServiceRole.entities.Lead.bulkUpdate(updatesBatch);
      }
      return Response.json({ success: true, sent });
    }

    // LIST CRUD — LeadList entity
    if (action === 'list_list') {
      const lists = await base44.asServiceRole.entities.LeadList.filter(
        { dealer_id: resolvedDealerId },
        'name'
      );
      return Response.json({ success: true, lists: lists || [] });
    }

    if (action === 'list_create') {
      if (!list_data?.name) {
        return Response.json({ success: false, error: 'List name required' }, { status: 400 });
      }
      const list = await base44.asServiceRole.entities.LeadList.create({
        dealer_id: resolvedDealerId,
        name: list_data.name.trim(),
        description: list_data.description || '',
        color: list_data.color || '#7B2FD6',
      });
      return Response.json({ success: true, list });
    }

    if (action === 'list_update') {
      const existing = await base44.asServiceRole.entities.LeadList.filter({ id: list_id, dealer_id: resolvedDealerId });
      if (!existing || existing.length === 0) {
        return Response.json({ success: false, error: 'List not found' }, { status: 404 });
      }
      const list = await base44.asServiceRole.entities.LeadList.update(list_id, list_data);
      return Response.json({ success: true, list });
    }

    if (action === 'list_delete') {
      const existing = await base44.asServiceRole.entities.LeadList.filter({ id: list_id, dealer_id: resolvedDealerId });
      if (!existing || existing.length === 0) {
        return Response.json({ success: false, error: 'List not found' }, { status: 404 });
      }
      // Remove the list id from all leads that reference it
      const affected = await base44.asServiceRole.entities.Lead.filter({ dealer_id: resolvedDealerId });
      const updatesBatch = (affected || [])
        .filter((l) => (l.list_ids || []).includes(list_id))
        .map((l) => ({ id: l.id, list_ids: (l.list_ids || []).filter((id) => id !== list_id) }));
      if (updatesBatch.length > 0) {
        await base44.asServiceRole.entities.Lead.bulkUpdate(updatesBatch);
      }
      await base44.asServiceRole.entities.LeadList.deleteMany({ id: list_id, dealer_id: resolvedDealerId });
      return Response.json({ success: true });
    }

    // LIST STAFF — dealer staff members available for assignment
    if (action === 'list_staff') {
      const users = await base44.asServiceRole.entities.User.list();
      const dealerStaff = (users || []).filter(
        (u) => u.dealer_id === resolvedDealerId && u.role !== 'admin'
      );
      return Response.json({
        success: true,
        staff: dealerStaff.map((u) => ({
          id: u.id,
          full_name: u.full_name || u.email,
          email: u.email,
          default_commission_rate: u.default_commission_rate || 0,
        })),
      });
    }

    // SET STAFF DEFAULT COMMISSION RATE
    if (action === 'set_staff_commission') {
      if (!staff_id) {
        return Response.json({ success: false, error: 'Staff ID required' }, { status: 400 });
      }
      await base44.asServiceRole.entities.User.update(staff_id, {
        default_commission_rate: parseFloat(commission_rate) || 0,
      });
      return Response.json({ success: true });
    }

    // ASSIGN LEAD TO STAFF
    if (action === 'assign_staff') {
      const existing = await base44.asServiceRole.entities.Lead.filter({ id: lead_id, dealer_id: resolvedDealerId });
      if (!existing || existing.length === 0) {
        return Response.json({ success: false, error: 'Lead not found' }, { status: 404 });
      }
      const lead = existing[0];
      const activities = lead.activities || [];
      const assignmentText = staff_id
        ? `Assigned to ${staff_name || 'staff'} (${parseFloat(commission_rate) || 0}% commission)`
        : 'Assignment cleared';
      activities.push({
        type: 'assignment',
        text: assignmentText,
        timestamp: new Date().toISOString(),
        author: authorEmail,
      });
      const updated = await base44.asServiceRole.entities.Lead.update(lead_id, {
        assigned_to: staff_id || '',
        assigned_to_name: staff_id ? (staff_name || '') : '',
        commission_rate: staff_id ? (parseFloat(commission_rate) || 0) : 0,
        activities,
      });
      return Response.json({ success: true, lead: updated });
    }

    // BULK ASSIGN STAFF
    if (action === 'bulk_assign_staff') {
      const ids = Array.isArray(lead_ids) ? lead_ids : [];
      if (ids.length === 0) {
        return Response.json({ success: false, error: 'No leads selected' }, { status: 400 });
      }
      const matching = await base44.asServiceRole.entities.Lead.filter(
        { id: { $in: ids }, dealer_id: resolvedDealerId }
      );
      if (!matching || matching.length === 0) {
        return Response.json({ success: false, error: 'No matching leads' }, { status: 404 });
      }
      const rate = parseFloat(commission_rate) || 0;
      const now = new Date().toISOString();
      const updatesBatch = matching.map((lead) => {
        const activities = lead.activities || [];
        activities.push({
          type: 'assignment',
          text: staff_id
            ? `Assigned to ${staff_name || 'staff'} (${rate}% commission)`
            : 'Assignment cleared',
          timestamp: now,
          author: authorEmail,
        });
        return {
          id: lead.id,
          assigned_to: staff_id || '',
          assigned_to_name: staff_id ? (staff_name || '') : '',
          commission_rate: staff_id ? rate : 0,
          activities,
        };
      });
      await base44.asServiceRole.entities.Lead.bulkUpdate(updatesBatch);
      return Response.json({ success: true, updated: updatesBatch.length });
    }

    // LIST EARNINGS — all StaffEarning records for the dealer
    if (action === 'list_earnings') {
      const earnings = await base44.asServiceRole.entities.StaffEarning.filter(
        { dealer_id: resolvedDealerId },
        '-created_date'
      );
      return Response.json({ success: true, earnings: earnings || [] });
    }

    // MARK EARNING PAID
    if (action === 'mark_earning_paid') {
      const existing = await base44.asServiceRole.entities.StaffEarning.filter(
        { id: earning_id, dealer_id: resolvedDealerId }
      );
      if (!existing || existing.length === 0) {
        return Response.json({ success: false, error: 'Earning not found' }, { status: 404 });
      }
      const earning = existing[0];
      const updated = await base44.asServiceRole.entities.StaffEarning.update(earning_id, {
        status: 'paid',
        paid_at: new Date().toISOString(),
        notes: earning_updates?.notes ?? earning.notes,
      });
      return Response.json({ success: true, earning: updated });
    }

    // BULK MARK EARNINGS PAID
    if (action === 'bulk_mark_earnings_paid') {
      const ids = Array.isArray(lead_ids) ? lead_ids : [];
      if (ids.length === 0) {
        return Response.json({ success: false, error: 'No earnings selected' }, { status: 400 });
      }
      const now = new Date().toISOString();
      await base44.asServiceRole.entities.StaffEarning.updateMany(
        { id: { $in: ids }, dealer_id: resolvedDealerId },
        { $set: { status: 'paid', paid_at: now } }
      );
      return Response.json({ success: true, updated: ids.length });
    }

    return Response.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('manageLead error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});