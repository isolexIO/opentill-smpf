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

    // Get available rewards
    const rewards = await base44.asServiceRole.entities.cLINKReward.filter({
      merchant_id: merchant_id,
      status: 'available'
    });

    const totalAvailable = rewards.reduce((sum, r) => sum + r.amount, 0);
    const claimAmount = amount || totalAvailable;

    if (claimAmount > totalAvailable) {
      return Response.json({
        success: false,
        error: 'Insufficient available balance'
      }, { status: 400 });
    }

    // Check minimum threshold
    const settings = await base44.asServiceRole.entities.cLINKVaultSettings.filter({
      merchant_id: merchant_id
    });
    const globalSettings = await base44.asServiceRole.entities.cLINKVaultSettings.filter({
      merchant_id: null
    });
    
    const minThreshold = settings[0]?.minimum_claim_threshold || globalSettings[0]?.minimum_claim_threshold || 10;
    
    if (claimAmount < minThreshold) {
      return Response.json({
        success: false,
        error: `Minimum claim amount is ${minThreshold} $cLINK`
      }, { status: 400 });
    }

    // TODO: Implement actual on-chain transfer
    // This would use Solana web3.js to transfer tokens
    const mockSignature = `claim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Update rewards to claimed
    let remaining = claimAmount;
    for (const reward of rewards) {
      if (remaining <= 0) break;
      
      const toUpdate = Math.min(reward.amount, remaining);
      await base44.asServiceRole.entities.cLINKReward.update(reward.id, {
        status: 'claimed',
        claimed_at: new Date().toISOString(),
        claimed_by: user.id,
        transaction_signature: mockSignature,
        wallet_address: user.wallet_address
      });
      
      remaining -= toUpdate;
    }

    // Log the claim
    await base44.asServiceRole.entities.SystemLog.create({
      merchant_id: merchant_id,
      log_type: 'merchant_action',
      action: '$cLINK Rewards Claimed',
      description: `Merchant claimed ${claimAmount} $cLINK to wallet ${user.wallet_address}`,
      user_email: user.email,
      user_id: user.id,
      severity: 'info',
      metadata: {
        amount: claimAmount,
        signature: mockSignature
      }
    });

    return Response.json({
      success: true,
      amount: claimAmount,
      signature: mockSignature,
      wallet: user.wallet_address
    });

  } catch (error) {
    console.error('Claim error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});