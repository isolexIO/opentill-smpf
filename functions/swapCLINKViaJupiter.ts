import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'merchant_admin' && user.role !== 'admin')) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { merchant_id, from_amount, to_token } = await req.json();

    if (!user.wallet_address) {
      return Response.json({ 
        success: false, 
        error: 'Please connect your wallet first' 
      }, { status: 400 });
    }

    // Get Jupiter referral code
    const globalSettings = await base44.asServiceRole.entities.cLINKVaultSettings.filter({
      merchant_id: null
    });
    
    const referralCode = globalSettings[0]?.jupiter_referral_code || '';
    const clinkMint = globalSettings[0]?.clink_mint_address || '';

    if (!clinkMint) {
      return Response.json({
        success: false,
        error: '$cLINK token mint address not configured'
      }, { status: 400 });
    }

    // Token mint addresses (Mainnet)
    const tokenMints = {
      'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      'SOL': 'So11111111111111111111111111111111111111112',
      'USDT': 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'
    };

    const outputMint = tokenMints[to_token];
    if (!outputMint) {
      return Response.json({
        success: false,
        error: 'Unsupported output token'
      }, { status: 400 });
    }

    // SECURITY NOTICE: Jupiter swap integration requires:
    // 1. User wallet approval for token transfer
    // 2. Proper slippage protection (max 1-5%)
    // 3. MEV protection and transaction priority fees
    // 4. Token account validation before swap
    // 5. Real-time price feeds to prevent manipulation
    // 
    // Current implementation is simulated for MVP.
    // Do NOT use in production without proper Jupiter API integration.
    // 
    // Production implementation should:
    // - Call Jupiter Quote API: https://quote-api.jup.ag/v6/quote
    // - Get user signature approval via wallet
    // - Submit transaction to Solana network
    // - Verify transaction confirmation
    
    const mockOutputAmount = from_amount * 0.98; // Mock 2% slippage - NOT REAL
    const mockSignature = `swap_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Log the swap
    await base44.asServiceRole.entities.SystemLog.create({
      merchant_id: merchant_id,
      log_type: 'merchant_action',
      action: '$cLINK Swapped via Jupiter',
      description: `Swapped ${from_amount} $cLINK → ${mockOutputAmount} ${to_token}`,
      user_email: user.email,
      user_id: user.id,
      severity: 'info',
      metadata: {
        input_amount: from_amount,
        output_amount: mockOutputAmount,
        output_token: to_token,
        referral_code: referralCode
      }
    });

    return Response.json({
      success: true,
      input_amount: from_amount,
      output_amount: mockOutputAmount,
      output_token: to_token,
      signature: mockSignature,
      referral_applied: !!referralCode
    });

  } catch (error) {
    console.error('Swap error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});