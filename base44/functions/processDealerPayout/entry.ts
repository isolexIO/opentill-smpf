import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@17.4.0';
import { Connection, PublicKey, Keypair } from 'npm:@solana/web3.js@1.95.8';
import { getOrCreateAssociatedTokenAccount, getAssociatedTokenAddress, transferChecked, TOKEN_PROGRAM_ID } from 'npm:@solana/spl-token@0.3.9';

/**
 * Process a single dealer (ambassador) payout.
 * Supports three structures chosen by the super admin:
 *   - full_stripe : entire commission via Stripe Connect transfer
 *   - full_solana : entire commission as $DUC (Solana) token transfer
 *   - combo       : split between Stripe and $DUC (stripe_amount + duc_amount)
 * Called by the scheduler or manual trigger.
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

    // Load dealer (ambassador)
    const dealers = await base44.asServiceRole.entities.Ambassador.filter({ legacy_dealer_id: payout.dealer_id });
    if (!dealers || dealers.length === 0) {
      throw new Error('Dealer not found');
    }
    const dealer = dealers[0];

    // openTILL payout rule (deterministic — not admin-selectable):
    //   • The platform-percentage commission is paid to the ambassador via Stripe.
    //   • Every ambassador bonus (signup / per-active-merchant / milestone / carryover)
    //     is paid in $DUC via Solana.
    //   • Ad-hoc bonus payouts (payout_type 'bonus') go entirely as $DUC.
    //   • Manual payout_method still requires admin action.
    const isBonusPayout = payout.payout_type === 'bonus';

    if (!isBonusPayout && payout.payout_method === 'manual') {
      await base44.asServiceRole.entities.DealerPayout.update(payout_id, {
        status: 'on_hold',
        error_message: 'Manual payout requires admin action',
        notes: 'Manual payout method selected — admin must arrange payment manually'
      });
      return Response.json({ success: false, message: 'Manual payout requires admin action' });
    }

    let stripeAmount = 0;
    let ducAmount = 0;

    if (isBonusPayout) {
      ducAmount = payout.bonus_amount || payout.commission_amount || 0;
    } else {
      const bonusPortion = payout.bonus_amount || 0;
      const commissionPortion = Math.max(0, (payout.commission_amount || 0) - bonusPortion);
      stripeAmount = commissionPortion; // platform % commission (+ carryover) → Stripe
      ducAmount = bonusPortion;          // bonuses → $DUC via Solana
    }

    const splitMethod = isBonusPayout
      ? 'full_solana'
      : (stripeAmount > 0 && ducAmount > 0
        ? 'combo'
        : (stripeAmount > 0 ? 'full_stripe' : 'full_solana'));

    // Validate each portion has the required destination configured
    if (stripeAmount > 0 && !dealer.stripe_account_id) {
      await base44.asServiceRole.entities.DealerPayout.update(payout_id, {
        status: 'on_hold',
        error_message: 'Stripe account not connected for ambassador'
      });
      return Response.json({ success: false, message: 'Stripe account not connected for ambassador' });
    }
    if (ducAmount > 0 && !dealer.solana_wallet_address) {
      await base44.asServiceRole.entities.DealerPayout.update(payout_id, {
        status: 'on_hold',
        error_message: 'Solana wallet address not configured for ambassador'
      });
      return Response.json({ success: false, message: 'Solana wallet address not configured for ambassador' });
    }

    // Update status to processing and persist the resolved structure
    await base44.asServiceRole.entities.DealerPayout.update(payout_id, {
      status: 'processing',
      attempt_count: (payout.attempt_count || 0) + 1,
      split_method: splitMethod,
      stripe_amount: stripeAmount,
      duc_amount: ducAmount
    });

    const destination = {};
    let totalFees = 0;

    try {
      if (stripeAmount > 0) {
        const stripeRes = await processStripeConnect(dealer, payout, stripeAmount);
        if (!stripeRes.success) {
          throw new Error(`Stripe: ${stripeRes.error}`);
        }
        destination.stripe = stripeRes.destination;
        totalFees += stripeRes.fees || 0;
      }
      if (ducAmount > 0) {
        const solanaRes = await processSolana(base44, dealer, payout, ducAmount);
        if (!solanaRes.success) {
          throw new Error(`$DUC: ${solanaRes.error}`);
        }
        destination.solana = solanaRes.destination;
        totalFees += solanaRes.fees || 0;
      }

      // Payout successful
      await base44.asServiceRole.entities.DealerPayout.update(payout_id, {
        status: 'completed',
        processed_at: new Date().toISOString(),
        payout_destination: destination,
        fees: totalFees,
        error_message: null
      });

      // Update ambassador totals (always by the full commission amount)
      await base44.asServiceRole.entities.Ambassador.update(dealer.id, {
        commission_paid_out: (dealer.commission_paid_out || 0) + payout.commission_amount,
        commission_pending: Math.max(0, (dealer.commission_pending || 0) - payout.commission_amount),
        last_payout_date: new Date().toISOString()
      });

      await base44.asServiceRole.entities.SystemLog.create({
        log_type: 'super_admin_action',
        action: 'Dealer Payout Processed',
        description: `Payout of $${payout.commission_amount} (${splitMethod}) processed for dealer ${dealer.name}`,
        user_email: user?.email || 'automation',
        user_role: user?.role || 'system',
        severity: 'info',
        metadata: {
          payout_id,
          dealer_id: dealer.id,
          method: splitMethod,
          stripe_amount: stripeAmount,
          duc_amount: ducAmount
        }
      });

      // Send notification to ambassador
      try {
        await base44.asServiceRole.functions.invoke('sendPayoutNotification', {
          ambassador_id: dealer.id,
          type: 'processed',
          amount: payout.commission_amount,
          merchant_names: payout.merchant_names || [],
          details: {
            transaction_id: destination.stripe?.stripe_transfer_id || destination.solana?.tx_signature,
            split_method: splitMethod,
            stripe_amount: stripeAmount,
            duc_amount: ducAmount
          }
        });
      } catch (notifyError) {
        console.error('Notification sending failed:', notifyError);
      }

      return Response.json({
        success: true,
        message: 'Payout processed successfully',
        payout_id,
        amount: payout.commission_amount,
        method: splitMethod,
        destination,
        stripe_amount: stripeAmount,
        duc_amount: ducAmount
      });

    } catch (processingError) {
      // A portion failed — record partial destination for audit and retry
      const attemptCount = (payout.attempt_count || 0) + 1;
      const maxAttempts = 5;
      const newStatus = attemptCount >= maxAttempts ? 'manual_review' : 'failed';

      await base44.asServiceRole.entities.DealerPayout.update(payout_id, {
        status: newStatus,
        error_message: processingError.message,
        attempt_count: attemptCount,
        payout_destination: destination
      });

      try {
        await base44.asServiceRole.entities.SystemLog.create({
          log_type: 'super_admin_action',
          action: 'Dealer Payout Failed',
          description: `Payout failed for dealer ${dealer.name}: ${processingError.message}`,
          user_email: user?.email || 'automation',
          user_role: user?.role || 'system',
          severity: 'warning',
          metadata: {
            payout_id,
            dealer_id: dealer.id,
            attempt_count: attemptCount,
            split_method: splitMethod,
            stripe_amount: stripeAmount,
            duc_amount: ducAmount,
            error: processingError.message
          }
        });
      } catch (logErr) {
        console.error('Failed to log payout failure:', logErr);
      }

      try {
        await base44.asServiceRole.functions.invoke('sendPayoutNotification', {
          ambassador_id: dealer.id,
          type: 'failed',
          amount: payout.commission_amount,
          merchant_names: payout.merchant_names || [],
          error_message: processingError.message || 'Unknown error'
        });
      } catch (notifyError) {
        console.error('Notification sending failed:', notifyError);
      }

      return Response.json({
        success: false,
        message: processingError.message || 'Payout processing failed',
        attempt_count: attemptCount,
        status: newStatus,
        destination
      });
    }

  } catch (error) {
    console.error('Error processing dealer payout:', error);
    return Response.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});

async function processStripeConnect(dealer, payout, amount) {
  try {
    if (!dealer.stripe_account_id) {
      return { success: false, error: 'Stripe account not connected' };
    }

    const amountCents = Math.round(amount * 100);

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
        transfer_status: transfer.status,
        amount: amount
      },
      fees: 0
    };
  } catch (error) {
    console.error('Stripe transfer error:', error);
    return { success: false, error: error.message || 'Stripe transfer failed' };
  }
}

async function processSolana(base44, dealer, payout, amount) {
  try {
    if (!dealer.solana_wallet_address) {
      return { success: false, error: 'Solana wallet address not configured' };
    }

    let recipientPubkey;
    try {
      recipientPubkey = new PublicKey(dealer.solana_wallet_address);
    } catch (e) {
      return { success: false, error: 'Invalid Solana wallet address' };
    }

    // Resolve $DUC mint address from global vault settings
    const vaultSettings = await base44.asServiceRole.entities.cLINKVaultSettings.filter({ merchant_id: null });
    const ducMintAddress = vaultSettings?.[0]?.duc_mint_address;
    if (!ducMintAddress) {
      return { success: false, error: '$DUC mint address not configured in vault settings' };
    }

    const authoritySecretKey = Deno.env.get('SOLANA_AUTHORITY_PRIVATE_KEY');
    if (!authoritySecretKey) {
      return { success: false, error: 'Platform Solana wallet not configured' };
    }

    const network = (Deno.env.get('SOLANA_NETWORK') || 'devnet').toLowerCase();
    const rpcUrl = network.startsWith('mainnet')
      ? 'https://api.mainnet-beta.solana.com'
      : 'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');
    let authoritySecretKeyBytes;
    const trimmed = authoritySecretKey.trim();
    if (trimmed.startsWith('[')) {
      authoritySecretKeyBytes = new Uint8Array(JSON.parse(trimmed));
    } else {
      const bs58 = await import('npm:bs58@5.0.0');
      authoritySecretKeyBytes = new Uint8Array(bs58.default ? bs58.default.decode(trimmed) : bs58.decode(trimmed));
    }
    const authorityKeypair = Keypair.fromSecretKey(authoritySecretKeyBytes);
    const mint = new PublicKey(ducMintAddress);

    // $DUC is a Token-2022 mint; resolve the actual token program so ATAs and
    // transfers target the correct program (standard Token vs Token-2022).
    const mintAccountInfo = await connection.getAccountInfo(mint);
    const mintProgramId = mintAccountInfo?.owner
      ? new PublicKey(mintAccountInfo.owner)
      : TOKEN_PROGRAM_ID;

    // $DUC is treated 1:1 with USD for payout purposes (6 decimals)
    const decimals = 6;
    const usdAmount = amount;
    const ducAmountRaw = Math.floor(usdAmount * Math.pow(10, decimals));

    if (ducAmountRaw <= 0) {
      return { success: false, error: 'Payout amount too small to transfer' };
    }

    const sourceATA = await getAssociatedTokenAddress(mint, authorityKeypair.publicKey, true, mintProgramId);

    let sourceBalance = 0;
    try {
      const bal = await connection.getTokenAccountBalance(sourceATA, 'confirmed');
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

    const destATA = await getOrCreateAssociatedTokenAccount(
      connection,
      authorityKeypair,
      mint,
      recipientPubkey,
      true,
      null,
      undefined,
      mintProgramId
    );

    // Token-2022 requires the checked transfer variant (includes mint + decimals).
    const signature = await transferChecked(
      connection,
      authorityKeypair,
      sourceATA,
      mint,
      destATA.address,
      authorityKeypair.publicKey,
      ducAmountRaw,
      decimals,
      [],
      { commitment: 'confirmed' },
      mintProgramId
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
    return { success: false, error: error.message || 'Solana transfer failed' };
  }
}