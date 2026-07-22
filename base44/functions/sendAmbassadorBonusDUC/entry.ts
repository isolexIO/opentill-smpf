import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { Connection, PublicKey, Keypair } from 'npm:@solana/web3.js@1.95.8';
import { getOrCreateAssociatedTokenAccount, getAssociatedTokenAddress, transferChecked, TOKEN_PROGRAM_ID } from 'npm:@solana/spl-token@0.3.9';

/**
 * Send an ad-hoc $DUC bonus from the platform treasury to an ambassador's
 * Solana wallet. Platform admins only — ambassadors can never bonus themselves.
 *
 * Body: { ambassador_id, amount, note? }
 *   - amount is in $DUC, treated 1:1 with USD (6 decimals).
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || !['root_admin', 'admin', 'super_admin'].includes(user.role)) {
      return Response.json({ error: 'Unauthorized - Platform admin only' }, { status: 403 });
    }

    const { ambassador_id, amount, note } = await req.json();
    const ducAmount = Number(amount);

    if (!ambassador_id) {
      return Response.json({ error: 'ambassador_id is required' }, { status: 400 });
    }
    if (!ducAmount || ducAmount <= 0) {
      return Response.json({ error: 'A positive $DUC amount is required' }, { status: 400 });
    }

    // Load ambassador
    const ambassadors = await base44.asServiceRole.entities.Ambassador.filter({ id: ambassador_id });
    if (!ambassadors || ambassadors.length === 0) {
      return Response.json({ error: 'Ambassador not found' }, { status: 404 });
    }
    const ambassador = ambassadors[0];

    if (!ambassador.solana_wallet_address) {
      return Response.json({ error: 'Ambassador has no Solana wallet address configured' }, { status: 400 });
    }

    const now = new Date();
    const dealerKey = ambassador.legacy_dealer_id || ambassador.id;

    // Create a bonus payout record (scheduled) for audit trail.
    const payout = await base44.asServiceRole.entities.DealerPayout.create({
      dealer_id: dealerKey,
      period_start: now.toISOString(),
      period_end: now.toISOString(),
      gross_amount: 0,
      commission_amount: ducAmount,
      bonus_amount: ducAmount,
      payout_type: 'bonus',
      root_share: 0,
      payout_method: 'solana',
      split_method: 'full_solana',
      duc_amount: ducAmount,
      status: 'processing',
      scheduled_at: now.toISOString(),
      notes: `Ad-hoc $DUC bonus from ${user.email}${note ? ` — ${note}` : ''}`
    });

    // Resolve $DUC mint + authority wallet
    let recipientPubkey;
    try {
      recipientPubkey = new PublicKey(ambassador.solana_wallet_address);
    } catch (e) {
      await base44.asServiceRole.entities.DealerPayout.update(payout.id, {
        status: 'failed',
        error_message: 'Invalid Solana wallet address'
      });
      return Response.json({ error: 'Invalid Solana wallet address' }, { status: 400 });
    }

    const vaultSettings = await base44.asServiceRole.entities.cLINKVaultSettings.filter({ merchant_id: null });
    const ducMintAddress = vaultSettings?.[0]?.duc_mint_address;
    if (!ducMintAddress) {
      await base44.asServiceRole.entities.DealerPayout.update(payout.id, {
        status: 'failed',
        error_message: '$DUC mint address not configured in vault settings'
      });
      return Response.json({ error: '$DUC mint address not configured in vault settings' }, { status: 500 });
    }

    const authoritySecretKey = Deno.env.get('SOLANA_AUTHORITY_PRIVATE_KEY');
    if (!authoritySecretKey) {
      await base44.asServiceRole.entities.DealerPayout.update(payout.id, {
        status: 'failed',
        error_message: 'Platform Solana wallet not configured'
      });
      return Response.json({ error: 'Platform Solana wallet not configured' }, { status: 500 });
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
    const ducAmountRaw = Math.floor(ducAmount * Math.pow(10, decimals));
    if (ducAmountRaw <= 0) {
      await base44.asServiceRole.entities.DealerPayout.update(payout.id, {
        status: 'failed',
        error_message: 'Bonus amount too small to transfer'
      });
      return Response.json({ error: 'Bonus amount too small to transfer' }, { status: 400 });
    }

    const sourceATA = await getAssociatedTokenAddress(mint, authorityKeypair.publicKey, true, mintProgramId);

    let sourceBalance = 0;
    try {
      const bal = await connection.getTokenAccountBalance(sourceATA, 'confirmed');
      sourceBalance = bal.value?.uiAmount || 0;
    } catch (e) {
      // No source account exists
    }
    if (sourceBalance < ducAmount) {
      await base44.asServiceRole.entities.DealerPayout.update(payout.id, {
        status: 'failed',
        error_message: `Platform $DUC treasury insufficient (${sourceBalance} available, ${ducAmount} required)`
      });
      return Response.json({
        error: `Platform $DUC treasury insufficient (${sourceBalance} available, ${ducAmount} required)`
      }, { status: 400 });
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

    const destination = {
      solana: {
        solana_wallet: ambassador.solana_wallet_address,
        tx_signature: signature,
        duc_amount: ducAmount,
        duc_mint: ducMintAddress
      }
    };

    await base44.asServiceRole.entities.DealerPayout.update(payout.id, {
      status: 'completed',
      processed_at: new Date().toISOString(),
      payout_destination: destination,
      fees: 0,
      error_message: null
    });

    // Update ambassador totals (bonus counts as paid out, does not touch pending commission)
    await base44.asServiceRole.entities.Ambassador.update(ambassador.id, {
      commission_paid_out: (ambassador.commission_paid_out || 0) + ducAmount,
      last_payout_date: new Date().toISOString()
    });

    await base44.asServiceRole.entities.SystemLog.create({
      log_type: 'super_admin_action',
      action: 'Ambassador Bonus ($DUC)',
      description: `Bonus of ${ducAmount} $DUC sent to ambassador ${ambassador.name}`,
      user_email: user.email,
      user_role: user.role,
      severity: 'info',
      metadata: {
        payout_id: payout.id,
        ambassador_id: ambassador.id,
        amount: ducAmount,
        note: note || null,
        tx_signature: signature
      }
    });

    // Notify the ambassador
    try {
      await base44.asServiceRole.functions.invoke('sendPayoutNotification', {
        ambassador_id: ambassador.id,
        type: 'processed',
        amount: ducAmount,
        merchant_names: [],
        details: {
          transaction_id: signature,
          split_method: 'full_solana',
          bonus: true,
          note: note || null
        }
      });
    } catch (notifyError) {
      console.error('Notification sending failed:', notifyError);
    }

    return Response.json({
      success: true,
      payout_id: payout.id,
      amount: ducAmount,
      destination
    });
  } catch (error) {
    console.error('sendAmbassadorBonusDUC error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});