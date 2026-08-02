import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Trash2, ShieldAlert, ArrowLeft, ShieldCheck } from 'lucide-react';
import DUCMintAdmin from '@/components/smpf/DUCMintAdmin';

export default function SMPFWalletAdmin() {
  const [me, setMe] = useState(null);
  const [settings, setSettings] = useState(null);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tokenInput, setTokenInput] = useState('');
  const [chipInput, setChipInput] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { init(); }, []);
  async function init() {
    try {
      const u = await base44.auth.me();
      setMe(u);
      if (!['admin', 'super_admin', 'root_admin'].includes(u?.role)) { setLoading(false); return; }
      const s = await base44.entities.DUCWalletSettings.list();
      setSettings(s?.[0] || {});
      const a = await base44.entities.WalletAdminAudit.list('-created_date', 50).catch(() => []);
      setAudit(a || []);
    } catch {} finally { setLoading(false); }
  }

  async function persist(next, actionType, note) {
    setBusy(true);
    try {
      const u = await base44.auth.me();
      let saved;
      if (settings?.id) saved = await base44.entities.DUCWalletSettings.update(settings.id, next);
      else saved = await base44.entities.DUCWalletSettings.create(next);
      await base44.entities.WalletAdminAudit.create({
        action_type: actionType,
        admin_email: u?.email,
        entity: 'DUCWalletSettings',
        previous_value: JSON.stringify(settings),
        new_value: JSON.stringify(next),
        reason: note,
        note,
      });
      setSettings(saved);
      setAudit(await base44.entities.WalletAdminAudit.list('-created_date', 50).catch(() => []));
    } finally { setBusy(false); }
  }

  function addToken() {
    if (!tokenInput.trim()) return;
    persist({ ...settings, approved_token_mints: [...(settings.approved_token_mints || []), tokenInput.trim()] }, 'token_verification', 'add approved token');
    setTokenInput('');
  }
  function removeToken(m) {
    persist({ ...settings, approved_token_mints: (settings.approved_token_mints || []).filter((x) => x !== m) }, 'token_verification', 'remove approved token');
  }
  function addChip() {
    if (!chipInput.trim()) return;
    persist({ ...settings, approved_chip_collections: [...(settings.approved_chip_collections || []), chipInput.trim()] }, 'nft_collection', 'add approved chip collection');
    setChipInput('');
  }
  function removeChip(m) {
    persist({ ...settings, approved_chip_collections: (settings.approved_chip_collections || []).filter((x) => x !== m) }, 'nft_collection', 'remove approved chip collection');
  }
  function setField(field, value, actionType = 'rpc_config', note = `set ${field}`) {
    persist({ ...settings, [field]: value }, actionType, note);
  }

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-emerald-400" /></div>;
  }
  if (!['admin', 'super_admin', 'root_admin'].includes(me?.role)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-md bg-white/10 border-white/20">
          <CardContent className="p-8 text-center">
            <ShieldAlert className="w-10 h-10 mx-auto text-red-300 mb-2" />
            <h1 className="text-white text-xl font-bold">Administrators only</h1>
            <p className="text-white/60 text-sm mt-2">This area is restricted to openTILL administrators.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tokens = settings?.approved_token_mints || [];
  const chips = settings?.approved_chip_collections || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">openTILL Wallet Admin</h1>
        <a href={createPageUrl('SMPFWallet')} className="text-sm text-white/60 inline-flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Back to wallet</a>
      </div>

      {/* Monitoring */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-black/30 rounded-xl p-4"><p className="text-xs text-white/50 uppercase">Audit events</p><p className="text-2xl font-bold">{audit.length}</p></div>
        <div className="bg-black/30 rounded-xl p-4"><p className="text-xs text-white/50 uppercase">Approved tokens</p><p className="text-2xl font-bold">{tokens.length}</p></div>
        <div className="bg-black/30 rounded-xl p-4"><p className="text-xs text-white/50 uppercase">Chip collections</p><p className="text-2xl font-bold">{chips.length}</p></div>
        <div className="bg-black/30 rounded-xl p-4"><p className="text-xs text-white/50 uppercase">Settings record</p><p className="text-2xl font-bold">{settings?.id ? '1' : '0'}</p></div>
      </div>
      <p className="text-xs text-white/40">Per-user wallet counts are intentionally not stored — the wallet is non-custodial and private keys never leave a user's device. Administrators cannot view user keys, recovery secrets, passwords, or decrypted backups.</p>

      <DUCMintAdmin settings={settings} onSaved={setSettings} />

      {/* Approved tokens */}
      <Card className="bg-white/10 border-white/20">
        <CardHeader><CardTitle className="text-base">Approved token mints</CardTitle><CardDescription className="text-white/50">Tokens in this list are shown as verified to users.</CardDescription></CardHeader>
        <CardContent className="space-y-2">
          {tokens.map((t) => (
            <div key={t} className="flex items-center gap-2 bg-black/30 rounded p-2">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span className="font-mono text-xs break-all flex-1">{t}</span>
              <Button variant="ghost" size="icon" onClick={() => removeToken(t)} disabled={busy}><Trash2 className="w-4 h-4 text-red-300" /></Button>
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <Input value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} placeholder="Token mint address" className="bg-white/10 border-white/20 text-white font-mono text-sm" />
            <Button onClick={addToken} disabled={busy || !tokenInput} className="bg-white text-purple-700"><Plus className="w-4 h-4" /></Button>
          </div>
        </CardContent>
      </Card>

      {/* Chip collections */}
      <Card className="bg-white/10 border-white/20">
        <CardHeader><CardTitle className="text-base">openTILL Chip collections</CardTitle><CardDescription className="text-white/50">Approved NFT collections recognized as openTILL Chips.</CardDescription></CardHeader>
        <CardContent className="space-y-2">
          {chips.map((c) => (
            <div key={c} className="flex items-center gap-2 bg-black/30 rounded p-2">
              <span className="font-mono text-xs break-all flex-1">{c}</span>
              <Button variant="ghost" size="icon" onClick={() => removeChip(c)} disabled={busy}><Trash2 className="w-4 h-4 text-red-300" /></Button>
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <Input value={chipInput} onChange={(e) => setChipInput(e.target.value)} placeholder="Collection address" className="bg-white/10 border-white/20 text-white font-mono text-sm" />
            <Button onClick={addChip} disabled={busy || !chipInput} className="bg-white text-purple-700"><Plus className="w-4 h-4" /></Button>
          </div>
        </CardContent>
      </Card>

      {/* Network */}
      <Card className="bg-white/10 border-white/20">
        <CardHeader><CardTitle className="text-base">Network providers</CardTitle><CardDescription className="text-white/50">Configure RPC, DAS, and price endpoints.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {[['rpc_mainnet', 'Mainnet RPC'], ['rpc_devnet', 'Devnet RPC'], ['das_provider', 'DAS provider'], ['price_api_url', 'Price API']].map(([f, label]) => (
            <div key={f}>
              <Label className="text-white text-sm">{label}</Label>
              <Input defaultValue={settings?.[f] || ''} onBlur={(e) => setField(f, e.target.value)} className="mt-1 bg-white/10 border-white/20 text-white font-mono text-sm" />
            </div>
          ))}
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm">Default network: <b className={settings?.default_network === 'devnet' ? 'text-yellow-300' : 'text-emerald-300'}>{settings?.default_network || 'devnet'}</b></span>
            <Switch checked={settings?.default_network === 'mainnet'} onCheckedChange={(c) => setField('default_network', c ? 'mainnet' : 'devnet', 'security_setting', 'change default network')} />
          </div>
        </CardContent>
      </Card>

      {/* Audit log */}
      <Card className="bg-white/10 border-white/20">
        <CardHeader><CardTitle className="text-base">Audit log</CardTitle><CardDescription className="text-white/50">Immutable record of sensitive admin actions.</CardDescription></CardHeader>
        <CardContent className="space-y-1">
          {!audit.length && <p className="text-white/40 text-sm">No admin actions recorded yet.</p>}
          {audit.map((a) => (
            <div key={a.id} className="text-xs border-b border-white/10 py-2">
              <div className="flex justify-between"><span className="font-medium text-emerald-300">{a.action_type}</span><span className="text-white/40">{a.created_date ? new Date(a.created_date).toLocaleString() : ''}</span></div>
              <div className="text-white/60">{a.admin_email} · {a.note || a.reason}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}