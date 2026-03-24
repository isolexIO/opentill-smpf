import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const previousWallet = user.wallet_address;

    // Remove wallet address from user
    await base44.auth.updateMe({
      wallet_address: null
    });

    // Log the action
    await base44.asServiceRole.entities.SystemLog.create({
      merchant_id: user.merchant_id || null,
      log_type: 'merchant_action',
      severity: 'info',
      action: 'Wallet Unlinked',
      description: `User ${user.email} unlinked wallet: ${previousWallet}`,
      user_id: user.id,
      user_email: user.email,
      user_role: user.role,
      metadata: {
        previous_wallet: previousWallet
      }
    });

    return Response.json({
      success: true,
      message: 'Wallet unlinked successfully'
    });

  } catch (error) {
    console.error('Unlink wallet error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});