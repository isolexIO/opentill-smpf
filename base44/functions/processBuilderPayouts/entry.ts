import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { Connection, PublicKey, Keypair } from 'npm:@solana/web3.js@1.95.8';
import { getOrCreateAssociatedTokenAccount, getAssociatedTokenAddress, transferChecked, TOKEN_PROGRAM_ID } from 'npm:@solana/spl-token@0.3.9';

/**
 * Daily Job: find due BuilderPayouts (hold period elapsed) and process them via
 * $DUC (Solana) transfer to the builder's wallet. Run daily via workflow.
 * Builders earn in $DUC, so payouts are settled in $DUC only.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Dual-mode: platform automation (no user) OR admin manual trigger.
    let user = null;
    try { user = await base44.auth.me(); } catch (e) {}
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const now = new Date();
    const results = { scheduled: 0, processed: 0, failed: 0, on_hold: 0, errors: [] };

    const pending = await base44.asServiceRole.entities.BuilderPayout.filter({ status: 'pending' });

    for (const payout of pending) {
      try {
        // Only process payouts whose hold period has elapsed.
        if (!payout.scheduled_at || new Date(payout.scheduled_at) > now) continue;

        const builders = await base44.asServiceRole.entities.Builder.filter({ id: payout.builder_id });
        if (!builders || builders.length === 0) {
          results.errors.push({ payout_id: payout.id, error: 'Builder not found' });
          continue;
        }
        const builder = builders[0];

        if (builder.payout_method === 'manual') {
          await base44.asServiceRole.entities.BuilderPayout.update(payout.id, {
            status: 'on_hold',
            error_message: 'Manual payout requires admin action'
          });
          results.on_hold++;
          continue;
        }

        if (!builder.solana_wallet_address) {
          await base44.asServiceRole.entities.BuilderPayout.update(payout.id, {
            status: 'on_hold',
            error_message: 'No Solana wallet configured for builder'
          });
          results.on_hold++;
          continue;
        }

        await base44.asServiceRole.entities.BuilderPayout.update(payout.id, {
          status: 'scheduled',
          scheduled_at: now.toISOString()
        });
        results.scheduled++;

        const transferRes = await processSolana(base44, builder.solana_wallet_address, payout.commission_amount);
        if (!transferRes.success) {
          const attemptCount = (payout.attempt_count || 0) + 1;
          await base44.asServiceRole.entities.BuilderPayout.update(payout.id, {
            status: attemptCount >= 5 ? 'manual_review' : 'failed',
            error_message: transferRes.error,
            attempt_count: attemptCount
          });
          results.failed++;
          results.errors.push({ payout_id: payout.id, error: transferRes.error });
          continue;
        }

        await base44.asServiceRole.entities.BuilderPayout.update(payout.id, {
          status: 'completed',
          processed_at: new Date().toISOString(),
          payout_destination: { solana: transferRes.destination },
          fees: 0,
          error_message: null
        });

        await base44.asServiceRole.entities.Builder.update(builder.id, {
          last_payout: new Date().toISOString()
        });

        await base44.asServiceRole.entities.SystemLog.create({
          log_type: 'super_admin_action',
          action: 'Builder Payout Processed',
          description: `Payout of ${payout.commission_amount} $DUC to builder ${builder.full_name}`,
          user_email: user?.email || 'automation',
          severity: 'info',
          metadata: {
            payout_id: payout.id,
            builder_id: builder.id,
            tx_signature: transferRes.destination.tx_signature
          }
        });

        results.processed++;
      } catch (e) {
        results.errors.push({ payout_id: payout.id, error: e.message });
      }
    }

    return Response.json({ success: true, results });
  } catch (error) {
    console.error('processBuilderPayouts error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// $DUC (Token-2022) transfer from the platform treasury to a recipient wallet.
// Inlined (no local imports allowed). Mirrors the proven processDealerPayout path.
async function processSolana(base44, recipientWallet, amount) {
  try {
    let recipientPubkey;
    try {
      recipientPubkey = new PublicKey(recipientWallet);
    } catch (e) {
      return { success: false, error: 'Invalid Solana wallet address' };
    }

    const vaultSettings = await base44.asServiceRole.entities.DUCVaultSettings.filter({ merchant_id: null });
    const ducMintAddress = vaultSettings?.[0]?.duc_mint_address;
    if (!ducMintAddress) {
      return { success: false, error: '$DUC mint address not configured in vault settings' };
    }

    const authoritySecretKey = Deno.env.get('SOLANA_AUTHORITY_PRIVATE_KEY');
    if (!authoritySecretKey) {
      return { success: false, error: 'Platform Solana wallet not configured' };
    }

    const network = Deno.env.get('SOLANA_NETWORK') || 'devnet';
    const rpcUrl = network === 'mainnet'
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

    const mintAccountInfo = await connection.getAccountInfo(mint);
    const mintProgramId = mintAccountInfo?.owner
      ? new PublicKey(mintAccountInfo.owner)
      : TOKEN_PROGRAM_ID;

    const decimals = 6;
    const ducAmountRaw = Math.floor(amount * Math.pow(10, decimals));
    if (ducAmountRaw <= 0) {
      return { success: false, error: 'Payout amount too small to transfer' };
    }

    const sourceATA = await getAssociatedTokenAddress(mint, authorityKeypair.publicKey, true, mintProgramId);

    let sourceBalance = 0;
    try {
      const bal = await connection.getTokenAccountBalance(sourceATA, 'confirmed');
      sourceBalance = bal.value?.uiAmount || 0;
    } catch (e) {}
    if (sourceBalance < amount) {
      return {
        success: false,
        error: `Platform $DUC treasury insufficient (${sourceBalance} available, ${amount} required)`
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
        solana_wallet: recipientWallet,
        tx_signature: signature,
        duc_amount: amount,
        duc_mint: ducMintAddress
      }
    };
  } catch (error) {
    console.error('processSolana (builder) error:', error);
    return { success: false, error: error.message || 'Solana transfer failed' };
  }
}