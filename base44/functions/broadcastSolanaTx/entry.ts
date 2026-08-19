import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Broadcasts a pre-signed, serialized Solana transaction SERVER-SIDE.
// The client signs locally (private key never leaves the browser) and passes
// the base64-encoded wire-format transaction here; we forward it to the RPC
// and poll for confirmation. Browser RPCs 403/timeout on mainnet, so this
// is the only reliable way to submit a transaction from the web app.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body: any = {};
    try { body = await req.json(); } catch {}
    const serializedTx = (body.serializedTx || '').trim();
    if (!serializedTx) return Response.json({ error: 'serializedTx required' }, { status: 400 });

    const settings = await base44.asServiceRole.entities.DUCWalletSettings.list();
    const s: any = settings?.[0] || {};
    const net = s.default_network || 'mainnet';
    const rpcs = getRpcs(s, net);

    // 1. Broadcast (skipPreflight: false → RPC simulates first, returns errors)
    let signature: string | null = null;
    let lastErr: string | null = null;
    for (const rpc of rpcs) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 30000);
        const res = await fetch(rpc, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0', id: 1, method: 'sendTransaction',
            params: [serializedTx, { encoding: 'base64', skipPreflight: false, maxRetries: 0 }],
          }),
          signal: ctrl.signal,
        });
        clearTimeout(t);
        const json: any = await res.json();
        if (json.error) { lastErr = json.error.message; continue; }
        signature = json.result;
        lastErr = null;
        break;
      } catch (e) {
        lastErr = String((e as Error).message || e);
      }
    }

    if (!signature) {
      return Response.json({ error: lastErr || 'Broadcast failed' }, { status: 502 });
    }

    // 2. Poll for confirmation (up to ~20s)
    let confirmed = false;
    let confirmErr: string | null = null;
    for (let i = 0; i < 10 && !confirmed; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      for (const rpc of rpcs) {
        if (confirmed) break;
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 8000);
          const res = await fetch(rpc, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0', id: 1, method: 'getSignatureStatuses',
              params: [[signature]],
            }),
            signal: ctrl.signal,
          });
          clearTimeout(t);
          const json: any = await res.json();
          const status = json.result?.value?.[0];
          if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') {
            confirmed = true;
          } else if (status?.err) {
            confirmErr = JSON.stringify(status.err);
            confirmed = true; // exit loop — tx landed but failed
          }
        } catch {}
      }
    }

    return Response.json({ signature, confirmed, error: confirmErr });
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