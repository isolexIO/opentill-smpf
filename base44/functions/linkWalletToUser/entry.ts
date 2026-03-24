import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { wallet_address } = await req.json();

    if (!wallet_address) {
      return Response.json({ error: 'Missing wallet_address' }, { status: 400 });
    }

    // Update user's wallet address
    await base44.auth.updateMe({
      wallet_address: wallet_address
    });

    // Log the action
    await base44.asServiceRole.entities.SystemLog.create({
      merchant_id: user.merchant_id || null,
      log_type: 'merchant_action',
      severity: 'info',
      action: 'Wallet Linked',
      description: `User ${user.email} linked wallet: ${wallet_address}`,
      user_id: user.id,
      user_email: user.email,
      user_role: user.role,
      metadata: {
        wallet_address: wallet_address
      }
    });

    return Response.json({
      success: true,
      wallet_address: wallet_address
    });

  } catch (error) {
    console.error('Link wallet error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});