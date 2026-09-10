import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { Connection, PublicKey } from 'npm:@solana/web3.js@1.87.6';
import { findReference, FindReferenceError } from 'npm:@solana/pay@0.2.5';

// In-memory negative-result cache. Repeated polls for the same reference
// (legitimate customer polling or abusive probing) collapse into at most
// one RPC lookup per TTL window, protecting the platform's RPC rate limits.
const notFoundCache = new Map<string, number>();
const NOT_FOUND_TTL_MS = 10_000;

// In-memory per-IP rate limiting. This function is a public polling endpoint
// called from the customer-facing checkout display, so it cannot require a
// logged-in user. Rate-limiting prevents anonymous RPC-abuse probing.
const ipHits = new Map<string, number[]>();
const IP_WINDOW_MS = 60_000;  // 1 minute
const IP_MAX = 30;

function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

Deno.serve(async (req) => {
  try {
    // Rate-limit anonymous callers to protect this public polling endpoint.
    const now = Date.now();
    const clientIp = getClientIp(req);
    const hits = (ipHits.get(clientIp) || []).filter(t => now - t < IP_WINDOW_MS);
    if (hits.length >= IP_MAX) {
      return Response.json({
        success: false,
        error: 'Too many requests. Please try again later.'
      }, { status: 429 });
    }
    hits.push(now);
    ipHits.set(clientIp, hits);
    if (ipHits.size > 5000) ipHits.clear();

    const { reference, network, rpc_url } = await req.json();

    if (!reference) {
      return Response.json({
        success: false,
        error: 'Reference is required'
      }, { status: 400 });
    }

    console.log('findSolanaPayTransaction: Checking reference:', reference);
    console.log('findSolanaPayTransaction: Network:', network || 'mainnet');

    // SECURITY (SSRF): never trust a client-supplied `rpc_url` — an attacker
    // could point this at internal/private addresses (e.g. cloud metadata) and
    // the backend would issue requests there. The endpoint is chosen solely
    // from the `network` selector, mapping to hardcoded trusted Solana RPC
    // URLs. The request-body `rpc_url` value is intentionally ignored.
    let rpcEndpoint;
    if (network === 'devnet') {
      rpcEndpoint = 'https://api.devnet.solana.com';
    } else {
      rpcEndpoint = 'https://api.mainnet-beta.solana.com';
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

    // Serve a cached "not found" if we recently checked this reference, so
    // repeated polling doesn't re-issue RPC lookups every call.
    const cacheKey = `${network || 'mainnet'}:${reference}`;
    const cachedExpiry = notFoundCache.get(cacheKey);
    if (cachedExpiry != null && Date.now() < cachedExpiry) {
      console.log('findSolanaPayTransaction: Returning cached not-found');
      return Response.json({
        success: true,
        found: false,
        error: 'Transaction not found yet'
      });
    }

    try {
      console.log('findSolanaPayTransaction: Searching for transaction...');
      
      // findReference will throw if not found
      const signatureInfo = await findReference(connection, referencePubkey, {
        finality: 'confirmed'
      });

      console.log('findSolanaPayTransaction: Transaction found!');
      console.log('findSolanaPayTransaction: Signature:', signatureInfo.signature);

      notFoundCache.delete(cacheKey);
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
        // Bounded cache: prune expired entries if the map grows large.
        if (notFoundCache.size > 5000) {
          const now = Date.now();
          for (const [k, exp] of notFoundCache) if (exp <= now) notFoundCache.delete(k);
        }
        notFoundCache.set(cacheKey, Date.now() + NOT_FOUND_TTL_MS);
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