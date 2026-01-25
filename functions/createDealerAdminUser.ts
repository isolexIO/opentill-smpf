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

    // Create user with dealer_id
    const newUser = await base44.asServiceRole.entities.User.create({
      email: email.toLowerCase().trim(),
      full_name: full_name || 'Dealer Admin',
      role: 'user',
      dealer_id: dealer_id
    });

    return Response.json({
      success: true,
      message: `Dealer user created successfully`,
      email: newUser.email,
      full_name: newUser.full_name,
      user_id: newUser.id
    });
  } catch (error) {
    console.error('Error creating dealer admin:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});