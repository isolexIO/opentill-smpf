import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { Connection, PublicKey } from 'npm:@solana/web3.js@1.95.8';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { wallet_address, chips } = await req.json();

    if (!wallet_address || !chips) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Connect to Solana mainnet
    const connection = new Connection('https://api.mainnet-beta.solana.com');
    const walletPubkey = new PublicKey(wallet_address);

    // Get all token accounts for this wallet
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(walletPubkey, {
      programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
    });

    // Build a map of mint addresses (NFT collections) to counts
    const nftCounts = {};
    for (const account of tokenAccounts.value) {
      const mint = account.account.data.parsed.info.mint;
      const amount = parseInt(account.account.data.parsed.info.tokenAmount.amount);
      
      if (amount > 0) {
        nftCounts[mint] = (nftCounts[mint] || 0) + amount;
      }
    }

    // Check each chip's requirements
    const unlockedChips = {};
    for (const chip of chips) {
      const requiredCollection = chip.collection;
      const requiredCount = chip.required_count || 1;
      const userNftCount = nftCounts[requiredCollection] || 0;

      unlockedChips[chip.id] = {
        unlocked: userNftCount >= requiredCount,
        nft_count: userNftCount,
        required_count: requiredCount
      };
    }

    return Response.json({
      success: true,
      unlocked_chips: unlockedChips,
      wallet_address
    });

  } catch (error) {
    console.error('NFT verification error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});