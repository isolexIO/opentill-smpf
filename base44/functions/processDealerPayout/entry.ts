import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@17.4.0';
import { Connection, PublicKey, Keypair } from 'npm:@solana/web3.js@1.95.8';
import { getOrCreateAssociatedTokenAccount, getAssociatedTokenAddress, transfer } from 'npm:@solana/spl-token@0.3.9';

/**
 * Process a single dealer payout
 * Called by scheduler or manual trigger
 */

Deno.serve(async (req) => {
  // Init Stripe inside handler so missing key doesn't crash boot
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '');
  try {
    const base44 = createClientFromRequest(req);
    
    // Dual-mode: allow platform automation (no authenticated user) OR platform admin.
    // Ambassadors never process their own payouts.
    let user = null;
    try { user = await base44.auth.me(); } catch (e) { user = null; }
    if (user && !['root_admin', 'admin', 'super_admin'].includes(user.role)) {
      return Response.json({ error: 'Unauthorized - Platform admin only' }, { status: 403 });
    }

    const { payout_id } = await req.json();

    if (!payout_id) {
      return Response.json({ error: 'payout_id required' }, { status: 400 });
    }

    // Load payout
    const payouts = await base44.asServiceRole.entities.DealerPayout.filter({ id: payout_id });
    
    if (!payouts || payouts.length === 0) {
      return Response.json({ error: 'Payout not found' }, { status: 404 });
    }

    const payout = payouts[0];

    // Verify payout is in a processable state
    if (!['scheduled', 'failed'].includes(payout.status)) {
      return Response.json({ 
        error: `Payout cannot be processed in status: ${payout.status}` 
      }, { status: 400 });
    }

    // Load dealer
    const dealers = await base44.asServiceRole.entities.Ambassador.filter({ legacy_dealer_id: payout.dealer_id });
    if (!dealers || dealers.length === 0) {
      throw new Error('Dealer not found');
    }
    const dealer = dealers[0];

    // Check if dealer has payout destination configured
    if (!dealer.payout_destination || Object.keys(dealer.payout_destination).length === 0) {
      await base44.asServiceRole.entities.DealerPayout.update(payout_id, {
        status: 'on_hold',
        error_message: 'Payout destination not configured',
        notes: 'Dealer must configure payout method and destination before processing'
      });

      return Response.json({
        success: false,
        message: 'Payout destination not configured'
      });
    }

    // Update status to processing
    await base44.asServiceRole.entities.DealerPayout.update(payout_id, {
      status: 'processing',
      attempt_count: (payout.attempt_count || 0) + 1
    });

    let result;

    try {
      // Process based on payout method
      switch (payout.payout_method) {
        case 'stripe_connect':
          result = await processStripeConnect(dealer, payout);
          break;
        
        case 'solana':
          result = await processSolana(base44, dealer, payout);
          break;
        
        case 'manual':
          result = {
            success: false,
            message: 'Manual payout requires admin action'
          };
          break;
        
        default:
          throw new Error(`Unsupported payout method: ${payout.payout_method}`);
      }

      if (result.success) {
        // Payout successful
        await base44.asServiceRole.entities.DealerPayout.update(payout_id, {
          status: 'completed',
          processed_at: new Date().toISOString(),
          payout_destination: result.destination,
          fees: result.fees || 0,
          error_message: null
        });

        // Update dealer totals
        await base44.asServiceRole.entities.Ambassador.update(dealer.id, {
          commission_paid_out: (dealer.commission_paid_out || 0) + payout.commission_amount,
          commission_pending: Math.max(0, (dealer.commission_pending || 0) - payout.commission_amount),
          last_payout_date: new Date().toISOString()
        });

        // Log success
        await base44.asServiceRole.entities.SystemLog.create({
          log_type: 'super_admin_action',
          action: 'Dealer Payout Processed',
          description: `Payout of $${payout.commission_amount} processed for dealer ${dealer.name}`,
          user_email: user?.email || 'automation',
          user_role: user?.role || 'system',
          severity: 'info',
          metadata: { payout_id, dealer_id: dealer.id, method: payout.payout_method }
        });

        // Send notification to ambassador
        try {
          await base44.asServiceRole.functions.invoke('sendPayoutNotification', {
            ambassador_id: dealer.id,
            type: 'processed',
            amount: payout.commission_amount,
            merchant_names: payout.merchant_names || [],
            details: { transaction_id: result.destination?.stripe_transfer_id }
          });
        } catch (notifyError) {
          console.error('Notification sending failed:', notifyError);
        }
        
        return Response.json({
          success: true,
          message: 'Payout processed successfully',
          payout_id,
          amount: payout.commission_amount,
          method: payout.payout_method
        });

      } else {
        // Payout failed
        const attemptCount = payout.attempt_count + 1;
        const maxAttempts = 5;
        
        const newStatus = attemptCount >= maxAttempts ? 'manual_review' : 'failed';
        
        await base44.asServiceRole.entities.DealerPayout.update(payout_id, {
          status: newStatus,
          error_message: result.error || 'Unknown error',
          attempt_count: attemptCount
        });

        // Log failure
        await base44.asServiceRole.entities.SystemLog.create({
          log_type: 'super_admin_action',
          action: 'Dealer Payout Failed',
          description: `Payout failed for dealer ${dealer.name}: ${result.error}`,
          user_email: user?.email || 'automation',
          user_role: user?.role || 'system',
          severity: 'warning',
          metadata: { payout_id, dealer_id: dealer.id, attempt_count: attemptCount, error: result.error }
        });

        // Send failure notification
        try {
          await base44.asServiceRole.functions.invoke('sendPayoutNotification', {
            ambassador_id: dealer.id,
            type: 'failed',
            amount: payout.commission_amount,
            merchant_names: payout.merchant_names || [],
            error_message: result.error || 'Unknown error'
          });
        } catch (notifyError) {
          console.error('Notification sending failed:', notifyError);
        }

        return Response.json({
          success: false,
          message: result.error || 'Payout processing failed',
          attempt_count: attemptCount,
          status: newStatus
        });
      }

    } catch (processingError) {
      // Handle processing errors
      const attemptCount = (payout.attempt_count || 0) + 1;
      const maxAttempts = 5;
      
      const newStatus = attemptCount >= maxAttempts ? 'manual_review' : 'failed';
      
      await base44.asServiceRole.entities.DealerPayout.update(payout_id, {
        status: newStatus,
        error_message: processingError.message,
        attempt_count: attemptCount
      });

      throw processingError;
    }

  } catch (error) {
    console.error('Error processing dealer payout:', error);
    return Response.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});

async function processStripeConnect(dealer, payout) {
  try {
    if (!dealer.stripe_account_id) {
      return {
        success: false,
        error: 'Stripe account not connected'
      };
    }

    // Calculate amount in cents
    const amountCents = Math.round(payout.commission_amount * 100);

    // Create Stripe transfer
    const transfer = await stripe.transfers.create({
      amount: amountCents,
      currency: 'usd',
      destination: dealer.stripe_account_id,
      description: `Commission payout for period ${new Date(payout.period_start).toLocaleDateString()} - ${new Date(payout.period_end).toLocaleDateString()}`,
      metadata: {
        dealer_id: dealer.id,
        payout_id: payout.id,
        period_start: payout.period_start,
        period_end: payout.period_end
      }
    });

    return {
      success: true,
      destination: {
        stripe_account_id: dealer.stripe_account_id,
        stripe_transfer_id: transfer.id,
        transfer_status: transfer.status
      },
      fees: 0 // Stripe Connect transfers typically don't have fees for platform->connected account
    };

  } catch (error) {
    console.error('Stripe transfer error:', error);
    return {
      success: false,
      error: error.message || 'Stripe transfer failed'
    };
  }
}

async function processSolana(base44, dealer, payout) {
  try {
    if (!dealer.solana_wallet_address) {
      return {
        success: false,
        error: 'Solana wallet address not configured'
      };
    }

    // Validate recipient address
    let recipientPubkey;
    try {
      recipientPubkey = new PublicKey(dealer.solana_wallet_address);
    } catch (e) {
      return {
        success: false,
        error: 'Invalid Solana wallet address'
      };
    }

    // Resolve $DUC mint address from global vault settings
    const vaultSettings = await base44.asServiceRole.entities.cLINKVaultSettings.filter({ merchant_id: null });
    const ducMintAddress = vaultSettings?.[0]?.duc_mint_address;
    if (!ducMintAddress) {
      return {
        success: false,
        error: '$DUC mint address not configured in vault settings'
      };
    }

    // Load platform authority wallet
    const authoritySecretKey = Deno.env.get('SOLANA_AUTHORITY_PRIVATE_KEY');
    if (!authoritySecretKey) {
      return {
        success: false,
        error: 'Platform Solana wallet not configured'
      };
    }

    const network = Deno.env.get('SOLANA_NETWORK') || 'devnet';
    const rpcUrl = network === 'mainnet'
      ? 'https://api.mainnet-beta.solana.com'
      : 'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');
    const authorityKeypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(authoritySecretKey)));
    const mint = new PublicKey(ducMintAddress);

    // $DUC is treated 1:1 with USD for payout purposes (6 decimals)
    const decimals = 6;
    const usdAmount = payout.commission_amount;
    const ducAmountRaw = Math.floor(usdAmount * Math.pow(10, decimals));

    if (ducAmountRaw <= 0) {
      return {
        success: false,
        error: 'Payout amount too small to transfer'
      };
    }

    // Authority source token account
    const sourceATA = await getAssociatedTokenAddress(mint, authorityKeypair.publicKey);

    // Check treasury balance
    let sourceBalance = 0;
    try {
      const bal = await connection.getTokenAccountBalance(sourceATA);
      sourceBalance = bal.value?.uiAmount || 0;
    } catch (e) {
      // No source account exists
    }
    if (sourceBalance < usdAmount) {
      return {
        success: false,
        error: `Platform $DUC treasury insufficient (${sourceBalance} available, ${usdAmount} required)`
      };
    }

    // Recipient token account (create if it doesn't exist, authority funds it)
    const destATA = await getOrCreateAssociatedTokenAccount(
      connection,
      authorityKeypair,
      mint,
      recipientPubkey
    );

    // Transfer $DUC tokens
    const signature = await transfer(
      connection,
      authorityKeypair,
      sourceATA,
      destATA.address,
      authorityKeypair.publicKey,
      ducAmountRaw,
      [],
      { commitment: 'confirmed' }
    );
    await connection.confirmTransaction(signature, 'confirmed');

    return {
      success: true,
      destination: {
        solana_wallet: dealer.solana_wallet_address,
        tx_signature: signature,
        duc_amount: usdAmount,
        duc_mint: ducMintAddress
      },
      fees: 0
    };
  } catch (error) {
    console.error('Solana transfer error:', error);
    return {
      success: false,
      error: error.message || 'Solana transfer failed'
    };
  }
}