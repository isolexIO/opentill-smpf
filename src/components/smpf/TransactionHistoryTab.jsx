import React, { useState, useEffect, useCallback } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink, RefreshCw, CheckCircle2, XCircle, Clock, Inbox } from 'lucide-react';

function formatTime(blockTime) {
  if (!blockTime) return '—';
  try {
    return new Date(blockTime * 1000).toLocaleString();
  } catch {
    return '—';
  }
}

function timeAgo(blockTime) {
  if (!blockTime) return '';
  const diff = Date.now() / 1000 - blockTime;
  if (diff < 0) return 'just now';
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function TransactionHistoryTab({ address, settings }) {
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const net = settings?.default_network === 'devnet' ? 'devnet' : 'mainnet';
  const configured = net === 'mainnet' ? settings?.rpc_mainnet : settings?.rpc_devnet;
  const publicRpcs = net === 'mainnet'
    ? ['https://solana-rpc.publicnode.com', 'https://api.mainnet-beta.solana.com']
    : ['https://api.devnet.solana.com'];
  const rpcs = Array.from(new Set([
    (typeof configured === 'string' && /^https?:\/\//.test(configured)) ? configured : null,
    ...publicRpcs,
  ].filter(Boolean)));
  const explorerSuffix = net === 'devnet' ? '?cluster=devnet' : '';

  const load = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    for (const rpc of rpcs) {
      try {
        const conn = new Connection(rpc, 'confirmed');
        const sigs = await conn.getSignaturesForAddress(new PublicKey(address), { limit: 50 });
        setTxs(sigs || []);
        setLoading(false);
        return;
      } catch (e) {
        console.warn('tx history fetch failed on', rpc, e);
      }
    }
    setError('Unable to load transaction history — public RPC may be rate-limited.');
    setLoading(false);
  }, [address, settings?.default_network, settings?.rpc_mainnet, settings?.rpc_devnet]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh history every 30 seconds
  useEffect(() => {
    if (!address) return;
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <Card className="bg-slate-900 border-white/10 text-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-400" /> Transaction History
            </CardTitle>
            <CardDescription className="text-white/60 text-xs">
              Recent on-chain transactions for this wallet. Auto-refreshes every 30s.
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/50 hover:text-white" onClick={load} title="Refresh history">
            <RefreshCw className={loading ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && txs.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          </div>
        ) : error ? (
          <div className="text-center py-10 space-y-3">
            <p className="text-xs text-amber-400">{error}</p>
            <Button variant="outline" size="sm" onClick={load} className="border-white/10 text-white hover:bg-white/5">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry
            </Button>
          </div>
        ) : txs.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <Inbox className="w-8 h-8 text-white/30 mx-auto" />
            <p className="text-xs text-white/50">No transactions yet. Sent or received transactions will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {txs.map((tx) => {
              const failed = !!tx.err;
              const sig = typeof tx.signature === 'string' ? tx.signature : '';
              return (
                <div key={sig || tx.slot} className="flex items-center gap-3 py-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${failed ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    {failed ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-white/80 truncate">{sig || '—'}</p>
                    <p className="text-[11px] text-white/40">
                      {timeAgo(tx.blockTime)} · {formatTime(tx.blockTime)} · Slot {tx.slot ?? '—'}
                    </p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${failed ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    {failed ? 'Failed' : (tx.confirmationStatus || 'Confirmed')}
                  </span>
                  {sig && (
                    <a
                      href={`https://solscan.io/tx/${sig}${explorerSuffix}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/40 hover:text-indigo-300 shrink-0"
                      title="View on Solscan"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}