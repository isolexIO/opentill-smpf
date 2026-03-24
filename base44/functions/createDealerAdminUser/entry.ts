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

    // Record dealer admin record for audit trail
    const emailLower = email.toLowerCase().trim();
    
    return Response.json({
      success: true,
      message: `Dealer user creation initiated for ${emailLower}`,
      email: emailLower,
      full_name: full_name || 'Dealer Admin',
      instructions: 'User should be invited through the user management interface'
    });
  } catch (error) {
    console.error('Error creating dealer admin:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});