import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Fetches a wallet's $DUC (verified mint) balance SERVER-SIDE.
// Browser RPCs can't reliably call getTokenAccountsByOwner: api.mainnet-beta
// 403s on Origin headers and publicnode times out for this method. Server-side,
// api.mainnet-beta works fine, so we do the lookup here and return the amount.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body: any = {};
    try { body = await req.json(); } catch {}
    const address = (body.address || '').trim();
    if (!address) return Response.json({ error: 'address required' }, { status: 400 });

    // Read the verified DUC mint + active network from global settings.
    const settings = await base44.asServiceRole.entities.DUCWalletSettings.list();
    const s: any = settings?.[0] || {};
    const mint = (body.mint || s.verified_duc_mint || '').trim();
    const net = s.default_network || 'mainnet';
    if (!mint) return Response.json({ ducBalance: 0, mint: null, network: net });

    // Server-side RPCs (no CORS restriction). Mainnet-beta first.
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

    const payload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'getTokenAccountsByOwner',
      params: [address, { mint }, { encoding: 'jsonParsed', commitment: 'confirmed' }],
    };

    let bestAmount = 0;
    let lastErr: string | null = null;
    for (const rpc of rpcs) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 10000);
        const res = await fetch(rpc, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: ctrl.signal,
        });
        clearTimeout(t);
        const json: any = await res.json();
        if (json.error) { lastErr = json.error.message; continue; }
        for (const acc of json.result?.value || []) {
          const info = acc.account?.data?.parsed?.info;
          const amt = Number(info?.tokenAmount?.uiAmount || 0);
          if (amt > bestAmount) bestAmount = amt;
        }
        lastErr = null;
        break;
      } catch (e) {
        lastErr = String((e as Error).message || e);
      }
    }

    return Response.json({ ducBalance: bestAmount, mint, network: net, error: lastErr });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});