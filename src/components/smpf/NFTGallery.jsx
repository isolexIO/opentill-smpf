import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Loader2, Image as ImageIcon, RefreshCw, AlertCircle, BadgeCheck, ExternalLink, ShieldAlert, Send,
} from 'lucide-react';

const HIDDEN_KEY = 'smpf_hidden_nfts';

function loadHidden() { try { return new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY) || '[]')); } catch { return new Set(); } }
function saveHidden(set) { localStorage.setItem(HIDDEN_KEY, JSON.stringify([...set])); }
function safeUrl(u) {
  if (!u) return null;
  try { const url = new URL(u); if (url.protocol === 'http:' || url.protocol === 'https:') return u; } catch {}
  return null;
}

export default function NFTGallery({ address, settings, network }) {
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [hidden, setHidden] = useState(loadHidden());
  const [showHidden, setShowHidden] = useState(false);
  const [selected, setSelected] = useState(null);

  const dasProvider = settings?.das_provider;
  const approvedChips = settings?.approved_chip_collections || [];
  const explorer = network === 'devnet' ? 'https://solana.fm/token' : 'https://solscan.io/token';

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [address, dasProvider]);

  async function load() {
    if (!dasProvider) { setLoading(false); setError('no-provider'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(dasProvider, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 'smpf', method: 'getAssetsByOwner', params: { ownerAddress: address, page: 1, limit: 100 } }),
      });
      const json = await res.json();
      const items = (json.result?.items || []).map((a) => ({
        id: a.id || a.mint,
        mint: a.mint || a.id,
        name: a.content?.metadata?.name || a.compression?.compressed ? 'Compressed NFT' : 'Untitled',
        image: safeUrl(a.content?.files?.[0]?.uri || a.content?.links?.image),
        description: a.content?.metadata?.description || '',
        collection: a.grouping?.[0]?.group_value || a.collection?.name,
        collectionVerified: a.collection?.verified || (a.grouping?.[0]?.group_verification || false),
        royalty: a.royalty?.percent ? a.royalty.percent / 100 : null,
        creators: (a.authorities || []).map((x) => x.address).filter(Boolean),
        standard: a.compression?.compressed ? 'Compressed' : a.tokenProgram ? a.tokenProgram.includes('TokenzQ') ? 'Token-2022' : 'Metaplex' : 'Metaplex',
        spam: !!a.spam,
        owner: a.ownership?.owner || address,
      }));
      setAssets(items);
    } catch {
      setError('NFT metadata could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  function toggleHide(id) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveHidden(next);
      return next;
    });
  }

  const filtered = assets.filter((a) => {
    if (!showHidden && hidden.has(a.id)) return false;
    if (filter === 'chips') return approvedChips.includes(a.collection) || approvedChips.includes(a.mint);
    if (filter === 'verified') return a.collectionVerified;
    if (filter === 'unverified') return !a.collectionVerified;
    if (filter === 'hidden') return hidden.has(a.id);
    return true;
  });

  const FILTERS = ['all', 'chips', 'verified', 'unverified', 'hidden'];

  if (error === 'no-provider') {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-black">NFTs</h1>
        <Card className="bg-white/10 border-white/20"><CardContent className="p-8 text-center space-y-2">
          <ShieldAlert className="w-8 h-8 mx-auto text-yellow-300" />
          <p className="text-white/60 text-sm">An administrator must configure a DAS indexing provider before NFTs can be discovered.</p>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black">NFTs</h1>
        <Button variant="outline" size="sm" className="border-white/20 text-white bg-transparent" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </Button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => { setFilter(f); setShowHidden(f === 'hidden' || showHidden); }} className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${filter === f ? 'bg-emerald-500/30 text-emerald-200' : 'bg-white/10 text-white/60'}`}>
            {f === 'all' ? 'All' : f === 'chips' ? 'openTILL Chips' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-400" /></div>
      ) : error ? (
        <Card className="bg-white/10 border-white/20"><CardContent className="p-6 text-center text-white/60 text-sm">{error}</CardContent></Card>
      ) : !filtered.length ? (
        <Card className="bg-white/10 border-white/20"><CardContent className="p-8 text-center space-y-2">
          <ImageIcon className="w-10 h-10 mx-auto text-white/30" />
          <p className="text-white/50 text-sm">No NFTs found{filter !== 'all' ? ' in this filter' : ''}.</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {filtered.map((a) => (
            <button key={a.id} onClick={() => setSelected(a)} className="text-left bg-white/10 rounded-xl overflow-hidden border border-white/10 hover:border-white/30 transition-colors">
              {a.image ? (
                <img src={a.image} alt="" referrerPolicy="no-referrer" className="w-full aspect-square object-cover bg-black/30" onError={(e) => { e.target.style.display = 'none'; }} />
              ) : (
                <div className="w-full aspect-square bg-black/30 flex items-center justify-center"><ImageIcon className="w-8 h-8 text-white/20" /></div>
              )}
              <div className="p-2">
                <p className="text-xs font-medium truncate">{a.name}</p>
                <p className="text-[10px] text-white/40 truncate">{a.collection || 'Uncollected'} {a.collectionVerified && <BadgeCheck className="w-3 h-3 inline text-emerald-300" />}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg bg-slate-900 border-white/20 text-white">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">{selected.name} {selected.collectionVerified && <BadgeCheck className="w-4 h-4 text-emerald-300" />}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {selected.image && <img src={selected.image} alt="" referrerPolicy="no-referrer" className="w-full rounded-lg bg-black/30" onError={(e) => { e.target.style.display = 'none'; }} />}
                {selected.description && <p className="text-sm text-white/70">{selected.description}</p>}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-white/40">Collection</span><br />{selected.collection || '—'}</div>
                  <div><span className="text-white/40">Standard</span><br />{selected.standard}</div>
                  <div><span className="text-white/40">Royalty</span><br />{selected.royalty !== null ? `${(selected.royalty * 100).toFixed(0)}%` : '—'}</div>
                  <div className="col-span-2"><span className="text-white/40">Asset ID</span><br /><span className="font-mono break-all">{selected.id}</span></div>
                </div>
                {selected.spam && <div className="flex items-center gap-2 text-yellow-300 text-xs"><AlertCircle className="w-4 h-4" /> Flagged as spam by indexer.</div>}
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1 bg-white text-purple-700" disabled><Send className="w-4 h-4 mr-2" /> Send NFT (next phase)</Button>
                  <Button variant="outline" className="border-white/30 text-white bg-transparent" onClick={() => toggleHide(selected.id)}>{hidden.has(selected.id) ? 'Unhide' : 'Hide'}</Button>
                </div>
                <a href={`${explorer}/${selected.mint}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-emerald-300 text-sm">View on explorer <ExternalLink className="w-3 h-3" /></a>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}