import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Verify user is admin
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { dealer_id, email, full_name } = await req.json();

    if (!dealer_id || !email) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Send email to user with setup link
    await base44.integrations.Core.SendEmail({
      to: email.toLowerCase().trim(),
      subject: `Welcome to ${user.full_name || 'ChainLINK'}`,
      body: `You've been added as a dealer administrator. Please visit the login page to set up your account.`
    });

    return Response.json({
      success: true,
      message: `Setup email sent to ${email.toLowerCase().trim()}`,
      email: email.toLowerCase().trim()
    });
  } catch (error) {
    console.error('Error creating dealer admin:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});