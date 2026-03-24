import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { Connection, PublicKey } from 'npm:@solana/web3.js@1.87.6';
import { findReference, FindReferenceError } from 'npm:@solana/pay@0.2.5';

Deno.serve(async (req) => {
  try {
    const { reference, network, rpc_url } = await req.json();

    if (!reference) {
      return Response.json({
        success: false,
        error: 'Reference is required'
      }, { status: 400 });
    }

    console.log('findSolanaPayTransaction: Checking reference:', reference);
    console.log('findSolanaPayTransaction: Network:', network || 'mainnet');

    // Use custom RPC URL if provided, otherwise use default
    // For production, consider using a private RPC endpoint like QuickNode, Helius, or Alchemy
    let rpcEndpoint = rpc_url;
    
    if (!rpcEndpoint) {
      if (network === 'devnet') {
        rpcEndpoint = 'https://api.devnet.solana.com';
      } else {
        // For mainnet, use a more reliable endpoint
        // Default to public endpoint but encourage custom RPC in settings
        rpcEndpoint = 'https://api.mainnet-beta.solana.com';
      }
    }

    console.log('findSolanaPayTransaction: Using RPC endpoint:', rpcEndpoint);

    const connection = new Connection(rpcEndpoint, {
      commitment: 'confirmed',
      // Add timeout and retry configuration
      confirmTransactionInitialTimeout: 60000,
    });

    let referencePubkey;
    try {
      referencePubkey = new PublicKey(reference);
    } catch (error) {
      return Response.json({
        success: false,
        error: 'Invalid reference public key'
      }, { status: 400 });
    }

    try {
      console.log('findSolanaPayTransaction: Searching for transaction...');
      
      // findReference will throw if not found
      const signatureInfo = await findReference(connection, referencePubkey, {
        finality: 'confirmed'
      });

      console.log('findSolanaPayTransaction: Transaction found!');
      console.log('findSolanaPayTransaction: Signature:', signatureInfo.signature);

      return Response.json({
        success: true,
        found: true,
        signature: signatureInfo.signature,
        slot: signatureInfo.slot
      });

    } catch (error) {
      // Check if it's a rate limit error (429)
      if (error.message && (error.message.includes('429') || error.message.includes('Too Many Requests'))) {
        console.log('findSolanaPayTransaction: Rate limited by RPC endpoint');
        return Response.json({
          success: false,
          error: 'Rate limited - will retry automatically',
          rate_limited: true
        }, { status: 200 }); // Return 200 so the frontend handles it gracefully
      }

      // FindReferenceError means transaction not found yet (expected while waiting)
      if (error instanceof FindReferenceError) {
        console.log('findSolanaPayTransaction: Transaction not found yet (expected)');
        return Response.json({
          success: true,
          found: false,
          error: 'Transaction not found yet'
        });
      }

      // Other errors
      console.error('findSolanaPayTransaction: Error:', error);
      return Response.json({
        success: false,
        error: error.message || 'Error checking transaction'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('findSolanaPayTransaction: Fatal error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Failed to check transaction'
    }, { status: 500 });
  }
});