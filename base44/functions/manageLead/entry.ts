import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { verify } from 'https://deno.land/x/djwt@v2.8/mod.ts';

const JWT_SECRET = Deno.env.get('JWT_SECRET');

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

    // Resolve dealer_id from JWT token or request body
    let resolvedDealerId = dealer_id;
    let authorEmail = 'Admin';
    if (token) {
      const payload = await verifyToken(token);
      if (!payload) {
        return Response.json({ success: false, error: 'Invalid or expired token' }, { status: 401 });
      }
      resolvedDealerId = payload.dealer_id;
      authorEmail = payload.email || 'Ambassador';
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

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: lead.email,
        subject: 'Join Our Network - openTILL POS',
        body: `Hi ${lead.contact_name || ''},

You're invited to sign up for openTILL POS and join our merchant network.

Click the link below to get started:
${invite_link}

This link will automatically associate your account with our network.

Best regards,
openTILL POS Team`,
      });

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