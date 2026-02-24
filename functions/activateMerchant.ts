import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

      // Send activation email
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: merchantData.owner_email,
          subject: 'Your openTILL Account Has Been Activated',
          body: `Dear ${merchantData.owner_name || 'Merchant'},\n\nCongratulations! Your openTILL account has been activated.\n\nBusiness Name: ${merchantData.business_name}\nTrial Period: 30 days\nTrial Expires: ${new Date(trialEndDate).toLocaleDateString()}\n\nYou can now log in and start using openTILL.\n\nBest regards,\nThe openTILL Team`
        });
      } catch (emailError) {
        console.error('Failed to send activation email:', emailError);
        // Continue anyway - activation was successful
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
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: merchantData.owner_email,
            subject: 'Your openTILL Application Status',
            body: `Dear ${merchantData.owner_name || 'Applicant'},\n\nThank you for your interest in openTILL. Unfortunately, your application for ${merchantData.business_name} has been rejected by our team.\n\nIf you have any questions, please contact our support team.\n\nBest regards,\nThe openTILL Team`
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