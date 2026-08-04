import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { PublicKey } from '@solana/web3.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { ShieldAlert, Loader2, BadgeCheck } from 'lucide-react';
import { createPageUrl } from '@/utils';

// Admin-only: configure the verified $DUC mainnet mint.
// Requires reauthentication, typing "CHANGE DUC MINT", and records the
// old/new mint + admin identity + timestamp.
export default function DUCMintAdmin({ settings, onSaved }) {
  const { toast } = useToast();
  const [mint, setMint] = useState(settings?.verified_duc_mint || '');
  const [confirmText, setConfirmText] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Keep local input in sync if parent settings load asynchronously
  useEffect(() => {
    if (settings?.verified_duc_mint) {
      setMint(settings.verified_duc_mint);
    }
  }, [settings?.verified_duc_mint]);

  const isConfigured = !!settings?.verified_duc_mint;

  async function save() {
    setError('');

    if (!adminEmail) return setError('Reauthentication required: enter your admin email.');
    if (confirmText !== 'CHANGE DUC MINT') return setError('Type CHANGE DUC MINT exactly to confirm.');

    let pk;
    try {
      pk = new PublicKey(mint.trim());
    } catch {
      return setError('That is not a valid Solana public key.');
    }

    setBusy(true);
    try {
      const me = await base44.auth.me();
      if (!['admin', 'super_admin', 'root_admin'].includes(me?.role)) {
        throw new Error('Administrators only.');
      }
      if (adminEmail.trim().toLowerCase() !== me?.email?.trim().toLowerCase()) {
        throw new Error('Reauthentication email does not match your current logged-in email.');
      }

      // 1. Query latest settings from Base44 DB to check for existing record ID
      const existingList = await base44.entities.DUCWalletSettings.list().catch(() => []);
      const currentRecord = existingList?.[0] || settings;

      const payload = {
        ...currentRecord,
        verified_duc_mint: pk.toBase58(),
        mint_changed_by: me.email,
        mint_changed_at: new Date().toISOString(),
        previous_duc_mint: currentRecord?.verified_duc_mint || null,
      };

      let savedRecord;
      // 2. Persist to DB (Update if record exists, Create if first setup)
      if (currentRecord?.id) {
        savedRecord = await base44.entities.DUCWalletSettings.update(currentRecord.id, payload);
      } else {
        savedRecord = await base44.entities.DUCWalletSettings.create(payload);
      }

      // 3. Record Audit Log Entry
      await base44.entities.WalletAdminAudit.create({
        action_type: 'UPDATE_DUC_MINT',
        admin_email: me.email,
        entity: 'DUCWalletSettings',
        new_value: JSON.stringify(savedRecord),
        note: `Updated DUC mint address to ${pk.toBase58()}`,
      }).catch(() => {});

      toast({
        title: 'Verified $DUC Mint Updated',
        description: `Mainnet mint bound to ${pk.toBase58().slice(0, 8)}...`,
      });

      setConfirmText('');
      if (typeof onSaved === 'function') {
        onSaved(savedRecord);
      }
    } catch (err) {
      console.error('Failed to update $DUC mint:', err);
      setError(err?.message || 'Failed to persist verified $DUC mint to database.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="bg-slate-900 border-indigo-500/30 text-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-black flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-400" /> Verified $DUC Mainnet Mint
          </CardTitle>
          {isConfigured && (
            <span className="flex items-center gap-1 text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2.5 py-1 rounded-full">
              <BadgeCheck className="w-3.5 h-3.5" /> Configured
            </span>
          )}
        </div>
        <CardDescription className="text-white/60 text-xs">
          Set the official SPL Token Mint for $DUC on Solana. This mint is enforced system-wide across openTILL checkout, POS terminals, and customer wallets.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-400 text-xs">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isConfigured && (
          <div className="p-3 bg-slate-950 border border-white/10 rounded-lg space-y-1 font-mono text-xs">
            <span className="text-white/40 block text-[10px] uppercase">Active $DUC Mint</span>
            <p className="text-indigo-300 break-all select-all">{settings.verified_duc_mint}</p>
            {settings.mint_changed_by && (
              <p className="text-[10px] text-white/40 font-sans mt-1">
                Updated by {settings.mint_changed_by} on {new Date(settings.mint_changed_at).toLocaleString()}
              </p>
            )}
          </div>
        )}

        <div className="space-y-3 pt-2">
          <div className="space-y-1">
            <Label className="text-xs text-white/80">New $DUC mint address</Label>
            <Input
              value={mint}
              onChange={(e) => setMint(e.target.value)}
              placeholder="Base58 Solana Mint Address..."
              className="bg-slate-950 border-white/10 text-xs font-mono text-white placeholder:text-white/30"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-white/80">Admin reauthentication (your email)</Label>
            <Input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="admin@isolex.net"
              className="bg-slate-950 border-white/10 text-xs text-white placeholder:text-white/30"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-white/80">
              Type <span className="font-mono font-bold text-amber-400">CHANGE DUC MINT</span> to confirm
            </Label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="CHANGE DUC MINT"
              className="bg-slate-950 border-white/10 text-xs font-mono text-white placeholder:text-white/30"
            />
          </div>

          <Button
            onClick={save}
            disabled={busy || confirmText !== 'CHANGE DUC MINT' || !adminEmail || !mint}
            className="w-full bg-indigo-600 hover:bg-indigo-500 font-semibold text-xs mt-2"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save verified $DUC mint
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}