import React, { useState, useEffect } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowDownLeft, ArrowUpRight, RefreshCw, ExternalLink, AlertCircle } from 'lucide-react';

function parseTx(parsed, sig, myAddress) {
  const me = myAddress;
  let type = 'Transaction';
  let direction = 'other';
  let asset = '';
  let amount = '';
  let counterparty = '';

  const instructions = parsed?.transaction?.message?.instructions || [];
  for (const ix of instructions) {
    const p = ix.parsed;
    if (p?.type === 'transfer' && p.program === 'system') {
      type = 'SOL transfer';
      asset = 'SOL';
      amount = (Number(p.info?.lamports || 0) / 1e9).toFixed(6);
      const src = p.info?.source;
      const dst = p.info?.destination;
      if (src === me) { direction = 'out'; counterparty = dst; }
      else if (dst === me) { direction = 'in'; counterparty = src; }
      break;
    }
    if (p?.type === 'transfer' && p.program === 'spl-token') {
      type = 'Token transfer';
      asset = p.info?.mint ? `${p.info.mint.slice(0, 4)}…${p.info.mint.slice(-4)}` : 'token';
      const dec = Number(p.info?.tokenAmount?.decimals || 0);
      amount = (Number(p.info?.tokenAmount?.amount || 0) / Math.pow(10, dec)).toFixed(dec > 0 ? 4 : 0);
      const auth = p.info?.authority;
      const src = p.info?.source;
      const dst = p.info?.destination;
      if (auth === me || src === me) { direction = 'out'; counterparty = dst; }
      else if (dst === me) { direction = 'in'; counterparty = src; }
      break;
    }
  }

  return {
    signature: sig.signature,
    type,
    direction,
    asset,
    amount,
    counterparty,
    fee: sig.fee ? (sig.fee / 1e9).toFixed(6) : '',
    status: sig.err ? 'failed' : 'confirmed',
    date: sig.blockTime ? new Date(sig.blockTime * 1000) : null,
    memo: sig.memo || '',
  };
}

export default function ActivityScreen({ address, rpc, network }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const explorer = network === 'devnet' ? 'https://solana.fm/tx' : 'https://solscan.io/tx';

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [address, rpc]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const conn = new Connection(rpc, 'confirmed');
      const sigs = await conn.getSignaturesForAddress(new PublicKey(address), { limit: 20 });
      const out = [];
      for (const s of sigs) {
        let parsed;
        try { parsed = await conn.getParsedTransaction(s.signature, 'confirmed'); } catch {}
        out.push(parseTx(parsed, s, address));
      }
      setItems(out);
    } catch (e) {
      setError('Network provider is temporarily unavailable. Please retry.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black">Activity</h1>
        <Button variant="outline" size="sm" className="border-white/20 text-white bg-transparent" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-emerald-400" /></div>
      ) : error ? (
        <Card className="bg-white/10 border-white/20"><CardContent className="p-6 text-center space-y-2">
          <AlertCircle className="w-8 h-8 mx-auto text-red-300" />
          <p className="text-white/70 text-sm">{error}</p>
        </CardContent></Card>
      ) : items.length === 0 ? (
        <Card className="bg-white/10 border-white/20"><CardContent className="p-8 text-center text-white/50 text-sm">No transactions yet.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {items.map((t) => (
            <Card key={t.signature} className="bg-white/10 border-white/20">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${t.direction === 'in' ? 'bg-emerald-500/20' : t.direction === 'out' ? 'bg-orange-500/20' : 'bg-white/10'}`}>
                    {t.direction === 'in' ? <ArrowDownLeft className="w-5 h-5 text-emerald-300" /> : t.direction === 'out' ? <ArrowUpRight className="w-5 h-5 text-orange-300" /> : <RefreshCw className="w-4 h-4 text-white/60" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{t.type}</span>
                      {t.status === 'failed' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300">failed</span>}
                    </div>
                    <p className="text-xs text-white/50">{t.date ? t.date.toLocaleString() : '—'}{t.counterparty ? ` · ${t.counterparty.slice(0,6)}…${t.counterparty.slice(-4)}` : ''}</p>
                  </div>
                  <div className="text-right">
                    {t.amount && <p className={`text-sm font-semibold ${t.direction === 'in' ? 'text-emerald-300' : t.direction === 'out' ? 'text-orange-300' : 'text-white/70'}`}>{t.direction === 'in' ? '+' : t.direction === 'out' ? '−' : ''}{t.amount} {t.asset}</p>}
                    {t.fee && <p className="text-[10px] text-white/40">fee {t.fee} SOL</p>}
                    <a href={`${explorer}/${t.signature}`} target="_blank" rel="noopener noreferrer" className="text-[11px] text-emerald-300 inline-flex items-center gap-0.5">explorer <ExternalLink className="w-3 h-3" /></a>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}