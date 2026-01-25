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

    // Generate unique PIN
    let pin;
    let pinIsUnique = false;
    let attempts = 0;

    while (!pinIsUnique && attempts < 10) {
      pin = Math.floor(100000 + Math.random() * 900000).toString();
      const existingUsers = await base44.asServiceRole.entities.User.filter({ pin });
      if (!existingUsers || existingUsers.length === 0) {
        pinIsUnique = true;
      }
      attempts++;
    }

    if (!pinIsUnique) {
      return Response.json({ error: 'Failed to generate unique PIN' }, { status: 500 });
    }

    // Generate temp password
    const tempPassword = Math.random().toString(36).slice(-12);

    // Create dealer admin user
    const newUser = await base44.asServiceRole.entities.User.create({
      full_name: full_name || 'Dealer Admin',
      email: email.toLowerCase().trim(),
      role: 'admin',
      dealer_id: dealer_id,
      pin: pin,
      password_hash: tempPassword
    });

    return Response.json({
      success: true,
      user: newUser,
      credentials: {
        email: email.toLowerCase().trim(),
        pin: pin,
        password: tempPassword
      }
    });
  } catch (error) {
    console.error('Error creating dealer admin:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});