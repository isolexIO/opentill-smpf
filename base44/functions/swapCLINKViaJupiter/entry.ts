import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { Connection, VersionedTransaction } from 'npm:@solana/web3.js@1.87.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'merchant_admin' && user.role !== 'admin')) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { merchant_id, from_amount, to_token, action, signed_transaction } = await req.json();

    // Handle different actions: 'quote', 'prepare', 'verify'
    if (action === 'quote') {
      return await getSwapQuote(base44, { merchant_id, from_amount, to_token, user });
    } else if (action === 'prepare') {
      return await prepareSwapTransaction(base44, { merchant_id, from_amount, to_token, user });
    } else if (action === 'verify') {
      return await verifySwapTransaction(base44, { merchant_id, signed_transaction, user });
    }

    // Default to quote for backward compatibility
    const { merchant_id: mid, from_amount: amt, to_token: token } = await req.json();

    return await getSwapQuote(base44, { merchant_id: mid, from_amount: amt, to_token: token, user });

  } catch (error) {
    console.error('Swap error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});

// Get swap quote from Jupiter
async function getSwapQuote(base44, { merchant_id, from_amount, to_token, user }) {
  if (!user.wallet_address) {
    return Response.json({ 
      success: false, 
      error: 'Please connect your wallet first' 
    }, { status: 400 });
  }

  // Get Jupiter referral code and token settings
  const globalSettings = await base44.asServiceRole.entities.cLINKVaultSettings.filter({
    merchant_id: null
  });
  
  const clinkMint = globalSettings[0]?.clink_mint_address || '';
  const network = globalSettings[0]?.network || 'mainnet-beta';

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

  // Convert amount to lamports (assuming 9 decimals for $cLINK)
  const amountInLamports = Math.floor(from_amount * 1e9);

  try {
    // Call Jupiter Quote API
    const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${clinkMint}&outputMint=${outputMint}&amount=${amountInLamports}&slippageBps=50`;
    
    const quoteResponse = await fetch(quoteUrl);
    
    if (!quoteResponse.ok) {
      throw new Error(`Jupiter API error: ${quoteResponse.statusText}`);
    }

    const quoteData = await quoteResponse.json();

    // Calculate output amount (convert from lamports)
    const outputAmount = quoteData.outAmount / 1e9;
    const priceImpact = parseFloat(quoteData.priceImpactPct || 0);

    return Response.json({
      success: true,
      quote: {
        input_amount: from_amount,
        output_amount: outputAmount,
        output_token: to_token,
        price_impact_pct: priceImpact,
        route_plan: quoteData.routePlan,
        slippage_bps: 50 // 0.5%
      },
      quote_data: quoteData // Full quote for transaction preparation
    });

  } catch (error) {
    console.error('Jupiter quote error:', error);
    return Response.json({
      success: false,
      error: `Failed to get quote: ${error.message}`
    }, { status: 500 });
  }
}

// Prepare swap transaction for user to sign
async function prepareSwapTransaction(base44, { merchant_id, from_amount, to_token, user }) {
  if (!user.wallet_address) {
    return Response.json({ 
      success: false, 
      error: 'Please connect your wallet first' 
    }, { status: 400 });
  }

  // Get settings
  const globalSettings = await base44.asServiceRole.entities.cLINKVaultSettings.filter({
    merchant_id: null
  });
  
  const referralAccount = globalSettings[0]?.jupiter_referral_account || null;
  const clinkMint = globalSettings[0]?.clink_mint_address || '';

  if (!clinkMint) {
    return Response.json({
      success: false,
      error: '$cLINK token mint address not configured'
    }, { status: 400 });
  }

  const tokenMints = {
    'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    'SOL': 'So11111111111111111111111111111111111111112',
    'USDT': 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'
  };

  const outputMint = tokenMints[to_token];
  const amountInLamports = Math.floor(from_amount * 1e9);

  try {
    // Get quote first
    const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${clinkMint}&outputMint=${outputMint}&amount=${amountInLamports}&slippageBps=50`;
    const quoteResponse = await fetch(quoteUrl);
    const quoteData = await quoteResponse.json();

    // Get swap transaction
    const swapRequest = {
      quoteResponse: quoteData,
      userPublicKey: user.wallet_address,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto'
    };

    if (referralAccount) {
      swapRequest.feeAccount = referralAccount;
    }

    const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(swapRequest)
    });

    if (!swapResponse.ok) {
      throw new Error(`Jupiter swap API error: ${swapResponse.statusText}`);
    }

    const swapData = await swapResponse.json();

    return Response.json({
      success: true,
      transaction: swapData.swapTransaction, // Serialized transaction for client to sign
      last_valid_block_height: swapData.lastValidBlockHeight,
      quote_data: quoteData
    });

  } catch (error) {
    console.error('Jupiter swap preparation error:', error);
    return Response.json({
      success: false,
      error: `Failed to prepare swap: ${error.message}`
    }, { status: 500 });
  }
}

// Verify swap transaction after user signs and submits
async function verifySwapTransaction(base44, { merchant_id, signed_transaction, user }) {
  try {
    const globalSettings = await base44.asServiceRole.entities.cLINKVaultSettings.filter({
      merchant_id: null
    });
    
    const network = globalSettings[0]?.network || 'mainnet-beta';
    const rpcUrl = network === 'mainnet-beta' 
      ? 'https://api.mainnet-beta.solana.com'
      : 'https://api.devnet.solana.com';

    const connection = new Connection(rpcUrl, 'confirmed');

    // Deserialize and send transaction
    const txBuffer = Buffer.from(signed_transaction, 'base64');
    const transaction = VersionedTransaction.deserialize(txBuffer);

    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      maxRetries: 3
    });

    // Wait for confirmation
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');

    if (confirmation.value.err) {
      throw new Error('Transaction failed on-chain');
    }

    // Get transaction details
    const txDetails = await connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0
    });

    // Log successful swap
    await base44.asServiceRole.entities.SystemLog.create({
      merchant_id: merchant_id,
      log_type: 'merchant_action',
      action: '$cLINK Swapped via Jupiter',
      description: `Successfully swapped $cLINK via Jupiter`,
      user_email: user.email,
      user_id: user.id,
      severity: 'info',
      metadata: {
        signature: signature,
        slot: txDetails.slot
      }
    });

    return Response.json({
      success: true,
      signature: signature,
      confirmed: true,
      slot: txDetails.slot,
      block_time: txDetails.blockTime
    });

  } catch (error) {
    console.error('Swap verification error:', error);
    return Response.json({
      success: false,
      error: `Swap verification failed: ${error.message}`
    }, { status: 500 });
  }
}