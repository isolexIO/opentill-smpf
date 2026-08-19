import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// activateMerchant — handles merchant activation/rejection with branded HTML emails
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin' && user?.role !== 'super_admin' && user?.role !== 'root_admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { merchant_id, action, pin, temp_password } = await req.json();

    if (!merchant_id) {
      return Response.json({ error: 'merchant_id is required' }, { status: 400 });
    }

    // Derive the app base URL from the request origin so the login link in the
    // email always points back to the correct deployment.
    const origin = req.headers.get('origin') || req.headers.get('referer') || 'https://opentill.isolex.io';
    const appUrl = origin.replace(/\/$/, '');

    const now = new Date().toISOString();

    // Sanitize merchant-supplied fields before inserting into email bodies to
    // prevent content spoofing / header injection. Strip control characters
    // (incl. CR/LF used for header injection) and cap length.
    const sanitizeForEmail = (value, maxLen = 80) => {
      if (!value) return '';
      return String(value)
        .replace(/[\r\n\t\u0000-\u001F\u007F]/g, ' ')
        .replace(/[<>]/g, '')
        .trim()
        .slice(0, maxLen);
    };

    // Escape user-controlled text for safe interpolation into HTML email bodies.
    const escapeHtml = (value) => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    // Build a branded HTML email wrapper with the openTILL gradient identity.
    const brandedEmail = (innerHtml) => `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header bar -->
        <tr><td style="height:6px;background:linear-gradient(90deg,#7B2FD6 0%,#0FD17A 100%);font-size:0;line-height:0;">&nbsp;</td></tr>
        <!-- Logo + brand -->
        <tr><td style="padding:40px 48px 24px 48px;text-align:center;">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6970e2871534100b4ebb8d45/8e45f76fe_DUC3.png" alt="openTILL" width="56" height="56" style="display:block;margin:0 auto 16px auto;border-radius:12px;" />
          <h1 style="margin:0;font-size:24px;font-weight:800;color:#18181b;letter-spacing:-0.5px;">openTILL <span style="color:#7B2FD6;">SMPF</span></h1>
          <p style="margin:6px 0 0 0;font-size:13px;color:#71717a;font-weight:500;letter-spacing:0.5px;text-transform:uppercase;">Structured Merchant Participation Framework</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:0 48px 40px 48px;">
          ${innerHtml}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:32px 48px;background:#fafafa;border-top:1px solid #e4e4e7;">
          <p style="margin:0 0 8px 0;font-size:13px;color:#71717a;line-height:1.6;">
            <strong style="color:#3f3f46;">openTILL SMPF</strong> — The blockchain-integrated Point of Sale for modern commerce.
          </p>
          <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.6;">
            &copy; ${new Date().getFullYear()} Isolex Corporation. All rights reserved.<br>
            This is an automated message — please do not reply directly to this email.
          </p>
        </td></tr>
        <tr><td style="height:6px;background:linear-gradient(90deg,#0FD17A 0%,#7B2FD6 100%);font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    // Use the built-in SendEmail integration instead of nodemailer — direct
    // SMTP connections time out in the edge function environment.
    const sendEmail = async (to, subject, htmlBody) => {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to,
          subject,
          body: brandedEmail(htmlBody),
        });
      } catch (emailError) {
        console.error(`Failed to send email to ${to}:`, emailError);
      }
    };

    if (action === 'activate') {
      // Activate merchant — full active status, no trial period
      const merchants = await base44.asServiceRole.entities.Merchant.filter({ id: merchant_id });
      const merchantData = merchants?.[0];
      
      if (!merchantData) {
        return Response.json({ error: 'Merchant not found' }, { status: 404 });
      }

      const updated = await base44.asServiceRole.entities.Merchant.update(merchant_id, {
        status: 'active',
        activated_at: now
      });

      const bizName = sanitizeForEmail(merchantData.business_name);
      const ownerName = sanitizeForEmail(merchantData.owner_name) || 'Merchant';
      const ownerEmail = sanitizeForEmail(merchantData.owner_email, 120);
      const hasCredentials = !!(pin || temp_password);

      // Build the credentials card HTML only when credentials were supplied.
      const credentialsHtml = hasCredentials ? `
        <div style="margin:28px 0;background:#f4f4f5;border:1px solid #e4e4e7;border-radius:12px;padding:24px;">
          <p style="margin:0 0 16px 0;font-size:13px;font-weight:700;color:#3f3f46;text-transform:uppercase;letter-spacing:0.5px;">Your Login Credentials</p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding:8px 0;font-size:14px;color:#71717a;font-weight:500;width:140px;">Login Email</td>
              <td style="padding:8px 0;font-size:14px;color:#18181b;font-weight:600;font-family:monospace;">${escapeHtml(ownerEmail)}</td>
            </tr>
            ${pin ? `<tr>
              <td style="padding:8px 0;font-size:14px;color:#71717a;font-weight:500;">PIN (quick login)</td>
              <td style="padding:8px 0;font-size:18px;color:#7B2FD6;font-weight:800;font-family:monospace;letter-spacing:4px;">${escapeHtml(String(pin))}</td>
            </tr>` : ''}
            ${temp_password ? `<tr>
              <td style="padding:8px 0;font-size:14px;color:#71717a;font-weight:500;">Temporary Password</td>
              <td style="padding:8px 0;font-size:14px;color:#18181b;font-weight:700;font-family:monospace;word-break:break-all;">${escapeHtml(String(temp_password))}</td>
            </tr>` : ''}
          </table>
        </div>
        <div style="text-align:center;margin:32px 0;">
          <a href="${appUrl}/PinLogin" style="display:inline-block;padding:14px 40px;background:linear-gradient(90deg,#7B2FD6 0%,#0FD17A 100%);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:10px;box-shadow:0 2px 8px rgba(123,47,214,0.3);">Log In to Your POS &rarr;</a>
        </div>
        <p style="margin:16px 0 0 0;font-size:13px;color:#a1a1aa;text-align:center;">Or visit <span style="color:#7B2FD6;font-weight:600;">${appUrl}/PinLogin</span> and enter your 6-digit PIN.</p>` : '';

      // 1. Merchant activation confirmation — branded HTML with credentials
      await sendEmail(
        merchantData.owner_email,
        'Welcome to openTILL SMPF — Your Account is Active!',
        `
        <p style="margin:0 0 8px 0;font-size:14px;color:#71717a;">Welcome aboard,</p>
        <h2 style="margin:0 0 20px 0;font-size:22px;font-weight:700;color:#18181b;">${escapeHtml(ownerName)}!</h2>
        <p style="margin:0 0 16px 0;font-size:16px;color:#3f3f46;line-height:1.7;">
          Congratulations — your <strong style="color:#7B2FD6;">openTILL SMPF</strong> account for
          <strong>${escapeHtml(bizName)}</strong> has been activated and is ready to use.
        </p>
        <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:16px 20px;margin:24px 0;">
          <p style="margin:0;font-size:14px;color:#065f46;">
            <strong>&#9989; Account Active</strong><br>
            <span style="font-size:13px;color:#047857;">Your account is fully active — no trial period, no card required.</span>
          </p>
        </div>
        ${credentialsHtml}
        <p style="margin:28px 0 12px 0;font-size:15px;color:#3f3f46;font-weight:600;">What's next?</p>
        <ul style="margin:0 0 24px 0;padding-left:20px;font-size:14px;color:#52525b;line-height:1.9;">
          <li>Log in using the credentials above</li>
          <li>Complete your business profile and onboarding</li>
          <li>Set up your menu, products, and payment methods</li>
          <li>Connect your hardware and start selling</li>
        </ul>
        <p style="margin:24px 0 0 0;font-size:14px;color:#52525b;line-height:1.7;">
          Need help? Our support team is available 24/7 right from your dashboard.
        </p>
        <p style="margin:28px 0 0 0;font-size:14px;color:#3f3f46;line-height:1.7;">
          Welcome to the future of point of sale.<br>
          <strong style="color:#7B2FD6;">The openTILL SMPF Team</strong>
        </p>`
      );

      // 2. Notify all platform admins (admin / super_admin / root_admin)
      try {
        const adminUsers = await base44.asServiceRole.entities.User.list();
        const adminEmails = (adminUsers || [])
          .filter(u => u.role === 'admin' || u.role === 'super_admin' || u.role === 'root_admin')
          .map(u => u.email)
          .filter(Boolean);
        for (const adminEmail of adminEmails) {
          await sendEmail(
            adminEmail,
            `Merchant Activated: ${bizName}`,
            `
            <p style="margin:0 0 8px 0;font-size:14px;color:#71717a;">Internal notification</p>
            <h2 style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:#18181b;">Merchant Activated</h2>
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;color:#3f3f46;">
              <tr><td style="padding:6px 0;color:#71717a;font-weight:500;width:120px;">Business</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(bizName)}</td></tr>
              <tr><td style="padding:6px 0;color:#71717a;font-weight:500;">Owner</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(ownerName)}</td></tr>
              <tr><td style="padding:6px 0;color:#71717a;font-weight:500;">Email</td><td style="padding:6px 0;font-weight:600;font-family:monospace;">${escapeHtml(ownerEmail)}</td></tr>
              <tr><td style="padding:6px 0;color:#71717a;font-weight:500;">Status</td><td style="padding:6px 0;font-weight:600;">Active</td></tr>
            </table>
            <p style="margin:20px 0 0 0;font-size:13px;color:#a1a1aa;">This is an automated notification from openTILL SMPF.</p>`
          );
        }
      } catch (adminListError) {
        console.error('Failed to fetch admin users for notification:', adminListError);
      }

      // 3. Notify the referring ambassador/dealer (interested party)
      if (merchantData.dealer_id) {
        try {
          const ambassadors = await base44.asServiceRole.entities.Ambassador.filter({ legacy_dealer_id: merchantData.dealer_id });
          const ambassador = ambassadors?.[0];
          const interestedEmail = ambassador?.contact_email || ambassador?.owner_email;
          if (interestedEmail) {
            await sendEmail(
              interestedEmail,
              `Your Referral Has Been Activated: ${bizName}`,
              `Good news! A merchant you referred has been activated on openTILL.\n\nBusiness: ${bizName}\nOwner: ${ownerName}\nStatus: Active\n\nYou can view this merchant's progress from your ambassador dashboard.\n\nBest regards,\nThe openTILL Team`
            );
          }
        } catch (ambassadorError) {
          console.error('Failed to notify referring ambassador:', ambassadorError);
        }
      }

      return Response.json({ success: true, merchant_id, data: updated });
    } else if (action === 'reject') {
      // Reject/cancel merchant registration
      const merchants = await base44.asServiceRole.entities.Merchant.filter({ id: merchant_id });
      const merchantData = merchants?.[0];

      const updated = await base44.asServiceRole.entities.Merchant.update(merchant_id, {
        status: 'cancelled',
        suspended_at: now,
        suspension_reason: 'Registration rejected by admin'
      });

      // Send rejection email
      if (merchantData?.owner_email) {
        await sendEmail(
          merchantData.owner_email,
          'Your openTILL Application Status',
          `Dear ${sanitizeForEmail(merchantData.owner_name) || 'Applicant'},\n\nThank you for your interest in openTILL. Unfortunately, your application for ${sanitizeForEmail(merchantData.business_name)} has been rejected by our team.\n\nIf you have any questions, please contact our support team.\n\nBest regards,\nThe openTILL Team`
        );
      }

      return Response.json({ success: true, merchant_id, data: updated });
    } else {
      return Response.json({ error: 'Invalid action', merchant_id }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in activateMerchant:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});