import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Fetches ALL SPL token accounts for a wallet address SERVER-SIDE.
// Browser RPCs can't reliably call getTokenAccountsByOwner (mainnet-beta 403s
// on Origin, publicnode times out), so we do the lookup here and return parsed
// token info the Send screen needs to populate its asset dropdown.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body: any = {};
    try { body = await req.json(); } catch {}
    const address = (body.address || '').trim();
    if (!address) return Response.json({ error: 'address required' }, { status: 400 });

    const settings = await base44.asServiceRole.entities.DUCWalletSettings.list();
    const s: any = settings?.[0] || {};
    const net = s.default_network || 'mainnet';

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

    const PROGRAMS = [
      { id: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', label: 'spl' },
      { id: 'TokenzQdBNbLqP5VEhdkAS6WTFLTGvp4ZgkQqJqZ6j5U', label: 'token2022' },
    ];

    const tokens: any[] = [];
    let lastErr: string | null = null;

    for (const prog of PROGRAMS) {
      const payload = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenAccountsByOwner',
        params: [address, { programId: prog.id }, { encoding: 'jsonParsed', commitment: 'confirmed' }],
      };
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
            if (!info) continue;
            const dec = Number(info.tokenAmount?.decimals || 0);
            const ui = Number(info.tokenAmount?.uiAmount || 0);
            if (ui <= 0) continue;
            tokens.push({
              mint: info.mint,
              decimals: dec,
              balance: ui,
              programId: prog.id,
              sourceATA: acc.pubkey,
            });
          }
          lastErr = null;
          break;
        } catch (e) {
          lastErr = String((e as Error).message || e);
        }
      }
    }

    return Response.json({ tokens, network: net, error: lastErr });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});