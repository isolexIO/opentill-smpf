import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { wallet_type } = await req.json();

    if (!wallet_type) {
      return Response.json({ error: 'wallet_type is required' }, { status: 400 });
    }

    const walletField = `${wallet_type}_wallet`;
    const previousWallet = user.pos_settings?.[walletField];

    // Remove the specific wallet from pos_settings
    const updatedPosSettings = { ...(user.pos_settings || {}) };
    delete updatedPosSettings[walletField];

    const updates = { pos_settings: updatedPosSettings };

    // If the unlinked wallet was the primary wallet_address, clear it too
    if (user.wallet_address && user.wallet_address === previousWallet) {
      updates.wallet_address = null;
    }

    await base44.auth.updateMe(updates);

    // Log the action
    await base44.asServiceRole.entities.SystemLog.create({
      merchant_id: user.merchant_id || null,
      log_type: 'merchant_action',
      severity: 'info',
      action: 'Wallet Unlinked',
      description: `User ${user.email} unlinked ${wallet_type} wallet: ${previousWallet}`,
      user_id: user.id,
      user_email: user.email,
      user_role: user.role,
      metadata: { previous_wallet: previousWallet, wallet_type }
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