import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'merchant_admin' && user.role !== 'admin')) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { merchant_id, amount } = await req.json();

    // SECURITY: Prevent cross-tenant IDOR — callers may only claim rewards
    // for their own merchant. Admins are exempt.
    if (user.role !== 'admin' && user.merchant_id !== merchant_id) {
      return Response.json({ error: 'Forbidden: cannot claim rewards for another merchant' }, { status: 403 });
    }

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
        error: `Minimum claim amount is ${minThreshold} $DUC`
      }, { status: 400 });
    }

    // SECURITY NOTICE: On-chain reward claiming requires:
    // 1. Smart contract with reward distribution logic
    // 2. Treasury wallet with sufficient $DUC balance
    // 3. Secure private key management for treasury
    // 4. User wallet signature approval (if user pays gas)
    // 5. Gas fee handling and transaction retry logic
    // 
    // Current implementation is database-only for MVP.
    // Do NOT use in production without proper on-chain token transfer.
    const mockSignature = `claim_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Claim rewards, carrying leftover forward on partial claims.
    let remaining = claimAmount;
    for (const reward of rewards) {
      if (remaining <= 0) break;

      const toUpdate = Math.min(reward.amount, remaining);

      if (toUpdate >= reward.amount) {
        // Fully consumed — mark this reward claimed.
        await base44.asServiceRole.entities.cLINKReward.update(reward.id, {
          status: 'claimed',
          claimed_at: new Date().toISOString(),
          claimed_by: user.id,
          transaction_signature: mockSignature,
          wallet_address: user.wallet_address
        });
      } else {
        // Partially consumed — keep the leftover available and record the
        // claimed portion as a separate claimed reward for the audit trail.
        await base44.asServiceRole.entities.cLINKReward.update(reward.id, {
          amount: reward.amount - toUpdate
        });
        await base44.asServiceRole.entities.cLINKReward.create({
          merchant_id: reward.merchant_id,
          reward_type: reward.reward_type,
          amount: toUpdate,
          processing_volume: reward.processing_volume,
          reward_percentage: reward.reward_percentage,
          period_start: reward.period_start,
          period_end: reward.period_end,
          source_reference: reward.source_reference,
          description: reward.description,
          metadata: { ...(reward.metadata || {}), claimed_from: reward.id, partial_claim: true },
          status: 'claimed',
          claimed_at: new Date().toISOString(),
          claimed_by: user.id,
          transaction_signature: mockSignature,
          wallet_address: user.wallet_address
        });
      }

      remaining -= toUpdate;
    }

    // Log the claim
    await base44.asServiceRole.entities.SystemLog.create({
      merchant_id: merchant_id,
      log_type: 'merchant_action',
      action: '$DUC Rewards Claimed',
      description: `Merchant claimed ${claimAmount} $DUC to wallet ${user.wallet_address}`,
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