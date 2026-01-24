import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'merchant_admin' && user.role !== 'admin')) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { merchant_id, amount } = await req.json();

    if (!user.wallet_address) {
      return Response.json({ 
        success: false, 
        error: 'Please connect your wallet first' 
      }, { status: 400 });
    }

    if (!amount || amount <= 0) {
      return Response.json({
        success: false,
        error: 'Invalid stake amount'
      }, { status: 400 });
    }

    // Get staking settings
    const settings = await base44.asServiceRole.entities.cLINKVaultSettings.filter({
      merchant_id: merchant_id
    });
    const globalSettings = await base44.asServiceRole.entities.cLINKVaultSettings.filter({
      merchant_id: null
    });
    
    const apy = settings[0]?.staking_apy || globalSettings[0]?.staking_apy || 12;
    const lockupDays = settings[0]?.staking_lockup_days || globalSettings[0]?.staking_lockup_days || 90;

    // TODO: Implement actual on-chain staking
    const mockSignature = `stake_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const stakedAt = new Date();
    const unlocksAt = new Date(stakedAt.getTime() + lockupDays * 24 * 60 * 60 * 1000);

    // Create stake record
    await base44.asServiceRole.entities.cLINKStake.create({
      merchant_id: merchant_id,
      amount: amount,
      apy: apy,
      lockup_period_days: lockupDays,
      staked_at: stakedAt.toISOString(),
      unlocks_at: unlocksAt.toISOString(),
      status: 'active',
      transaction_signature: mockSignature,
      wallet_address: user.wallet_address
    });

    // Log the stake
    await base44.asServiceRole.entities.SystemLog.create({
      merchant_id: merchant_id,
      log_type: 'merchant_action',
      action: '$cLINK Staked',
      description: `Merchant staked ${amount} $cLINK at ${apy}% APY for ${lockupDays} days`,
      user_email: user.email,
      user_id: user.id,
      severity: 'info',
      metadata: {
        amount: amount,
        apy: apy,
        lockup_days: lockupDays
      }
    });

    return Response.json({
      success: true,
      amount: amount,
      apy: apy,
      lockup_days: lockupDays,
      unlocks_at: unlocksAt.toISOString(),
      signature: mockSignature
    });

  } catch (error) {
    console.error('Stake error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});