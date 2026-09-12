import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { Connection, PublicKey, Keypair } from 'npm:@solana/web3.js@1.95.8';
import { getOrCreateAssociatedTokenAccount, getAssociatedTokenAddress, transferChecked, TOKEN_PROGRAM_ID } from 'npm:@solana/spl-token@0.3.9';

/**
 * Daily Job: automatically pay out "available" $DUC merchant rewards (DUCReward)
 * to each merchant's configured Solana wallet, replacing the manual mock claim with
 * a real on-chain transfer. Only merchants with a configured Solana wallet
 * (settings.solana_pay.wallet_address) and rewards above the minimum claim threshold
 * are swept; the rest remain available for manual claim. Run daily via workflow.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // SECURITY: require an admin session OR a valid automation secret. Anonymous
    // internet callers are rejected; scheduled workflows pass the secret in args.
    const AUTOMATION_SECRET = Deno.env.get('AUTOMATION_SECRET') || '';
    let user = null;
    try { user = await base44.auth.me(); } catch (e) {}
    const isAdmin = user && ['admin', 'super_admin', 'root_admin'].includes(user.role);
    let body = {};
    try { body = await req.json(); } catch {}
    if (!isAdmin && body._internal_secret !== AUTOMATION_SECRET) {
      return Response.json({ error: 'Unauthorized: admin session or automation secret required' }, { status: 401 });
    }

    const results = { processed: 0, paid: 0, skipped: 0, errors: [], total_paid: 0 };

    // Global vault settings for the minimum claim threshold + $DUC mint.
    const globalSettings = await base44.asServiceRole.entities.DUCVaultSettings.filter({ merchant_id: null });
    const globalMinThreshold = globalSettings?.[0]?.minimum_claim_threshold || 10;

    const merchants = await base44.asServiceRole.entities.Merchant.filter({ status: 'active' });

    for (const merchant of merchants) {
      try {
        results.processed++;

        const wallet = merchant.settings?.solana_pay?.wallet_address;
        if (!wallet) {
          results.skipped++;
          continue;
        }

        const rewards = await base44.asServiceRole.entities.DUCReward.filter({
          merchant_id: merchant.id,
          status: 'available'
        });
        if (!rewards || rewards.length === 0) {
          results.skipped++;
          continue;
        }

        const totalAvailable = rewards.reduce((s, r) => s + (r.amount || 0), 0);

        // Per-merchant threshold override, else global.
        const merchantSettings = await base44.asServiceRole.entities.DUCVaultSettings.filter({ merchant_id: merchant.id });
        const minThreshold = merchantSettings?.[0]?.minimum_claim_threshold || globalMinThreshold;

        if (totalAvailable < minThreshold) {
          results.skipped++;
          continue;
        }

        const transferRes = await processSolana(base44, wallet, totalAvailable);
        if (!transferRes.success) {
          results.errors.push({ merchant_id: merchant.id, error: transferRes.error });
          continue;
        }

        // Mark all swept rewards as claimed with the real on-chain signature.
        for (const reward of rewards) {
          await base44.asServiceRole.entities.DUCReward.update(reward.id, {
            status: 'claimed',
            claimed_at: new Date().toISOString(),
            claimed_by: 'automation',
            transaction_signature: transferRes.destination.tx_signature,
            wallet_address: wallet
          });
        }

        await base44.asServiceRole.entities.SystemLog.create({
          merchant_id: merchant.id,
          log_type: 'merchant_action',
          action: '$DUC Rewards Auto-Paid',
          description: `Auto-paid ${totalAvailable} $DUC to merchant wallet ${wallet}`,
          user_email: user?.email || 'automation',
          severity: 'info',
          metadata: {
            amount: totalAvailable,
            tx_signature: transferRes.destination.tx_signature,
            reward_count: rewards.length
          }
        });

        results.paid++;
        results.total_paid += totalAvailable;
      } catch (e) {
        results.errors.push({ merchant_id: merchant.id, error: e.message });
      }
    }

    await base44.asServiceRole.entities.SystemLog.create({
      log_type: 'super_admin_action',
      action: 'Merchant Reward Payout Sweep',
      description: `Auto-paid ${results.total_paid} $DUC to ${results.paid} merchants`,
      user_email: user?.email || 'automation',
      severity: 'info',
      metadata: results
    });

    return Response.json({ success: true, results });
  } catch (error) {
    console.error('processMerchantRewardPayouts error:', error);
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
    console.error('processSolana (merchant rewards) error:', error);
    return { success: false, error: error.message || 'Solana transfer failed' };
  }
}