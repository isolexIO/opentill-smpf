import React, { useState, useEffect } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, getMint } from '@solana/spl-token';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Coins, Plus, Loader2, Eye, EyeOff, AlertTriangle, RefreshCw } from 'lucide-react';
import { WSOL, getPrice } from '@/lib/smpfPrices';
import { getNetworkRpcList, withTimeout } from '@/lib/smpfRpc';
import { getTokenMeta } from '@/lib/smpfTokenMeta';

const HIDDEN_KEY = 'smpf_hidden_tokens';
const CUSTOM_KEY = 'smpf_custom_tokens';
function loadSet(k) { try { return new Set(JSON.parse(localStorage.getItem(k) || '[]')); } catch { return new Set(); } }
function saveSet(k, s) { localStorage.setItem(k, JSON.stringify([...s])); }

export default function TokensTab({ address, rpc, settings, refreshTrigger, ducBalance, ducLoading, onRefreshDuc }) {
  const [sol, setSol] = useState(null);
  const [solLoading, setSolLoading] = useState(false);
  const [solUsd, setSolUsd] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [hidden, setHidden] = useState(loadSet(HIDDEN_KEY));
  const [showHidden, setShowHidden] = useState(false);
  const [customMints, setCustomMints] = useState(loadSet(CUSTOM_KEY));
  const [mintInput, setMintInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [addInfo, setAddInfo] = useState(null);
  const [error, setError] = useState('');
  const [prices, setPrices] = useState({});
  const [meta, setMeta] = useState({});
  const ducMint = settings?.verified_duc_mint;
  // Use the admin-selected Solana cluster (mainnet / testnet / devnet).
  const rpcs = getNetworkRpcList(settings);
  const endpoint = rpcs[0];

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [endpoint]);
  useEffect(() => { if (refreshTrigger) load(); /* eslint-disable-next-line */ }, [refreshTrigger]);

  async function load() {
    setError('');
    setSolLoading(true);
    const rpcs = Array.from(new Set([
      endpoint,
      'https://solana-rpc.publicnode.com',
    ]));
    for (const rpc of rpcs) {
      try {
        const conn = new Connection(rpc, 'confirmed');
        setSol((await conn.getBalance(new PublicKey(address))) / 1e9);
        setSolLoading(false);
        break;
      } catch (e) {
        console.warn('SOL balance fetch failed on', rpc, e);
      }
    }
    setSolLoading(false);
    getPrice(WSOL).then(setSolUsd);
    // Fetch token accounts across multiple RPCs — api.mainnet-beta.solana.com
    // 403-blocks browser Origin headers, so a single-endpoint fetch silently
    // returns nothing. Try each RPC until one succeeds.
    const tokenRpcs = Array.from(new Set([
      endpoint,
      'https://solana-rpc.publicnode.com',
      'https://api.mainnet-beta.solana.com',
    ]));
    const owned = [];
    let tokenFetchOk = false;
    for (const rpc of tokenRpcs) {
      if (tokenFetchOk) break;
      try {
        const conn = new Connection(rpc, 'confirmed');
        for (const programId of [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID]) {
          try {
            const res = await withTimeout(
              conn.getParsedTokenAccountsByOwner(new PublicKey(address), { programId }),
              8000,
              'token-accounts',
            );
            for (const acc of res.value) {
              const info = acc.account.data?.parsed?.info;
              if (!info) continue;
              owned.push({ mint: info.mint, amount: Number(info.tokenAmount?.uiAmount || 0), decimals: Number(info.tokenAmount?.decimals || 0), program: programId.toBase58() });
            }
          } catch {}
        }
        tokenFetchOk = owned.length >= 0; // any non-throwing completion counts
        if (tokenFetchOk) break;
      } catch (e) {
        console.warn('Token account fetch failed on', rpc, e);
      }
    }
    setTokens(owned);
    // Fetch USD prices for owned tokens (best-effort, non-blocking)
    const priceMap = {};
    await Promise.all(owned.map(async (t) => {
      try {
        const p = await getPrice(t.mint);
        if (p !== null) priceMap[t.mint] = p;
      } catch {}
    }));
    setPrices(priceMap);
    // Fetch token metadata (images, names) best-effort.
    const metaMap = {};
    await Promise.all(owned.map(async (t) => {
      try {
        const m = await getTokenMeta(t.mint, settings);
        if (m) metaMap[t.mint] = m;
      } catch {}
    }));
    setMeta(metaMap);
    // Always fetch $DUC metadata for the dedicated card (even if not held).
    if (ducMint && !metaMap[ducMint]) {
      try {
        const dm = await getTokenMeta(ducMint, settings);
        if (dm) setMeta((prev) => ({ ...prev, [ducMint]: dm }));
      } catch {}
    }
  }

  async function addMint() {
    setError(''); setAddInfo(null);
    let pk; try { pk = new PublicKey(mintInput.trim()); } catch { return setError('Not a valid Solana public key.'); }
    setAdding(true);
    try {
      const conn = new Connection(endpoint, 'confirmed');
      // Validate it is a mint account, not a token account or wallet.
      let mintInfo;
      try { mintInfo = await getMint(conn, pk); } catch { throw new Error('Address is not a token mint account.'); }
      const owner = await conn.getAccountInfo(pk);
      const isToken2022 = owner?.owner?.toBase58() === TOKEN_2022_PROGRAM_ID.toBase58();
      const next = new Set(customMints); next.add(pk.toBase58()); setCustomMints(next); saveSet(CUSTOM_KEY, next);
      setAddInfo({
        mint: pk.toBase58(),
        decimals: mintInfo.decimals,
        supply: Number(mintInfo.supply) / Math.pow(10, mintInfo.decimals),
        mintAuthority: mintInfo.mintAuthority?.toBase58?.() || null,
        freezeAuthority: mintInfo.freezeAuthority?.toBase58?.() || null,
        program: isToken2022 ? 'Token-2022' : 'SPL Token',
      });
      setMintInput('');
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setAdding(false);
    }
  }

  function toggleHide(mint) {
    setHidden((prev) => { const n = new Set(prev); if (n.has(mint)) n.delete(mint); else n.add(mint); saveSet(HIDDEN_KEY, n); return n; });
  }

  const visibleTokens = tokens.filter((t) => showHidden || !hidden.has(t.mint));
  const customExtras = [...customMints].filter((m) => !tokens.some((t) => t.mint === m));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black">Tokens</h1>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-white/50 hover:text-white" onClick={onRefreshDuc} title="Refresh $DUC">
          <RefreshCw className={ducLoading ? 'w-3.5 h-3.5 animate-spin' : 'w-3.5 h-3.5'} />
        </Button>
      </div>

      {ducMint && (
        <Card className="bg-gradient-to-br from-indigo-600/20 to-purple-600/10 border-indigo-500/30">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {meta[ducMint]?.image ? (
                  <img src={meta[ducMint].image} alt="$DUC" className="w-8 h-8 rounded-full object-cover border border-indigo-400/40" onError={(e) => { e.target.style.display = 'none'; }} />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center">
                    <Coins className="w-4 h-4 text-indigo-300" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-white">$DUC</p>
                  <p className="text-[10px] text-white/50">{meta[ducMint]?.name || 'Digital Utility Credit'}</p>
                </div>
              </div>
              <div className="text-right">
                {ducLoading && ducBalance === null ? (
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-300" />
                ) : (
                  <p className="text-xl font-black text-white font-mono">{ducBalance !== null ? Number(ducBalance).toFixed(2) : '—'}</p>
                )}
              </div>
            </div>
            <p className="font-mono text-[10px] text-white/40 break-all pt-1">{ducMint}</p>
          </CardContent>
        </Card>
      )}

      {ducMint && !tokens.some((t) => t.mint === ducMint) && (
        <p className="text-sm text-yellow-200/80">$DUC mint configured but you hold no $DUC yet.</p>
      )}

      <Card className="bg-white/10 border-white/20">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between py-2 border-b border-white/10">
            <div className="flex items-center gap-2"><Coins className="w-4 h-4 text-white/60" /><span className="text-white">SOL</span></div>
            <div className="text-right">
              <p className="font-bold text-white">{solLoading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : sol !== null ? sol.toFixed(4) : '—'}</p>
              {solUsd !== null && sol !== null && <p className="text-xs text-white/40">≈ ${(sol * solUsd).toFixed(2)}</p>}
            </div>
          </div>

          {visibleTokens.map((t) => {
            const m = meta[t.mint];
            const isDuc = ducMint === t.mint;
            const label = isDuc ? '$DUC' : (m?.symbol || (m?.name ? m.name.slice(0, 12) : null));
            return (
              <div key={t.mint} className="flex items-center justify-between py-2 border-b border-white/10">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {m?.image ? (
                    <img src={m.image} alt={label || t.mint} className="w-8 h-8 rounded-full object-cover shrink-0 bg-white/10" onError={(e) => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                      <Coins className="w-4 h-4 text-white/50" />
                    </div>
                  )}
                  <div className="min-w-0">
                    {label ? (
                      <p className="text-sm font-semibold text-white truncate">{label}</p>
                    ) : (
                      <p className="font-mono text-xs break-all text-white">{t.mint}</p>
                    )}
                    <p className="text-[10px] text-white/40 truncate">{t.program === TOKEN_2022_PROGRAM_ID.toBase58() ? 'Token-2022' : 'SPL Token'}{isDuc ? ' · $DUC' : ''}{m?.name && !isDuc ? ` · ${m.name}` : ''}</p>
                    <p className="font-mono text-[9px] text-white/30 break-all truncate">{t.mint}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-right">
                  <div>
                    <span className="text-sm text-white">{t.amount.toFixed(t.decimals > 2 ? 4 : 0)}</span>
                    {prices[t.mint] != null && (
                      <p className="text-[10px] text-white/40">≈ ${(t.amount * prices[t.mint]).toFixed(2)}</p>
                    )}
                  </div>
                  <button onClick={() => toggleHide(t.mint)} className="text-white/40 hover:text-white/70">
                    {hidden.has(t.mint) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            );
          })}

          {customExtras.map((m) => (
            <div key={m} className="flex items-center justify-between py-2 border-b border-white/10 opacity-60">
              <div className="min-w-0"><p className="font-mono text-xs break-all text-white">{m}</p><p className="text-[10px] text-white/40">Custom · not held</p></div>
              <span className="text-xs text-white/40">0</span>
            </div>
          ))}

          {!visibleTokens.length && !customExtras.length && <p className="text-sm text-white/40 py-3 text-center">No token accounts found.</p>}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Label className="text-white text-sm">Add custom token by mint</Label>
        <button className="text-xs text-emerald-300" onClick={() => setShowHidden((s) => !s)}>{showHidden ? 'Hide hidden assets' : `Show hidden (${hidden.size})`}</button>
      </div>
      <div className="flex gap-2">
        <Input value={mintInput} onChange={(e) => setMintInput(e.target.value)} placeholder="Mint address" className="bg-white/10 border-white/20 text-white font-mono text-sm" />
        <Button onClick={addMint} disabled={adding || !mintInput} className="bg-white text-purple-700 hover:bg-gray-100">
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </Button>
      </div>
      {error && <p className="text-sm text-red-300">{error}</p>}
      {addInfo && (
        <Card className="bg-black/30 border-white/20">
          <CardContent className="p-3 text-xs space-y-1">
            <p className="font-mono break-all text-white/80">{addInfo.mint}</p>
            <p>Program: {addInfo.program} · Decimals: {addInfo.decimals}</p>
            <p>Mint authority: {addInfo.mintAuthority || 'none'} · Freeze authority: {addInfo.freezeAuthority || 'none'}</p>
            <p className="text-white/50">Token added to your list. Verify before trusting — never identify a token by symbol alone.</p>
          </CardContent>
        </Card>
      )}
      {showHidden && (
        <div className="flex items-start gap-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/30">
          <AlertTriangle className="w-4 h-4 text-yellow-300 shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-100/90">Hidden assets may include spam or scam tokens. Verify any mint before interacting.</p>
        </div>
      )}
    </div>
  );
}