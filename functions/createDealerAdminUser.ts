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

    // Invite user - this sends them an invite email to set their password
    await base44.asServiceRole.users.inviteUser(
      email.toLowerCase().trim(),
      'user'
    );

    // The user will need to accept the invite to set dealer_id manually or via a separate process
    return Response.json({
      success: true,
      message: `Invitation sent to ${email.toLowerCase().trim()}. They will need to accept to complete setup.`,
      email: email.toLowerCase().trim()
    });
  } catch (error) {
    console.error('Error creating dealer admin:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});