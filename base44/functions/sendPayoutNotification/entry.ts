import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Escape any string before interpolating it into HTML to prevent injection / XSS.
function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // SECURITY: only authenticated platform admins may trigger payout
    // notifications. Without this gate, anonymous callers could spam arbitrary
    // ambassadors and inject HTML into the rendered email body.
    let user;
    try {
      user = await base44.auth.me();
    } catch (e) {
      user = null;
    }
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: admin authentication required' }, { status: 401 });
    }

    const { ambassador_id, type, details, amount, merchant_names, error_message } = await req.json();

    // Validate input
    if (!ambassador_id || !type || !['scheduled', 'processed', 'failed', 'admin_action', 'system_issue'].includes(type)) {
      return Response.json({ error: 'Invalid input' }, { status: 400 });
    }

    // Fetch ambassador data
    const ambassadors = await base44.asServiceRole.entities.Ambassador.filter({ id: ambassador_id });
    if (!ambassadors || ambassadors.length === 0) {
      return Response.json({ error: 'Ambassador not found' }, { status: 404 });
    }
    const ambassador = ambassadors[0];

    // Pre-escape every dynamic value before it is interpolated into HTML.
    const safeName = escapeHtml(ambassador.name);
    const safeAmount = (typeof amount === 'number' && isFinite(amount)) ? amount.toFixed(2) : '0.00';
    const safeMerchantNames = Array.isArray(merchant_names)
      ? merchant_names.map((n) => escapeHtml(n)).join(', ')
      : 'N/A';
    const safeErrorMessage = escapeHtml(error_message || 'Unknown error');
    const safeTxId = escapeHtml(details?.transaction_id);
    const safeAction = escapeHtml(details?.action || 'N/A');
    const safeReason = escapeHtml(details?.reason || 'No reason provided');
    const safeDetailsJson = escapeHtml(JSON.stringify(details ?? {}, null, 2));

    // Prepare notification content
    let subject = '';
    let emailBody = '';
    let notificationTitle = '';
    let notificationMessage = '';

    switch (type) {
      case 'scheduled':
        subject = `Your Payout Has Been Scheduled - $${safeAmount}`;
        notificationTitle = 'Payout Scheduled';
        notificationMessage = `Your payout of $${safeAmount} has been scheduled for processing.`;
        emailBody = `
          <h2>Payout Scheduled</h2>
          <p>Hi ${safeName},</p>
          <p>Your payout has been scheduled for processing.</p>
          <ul>
            <li><strong>Amount:</strong> $${safeAmount}</li>
            <li><strong>Merchants:</strong> ${safeMerchantNames}</li>
            <li><strong>Scheduled Date:</strong> ${new Date().toLocaleDateString()}</li>
          </ul>
          <p>You'll receive another notification once the payout is processed.</p>
        `;
        break;

      case 'processed':
        subject = `Your Payout Has Been Processed - $${safeAmount}`;
        notificationTitle = 'Payout Processed';
        notificationMessage = `Your payout of $${safeAmount} has been successfully processed.`;
        emailBody = `
          <h2>Payout Processed</h2>
          <p>Hi ${safeName},</p>
          <p>Your payout has been successfully processed and deposited to your account.</p>
          <ul>
            <li><strong>Amount:</strong> $${safeAmount}</li>
            <li><strong>Merchants:</strong> ${safeMerchantNames}</li>
            <li><strong>Processed Date:</strong> ${new Date().toLocaleDateString()}</li>
            ${safeTxId ? `<li><strong>Transaction ID:</strong> ${safeTxId}</li>` : ''}
          </ul>
          <p>Thank you for using openTILL!</p>
        `;
        break;

      case 'failed':
        subject = `Payout Processing Failed - Action Required`;
        notificationTitle = 'Payout Failed';
        notificationMessage = `Your payout of $${safeAmount} failed to process. Reason: ${safeErrorMessage}`;
        emailBody = `
          <h2>Payout Processing Failed</h2>
          <p>Hi ${safeName},</p>
          <p>Unfortunately, your payout failed to process.</p>
          <ul>
            <li><strong>Amount:</strong> $${safeAmount}</li>
            <li><strong>Merchants:</strong> ${safeMerchantNames}</li>
            <li><strong>Reason:</strong> ${safeErrorMessage}</li>
          </ul>
          <p>Our support team has been notified and will investigate. You'll receive an update shortly.</p>
        `;
        break;

      case 'admin_action':
        subject = `Manual Payout Action - $${safeAmount}`;
        notificationTitle = 'Manual Payout Action';
        notificationMessage = `A manual payout action was performed on your account: ${safeAction === 'N/A' ? 'Unknown action' : safeAction}`;
        emailBody = `
          <h2>Manual Payout Action</h2>
          <p>Hi ${safeName},</p>
          <p>A manual payout action was performed on your account by an administrator.</p>
          <ul>
            <li><strong>Action:</strong> ${safeAction}</li>
            <li><strong>Amount:</strong> $${safeAmount}</li>
            <li><strong>Reason:</strong> ${safeReason}</li>
            <li><strong>Timestamp:</strong> ${new Date().toLocaleString()}</li>
          </ul>
        `;
        break;

      case 'system_issue':
        subject = `Payout System Issue - Action Required`;
        notificationTitle = 'System Issue';
        notificationMessage = `A system-wide payout issue has been detected: ${safeErrorMessage}`;
        emailBody = `
          <h2>Payout System Issue</h2>
          <p>Hi ${safeName},</p>
          <p>A system-wide issue has been detected that may affect your payouts.</p>
          <ul>
            <li><strong>Issue:</strong> ${safeErrorMessage}</li>
            <li><strong>Detected:</strong> ${new Date().toLocaleString()}</li>
          </ul>
          <p>Our team is working to resolve this. We'll notify you once it's fixed.</p>
        `;
        break;
    }

    // Send email notification
    try {
      await base44.integrations.Core.SendEmail({
        to: ambassador.contact_email || ambassador.owner_email,
        subject,
        body: `
          <!DOCTYPE html>
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              ${emailBody}
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
              <p style="font-size: 12px; color: #999;">
                This is an automated notification from openTILL. Please do not reply to this email.
              </p>
            </body>
          </html>
        `
      });
    } catch (emailError) {
      console.error('Email notification failed:', emailError);
      // Continue even if email fails - we'll still create the database record
    }

    // Create notification record in database
    try {
      await base44.asServiceRole.entities.MerchantNotification.create({
        user_email: ambassador.contact_email || ambassador.owner_email,
        notification_type: `payout_${type}`,
        title: notificationTitle,
        message: notificationMessage,
        is_read: false,
        metadata: {
          ambassador_id,
          ambassador_name: ambassador.name,
          amount,
          merchant_names,
          details,
          error_message,
          timestamp: new Date().toISOString()
        }
      });
    } catch (dbError) {
      console.error('Database notification failed:', dbError);
      // Continue - at least email was sent
    }

    // Notify super admins for critical actions
    if (['failed', 'admin_action', 'system_issue'].includes(type)) {
      try {
        const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
        for (const admin of admins) {
          const adminSubject = `[ALERT] Payout ${type.toUpperCase()}: ${safeName}`;
          const adminBody = `
            <h2>Payout Alert</h2>
            <p><strong>Ambassador:</strong> ${safeName}</p>
            <p><strong>Type:</strong> ${escapeHtml(type)}</p>
            <p><strong>Amount:</strong> $${safeAmount}</p>
            ${safeErrorMessage ? `<p><strong>Error:</strong> ${safeErrorMessage}</p>` : ''}
            <p><strong>Details:</strong></p>
            <pre>${safeDetailsJson}</pre>
          `;

          await base44.integrations.Core.SendEmail({
            to: admin.email,
            subject: adminSubject,
            body: `
              <!DOCTYPE html>
              <html>
                <body style="font-family: Arial, sans-serif; color: #333;">
                  ${adminBody}
                </body>
              </html>
            `
          }).catch(e => console.error('Admin email failed:', e));
        }
      } catch (adminError) {
        console.error('Admin notification failed:', adminError);
      }
    }

    return Response.json({ success: true, notified: true });
  } catch (error) {
    console.error('Notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});