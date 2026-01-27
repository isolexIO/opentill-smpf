import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from 'npm:@solana/web3.js@1.87.6';
import { 
  TOKEN_PROGRAM_ID, 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction,
  createTransferInstruction 
} from 'npm:@solana/spl-token@0.3.9';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'merchant_admin' && user.role !== 'admin')) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { merchant_id, amount, action, signed_transaction } = await req.json();

    // Handle different actions: 'prepare', 'verify'
    if (action === 'prepare') {
      return await prepareStakeTransaction(base44, { merchant_id, amount, user });
    } else if (action === 'verify') {
      return await verifyStakeTransaction(base44, { merchant_id, amount, signed_transaction, user });
    }

    // Default to prepare for backward compatibility
    const { merchant_id: mid, amount: amt } = await req.json();

    return await prepareStakeTransaction(base44, { merchant_id: mid, amount: amt, user });

  } catch (error) {
    console.error('Stake error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});

// Prepare stake transaction
async function prepareStakeTransaction(base44, { merchant_id, amount, user }) {
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
  const clinkMint = globalSettings[0]?.clink_mint_address;
  const stakingVault = globalSettings[0]?.staking_vault_address;
  const network = globalSettings[0]?.network || 'mainnet-beta';

  if (!clinkMint) {
    return Response.json({
      success: false,
      error: '$cLINK token mint address not configured'
    }, { status: 400 });
  }

  if (!stakingVault) {
    return Response.json({
      success: false,
      error: 'Staking vault address not configured'
    }, { status: 400 });
  }

  try {
    const rpcUrl = network === 'mainnet-beta' 
      ? 'https://api.mainnet-beta.solana.com'
      : 'https://api.devnet.solana.com';

    const connection = new Connection(rpcUrl, 'confirmed');
    const userPubkey = new PublicKey(user.wallet_address);
    const mintPubkey = new PublicKey(clinkMint);
    const vaultPubkey = new PublicKey(stakingVault);

    // Get associated token accounts
    const userTokenAccount = await getAssociatedTokenAddress(
      mintPubkey,
      userPubkey
    );

    const vaultTokenAccount = await getAssociatedTokenAddress(
      mintPubkey,
      vaultPubkey
    );

    // Create transaction
    const transaction = new Transaction();

    // Check if vault token account exists, create if not
    const vaultAccountInfo = await connection.getAccountInfo(vaultTokenAccount);
    if (!vaultAccountInfo) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          userPubkey, // payer
          vaultTokenAccount,
          vaultPubkey, // owner
          mintPubkey
        )
      );
    }

    // Convert amount to token units (assuming 9 decimals)
    const amountInTokens = Math.floor(amount * 1e9);

    // Add transfer instruction
    transaction.add(
      createTransferInstruction(
        userTokenAccount,
        vaultTokenAccount,
        userPubkey,
        amountInTokens,
        [],
        TOKEN_PROGRAM_ID
      )
    );

    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userPubkey;

    // Serialize transaction for client to sign
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    });

    const base64Transaction = Buffer.from(serializedTransaction).toString('base64');

    return Response.json({
      success: true,
      transaction: base64Transaction,
      amount: amount,
      apy: apy,
      lockup_days: lockupDays,
      last_valid_block_height: lastValidBlockHeight
    });

  } catch (error) {
    console.error('Stake preparation error:', error);
    return Response.json({
      success: false,
      error: `Failed to prepare stake: ${error.message}`
    }, { status: 500 });
  }
}

// Verify stake transaction after user signs
async function verifyStakeTransaction(base44, { merchant_id, amount, signed_transaction, user }) {
  try {
    const globalSettings = await base44.asServiceRole.entities.cLINKVaultSettings.filter({
      merchant_id: null
    });
    
    const network = globalSettings[0]?.network || 'mainnet-beta';
    const apy = globalSettings[0]?.staking_apy || 12;
    const lockupDays = globalSettings[0]?.staking_lockup_days || 90;

    const rpcUrl = network === 'mainnet-beta' 
      ? 'https://api.mainnet-beta.solana.com'
      : 'https://api.devnet.solana.com';

    const connection = new Connection(rpcUrl, 'confirmed');

    // Deserialize and send transaction
    const txBuffer = Buffer.from(signed_transaction, 'base64');
    const transaction = Transaction.from(txBuffer);

    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      maxRetries: 3
    });

    // Wait for confirmation
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');

    if (confirmation.value.err) {
      throw new Error('Transaction failed on-chain');
    }

    const stakedAt = new Date();
    const unlocksAt = new Date(stakedAt.getTime() + lockupDays * 24 * 60 * 60 * 1000);

    // Create stake record with real on-chain signature
    const stake = await base44.asServiceRole.entities.cLINKStake.create({
      merchant_id: merchant_id,
      amount: amount,
      apy: apy,
      lockup_period_days: lockupDays,
      staked_at: stakedAt.toISOString(),
      unlocks_at: unlocksAt.toISOString(),
      status: 'active',
      transaction_signature: signature,
      wallet_address: user.wallet_address
    });

    // Log the stake
    await base44.asServiceRole.entities.SystemLog.create({
      merchant_id: merchant_id,
      log_type: 'merchant_action',
      action: '$cLINK Staked On-Chain',
      description: `Merchant staked ${amount} $cLINK at ${apy}% APY for ${lockupDays} days`,
      user_email: user.email,
      user_id: user.id,
      severity: 'info',
      metadata: {
        amount: amount,
        apy: apy,
        lockup_days: lockupDays,
        signature: signature
      }
    });

    return Response.json({
      success: true,
      amount: amount,
      apy: apy,
      lockup_days: lockupDays,
      unlocks_at: unlocksAt.toISOString(),
      signature: signature,
      stake_id: stake.id
    });

  } catch (error) {
    console.error('Stake verification error:', error);
    return Response.json({
      success: false,
      error: `Stake verification failed: ${error.message}`
    }, { status: 500 });
  }
}