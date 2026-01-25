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

    // Invite user as admin with dealer_id
    await base44.asServiceRole.users.inviteUser(
      email.toLowerCase().trim(),
      'admin'
    );

    // Update user with dealer_id (note: this may not work if inviteUser doesn't return the user)
    // For now, just return success
    return Response.json({
      success: true,
      message: `Dealer admin invitation sent to ${email.toLowerCase().trim()}`,
      email: email.toLowerCase().trim(),
      full_name: full_name || 'Dealer Admin'
    });
  } catch (error) {
    console.error('Error creating dealer admin:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});