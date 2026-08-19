import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import nodemailer from 'npm:nodemailer@6.9.7';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin' && user?.role !== 'super_admin' && user?.role !== 'root_admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { merchant_id, action } = await req.json();

    if (!merchant_id) {
      return Response.json({ error: 'merchant_id is required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const trialEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

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

    if (action === 'activate') {
      // Activate merchant with trial
      const merchants = await base44.asServiceRole.entities.Merchant.filter({ id: merchant_id });
      const merchantData = merchants?.[0];
      
      if (!merchantData) {
        return Response.json({ error: 'Merchant not found' }, { status: 404 });
      }

      const updated = await base44.asServiceRole.entities.Merchant.update(merchant_id, {
        status: 'trial',
        activated_at: now,
        trial_ends_at: trialEndDate
      });

      // Collect all recipient addresses for activation notifications:
      //   1. The merchant (owner_email) — confirmation email
      //   2. Platform admins — internal notification
      //   3. The referring ambassador/dealer — "interested party" notification
      const transporter = nodemailer.createTransport({
        host: Deno.env.get('SMTP_HOST'),
        port: parseInt(Deno.env.get('SMTP_PORT') || '587'),
        secure: false,
        auth: {
          user: Deno.env.get('SMTP_USER'),
          pass: Deno.env.get('SMTP_PASS'),
        },
      });
      const fromAddr = Deno.env.get('SMTP_USER');
      const bizName = sanitizeForEmail(merchantData.business_name);
      const ownerName = sanitizeForEmail(merchantData.owner_name) || 'Merchant';
      const trialExpires = new Date(trialEndDate).toLocaleDateString();

      // 1. Merchant activation confirmation
      try {
        await transporter.sendMail({
          from: fromAddr,
          to: merchantData.owner_email,
          subject: 'Your openTILL Account Has Been Activated',
          text: `Dear ${ownerName},\n\nCongratulations! Your openTILL account has been activated.\n\nBusiness Name: ${bizName}\nTrial Period: 30 days\nTrial Expires: ${trialExpires}\n\nYou can now log in and start using openTILL.\n\nBest regards,\nThe openTILL Team`,
        });
      } catch (emailError) {
        console.error('Failed to send merchant activation email:', emailError);
      }

      // 2. Notify all platform admins (admin / super_admin / root_admin)
      try {
        const adminUsers = await base44.asServiceRole.entities.User.list();
        const adminEmails = (adminUsers || [])
          .filter(u => u.role === 'admin' || u.role === 'super_admin' || u.role === 'root_admin')
          .map(u => u.email)
          .filter(Boolean);
        for (const adminEmail of adminEmails) {
          try {
            await transporter.sendMail({
              from: fromAddr,
              to: adminEmail,
              subject: `Merchant Activated: ${bizName}`,
              text: `A merchant account has been activated.\n\nBusiness: ${bizName}\nOwner: ${ownerName}\nEmail: ${sanitizeForEmail(merchantData.owner_email)}\nTrial Expires: ${trialExpires}\n\nThis is an automated notification from openTILL.`,
            });
          } catch (adminErr) {
            console.error(`Failed to notify admin ${adminEmail}:`, adminErr);
          }
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
            await transporter.sendMail({
              from: fromAddr,
              to: interestedEmail,
              subject: `Your Referral Has Been Activated: ${bizName}`,
              text: `Good news! A merchant you referred has been activated on openTILL.\n\nBusiness: ${bizName}\nOwner: ${ownerName}\nTrial Expires: ${trialExpires}\n\nYou can view this merchant's progress from your ambassador dashboard.\n\nBest regards,\nThe openTILL Team`,
            });
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
        try {
          const transporter = nodemailer.createTransport({
            host: Deno.env.get('SMTP_HOST'),
            port: parseInt(Deno.env.get('SMTP_PORT') || '587'),
            secure: false,
            auth: {
              user: Deno.env.get('SMTP_USER'),
              pass: Deno.env.get('SMTP_PASS'),
            },
          });

          await transporter.sendMail({
            from: Deno.env.get('SMTP_USER'),
            to: merchantData.owner_email,
            subject: 'Your openTILL Application Status',
            text: `Dear ${sanitizeForEmail(merchantData.owner_name) || 'Applicant'},\n\nThank you for your interest in openTILL. Unfortunately, your application for ${sanitizeForEmail(merchantData.business_name)} has been rejected by our team.\n\nIf you have any questions, please contact our support team.\n\nBest regards,\nThe openTILL Team`,
          });
        } catch (emailError) {
          console.error('Failed to send rejection email:', emailError);
        }
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