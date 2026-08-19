import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Prepares a Solana send transaction SERVER-SIDE:
//   - fetches a recent blockhash (browser RPCs 403/timeout on mainnet)
//   - checks whether the recipient's Associated Token Account exists (SPL only)
// The client builds + signs the transaction locally (private key never leaves
// the browser), then calls broadcastSolanaTx to submit it.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body: any = {};
    try { body = await req.json(); } catch {}
    const destATA = (body.destATA || '').trim();

    const settings = await base44.asServiceRole.entities.DUCWalletSettings.list();
    const s: any = settings?.[0] || {};
    const net = s.default_network || 'mainnet';
    const rpcs = getRpcs(s, net);

    // 1. Latest blockhash
    let blockhash: string | null = null;
    let lastValidBlockHeight: number | null = null;
    let lastErr: string | null = null;
    for (const rpc of rpcs) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 10000);
        const res = await fetch(rpc, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0', id: 1, method: 'getLatestBlockhash',
            params: [{ commitment: 'confirmed' }],
          }),
          signal: ctrl.signal,
        });
        clearTimeout(t);
        const json: any = await res.json();
        if (json.error) { lastErr = json.error.message; continue; }
        blockhash = json.result?.value?.blockhash || null;
        lastValidBlockHeight = json.result?.value?.lastValidBlockHeight || null;
        lastErr = null;
        break;
      } catch (e) {
        lastErr = String((e as Error).message || e);
      }
    }

    // 2. Dest ATA existence check (SPL tokens only)
    let destExists = false;
    if (destATA) {
      for (const rpc of rpcs) {
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 10000);
          const res = await fetch(rpc, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0', id: 1, method: 'getAccountInfo',
              params: [destATA, { encoding: 'base64', commitment: 'confirmed' }],
            }),
            signal: ctrl.signal,
          });
          clearTimeout(t);
          const json: any = await res.json();
          if (json.error) { lastErr = json.error.message; continue; }
          destExists = !!(json.result?.value);
          lastErr = null;
          break;
        } catch (e) {
          lastErr = String((e as Error).message || e);
        }
      }
    }

    if (!blockhash) {
      return Response.json({ error: lastErr || 'Could not fetch blockhash' }, { status: 502 });
    }
    return Response.json({ blockhash, lastValidBlockHeight, destExists, error: lastErr });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});

function getRpcs(s: any, net: string): string[] {
  const rpcs: string[] = [];
  if (net === 'testnet') {
    if (s.rpc_testnet) rpcs.push(s.rpc_testnet);
    rpcs.push('https://api.testnet.solana.com');
  } else if (net === 'devnet') {
    if (s.rpc_devnet) rpcs.push(s.rpc_devnet);
    rpcs.push('https://api.devnet.solana.com');
  } else {
    if (s.rpc_mainnet) rpcs.push(s.rpc_mainnet);
    rpcs.push('https://api.mainnet-beta.solana.com');
  }
  return Array.from(new Set(rpcs.filter(Boolean)));
}