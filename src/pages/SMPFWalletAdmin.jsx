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

  useEffect(() => {
    init();
  }, []);

  async function init() {
    try {
      const u = await base44.auth.me();
      setMe(u);

      // Check for admin/root roles or allow logged-in user in dev
      const allowedRoles = ['super_admin', 'root_admin', 'admin', 'owner'];
      const hasAdminRole = u?.role && allowedRoles.includes(u.role.toLowerCase());

      if (!u || (!hasAdminRole && !u.is_admin)) {
        setLoading(false);
        return;
      }

      const s = await base44.entities.DUCWalletSettings.list();
      setSettings(s?.[0] || {});
      const a = await base44.entities.WalletAdminAudit.list('-created_date', 50).catch(() => []);
      setAudit(a || []);
    } catch (e) {
      console.error('Failed to initialize admin view:', e);
    } finally {
      setLoading(false);
    }
  }

  async function persist(next, actionType, note) {
    setBusy(true);
    try {
      const u = await base44.auth.me();
      let saved;
      if (settings?.id) {
        saved = await base44.entities.DUCWalletSettings.update(settings.id, next);
      } else {
        saved = await base44.entities.DUCWalletSettings.create(next);
      }
      await base44.entities.WalletAdminAudit.create({
        action_type: actionType,
        admin_email: u?.email,
        entity: 'DUCWalletSettings',
        previous_value: JSON.stringify(settings),
        new_value: JSON.stringify(saved),
        note,
      });
      setSettings(saved);
      const a = await base44.entities.WalletAdminAudit.list('-created_date', 50).catch(() => []);
      setAudit(a || []);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setBusy(false);
    }
  }

  function handleTogglePause() {
    persist({ ...settings, is_paused: !settings?.is_paused }, 'TOGGLE_PAUSE', 'Admin toggled global wallet pause');
  }

  function handleAddToken() {
    if (!tokenInput.trim()) return;
    const current = settings?.featured_tokens || [];
    if (current.includes(tokenInput.trim())) return;
    const next = [...current, tokenInput.trim()];
    persist({ ...settings, featured_tokens: next }, 'ADD_FEATURED_TOKEN', `Added token ${tokenInput}`);
    setTokenInput('');
  }

  function handleRemoveToken(mint) {
    const next = (settings?.featured_tokens || []).filter((t) => t !== mint);
    persist({ ...settings, featured_tokens: next }, 'REMOVE_FEATURED_TOKEN', `Removed token ${mint}`);
  }

  function handleAddChip() {
    if (!chipInput.trim()) return;
    const current = settings?.allowed_chips || [];
    if (current.includes(chipInput.trim())) return;
    const next = [...current, chipInput.trim()];
    persist({ ...settings, allowed_chips: next }, 'ADD_ALLOWED_CHIP', `Added chip ${chipInput}`);
    setChipInput('');
  }

  function handleRemoveChip(chip) {
    const next = (settings?.allowed_chips || []).filter((c) => c !== chip);
    persist({ ...settings, allowed_chips: next }, 'REMOVE_ALLOWED_CHIP', `Removed chip ${chip}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  // Fallback UI if access check fails
  if (!me) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-slate-900 border-white/10 text-white text-center p-6 space-y-4">
          <ShieldAlert className="w-12 h-12 text-amber-400 mx-auto" />
          <h2 className="text-xl font-bold">Administrators only</h2>
          <p className="text-white/60 text-sm">
            This area is restricted to openTILL administrators. Please log in with an administrator account to continue.
          </p>
          <Button variant="outline" className="border-white/20 text-white" onClick={() => (window.location.href = createPageUrl('SMPFWallet'))}>
            Back to Wallet
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 space-y-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => (window.location.href = createPageUrl('SMPFWallet'))}>
              <ArrowLeft className="w-5 h-5 text-white/70" />
            </Button>
            <div>
              <h1 className="text-2xl font-black flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-indigo-400" /> openTILL SMPF Admin
              </h1>
              <p className="text-xs text-white/60">
                Global settings, token whitelist, chip registry, and audit logs.
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-white/60">
            Logged in as <span className="text-white font-mono">{me?.email}</span>
          </div>
        </div>

        {/* Global Pause Control */}
        <Card className="bg-slate-900 border-white/10 text-white">
          <CardHeader>
            <CardTitle className="text-lg">Global Circuit Breaker</CardTitle>
            <CardDescription className="text-white/60 text-xs">
              Pause or resume all SMPF wallet outgoing transfers and mint operations across the application.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-semibold">Wallet System Status</Label>
              <p className="text-xs text-white/60">
                {settings?.is_paused ? (
                  <span className="text-red-400 font-bold">PAUSED — Outgoing operations blocked</span>
                ) : (
                  <span className="text-emerald-400 font-bold">ACTIVE — Normal operations</span>
                )}
              </p>
            </div>
            <Switch checked={!!settings?.is_paused} onCheckedChange={handleTogglePause} disabled={busy} />
          </CardContent>
        </Card>

        {/* $DUC Token & Mint Admin */}
        <DUCMintAdmin />

        {/* Featured Tokens Whitelist */}
        <Card className="bg-slate-900 border-white/10 text-white">
          <CardHeader>
            <CardTitle className="text-lg">Featured Tokens Whitelist</CardTitle>
            <CardDescription className="text-white/60 text-xs">
              Configure token mint addresses that are featured inside the wallet token tab.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Solana Mint Address (Base58)"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="bg-slate-950 border-white/10 text-white font-mono text-xs"
              />
              <Button onClick={handleAddToken} disabled={busy || !tokenInput.trim()} className="bg-indigo-600 hover:bg-indigo-500">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>

            <div className="space-y-2">
              {(settings?.featured_tokens || []).map((mint) => (
                <div key={mint} className="flex items-center justify-between p-2.5 bg-slate-950 border border-white/10 rounded-lg text-xs font-mono">
                  <span className="truncate max-w-md">{mint}</span>
                  <Button variant="ghost" size="sm" onClick={() => handleRemoveToken(mint)} disabled={busy} className="text-red-400 hover:text-red-300">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {(!settings?.featured_tokens || settings.featured_tokens.length === 0) && (
                <p className="text-xs text-white/40 italic">No featured tokens configured.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Allowed Chips Registry */}
        <Card className="bg-slate-900 border-white/10 text-white">
          <CardHeader>
            <CardTitle className="text-lg">Allowed Chips Registry</CardTitle>
            <CardDescription className="text-white/60 text-xs">
              Register active openTILL chip identifiers allowed to interact with wallet smart contract functions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Chip ID / Public Key"
                value={chipInput}
                onChange={(e) => setChipInput(e.target.value)}
                className="bg-slate-950 border-white/10 text-white font-mono text-xs"
              />
              <Button onClick={handleAddChip} disabled={busy || !chipInput.trim()} className="bg-indigo-600 hover:bg-indigo-500">
                <Plus className="w-4 h-4 mr-1" /> Register
              </Button>
            </div>

            <div className="space-y-2">
              {(settings?.allowed_chips || []).map((chip) => (
                <div key={chip} className="flex items-center justify-between p-2.5 bg-slate-950 border border-white/10 rounded-lg text-xs font-mono">
                  <span className="truncate max-w-md">{chip}</span>
                  <Button variant="ghost" size="sm" onClick={() => handleRemoveChip(chip)} disabled={busy} className="text-red-400 hover:text-red-300">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {(!settings?.allowed_chips || settings.allowed_chips.length === 0) && (
                <p className="text-xs text-white/40 italic">No registered chips found.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Audit Logs */}
        <Card className="bg-slate-900 border-white/10 text-white">
          <CardHeader>
            <CardTitle className="text-lg">Admin Action Audit Log</CardTitle>
            <CardDescription className="text-white/60 text-xs">
              Immutable log of administrative updates to wallet settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
              {audit.map((item) => (
                <div key={item.id || item.created_date} className="p-3 bg-slate-950 border border-white/10 rounded-lg space-y-1 text-xs">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-indigo-400">{item.action_type}</span>
                    <span className="text-white/40 text-[10px]">{new Date(item.created_date).toLocaleString()}</span>
                  </div>
                  <p className="text-white/80">{item.note}</p>
                  <p className="text-white/40 text-[10px]">By: {item.admin_email}</p>
                </div>
              ))}
              {audit.length === 0 && <p className="text-xs text-white/40 italic">No audit records available.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}