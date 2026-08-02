import React, { useState, useEffect, useRef } from 'react';
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
      if (!['admin', 'super_admin', 'root_admin'].includes(me?.role)) throw new Error('Administrators only.');
      const payload = {
        ...settings,
        verified_duc_mint: pk.toBase58(),
        mint_changed_by: me.email,
        mint_changed_at: new Date().toISOString(),
        previous_duc_mint: settings?.verified_duc_mint || null,
      };
      let saved;
      if (settings?.id) {
        saved = await base44.entities.DUCWalletSettings.update(settings.id, payload);
      } else {
        saved = await base44.entities.DUCWalletSettings.create(payload);
      }
      toast({ title: '$DUC mint updated', description: 'A system-wide security warning now applies.' });
      onSaved?.(saved);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-yellow-500/40 bg-yellow-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <ShieldAlert className="w-5 h-5 text-yellow-300" /> Verified $DUC Mainnet Mint
        </CardTitle>
        <CardDescription className="text-white/60">
          Only administrators can change this. Changing the mint records the old/new values, admin identity, and timestamp.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConfigured && (
          <Alert className="bg-red-500/10 border-red-500/40">
            <ShieldAlert className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-200">
              <strong>Major warning:</strong> No verified $DUC mint has been configured. $DUC balances and transfers
              cannot be shown until an administrator verifies the mint.
            </AlertDescription>
          </Alert>
        )}
        {isConfigured && (
          <div className="flex items-center gap-2 text-emerald-300 text-sm">
            <BadgeCheck className="w-4 h-4" /> Current verified mint: <span className="font-mono text-xs break-all">{settings.verified_duc_mint}</span>
          </div>
        )}
        <div>
          <Label className="text-white">New $DUC mint address</Label>
          <Input value={mint} onChange={(e) => setMint(e.target.value)} placeholder="Mint address" className="mt-1 bg-white/10 border-white/20 text-white font-mono text-sm" />
        </div>
        <div>
          <Label className="text-white">Admin reauthentication (your email)</Label>
          <Input value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@opentill.io" className="mt-1 bg-white/10 border-white/20 text-white" />
        </div>
        <div>
          <Label className="text-white">Type CHANGE DUC MINT to confirm</Label>
          <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="CHANGE DUC MINT" className="mt-1 bg-white/10 border-white/20 text-white font-mono" />
        </div>
        {error && <p className="text-sm text-red-300">{error}</p>}
        <div className="flex items-start gap-2 p-2 rounded bg-black/30">
          <ShieldAlert className="w-4 h-4 text-yellow-300 shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-100/80">Balances are never automatically transferred from the old mint.</p>
        </div>
        <Button onClick={save} disabled={busy || !mint || !adminEmail || confirmText !== 'CHANGE DUC MINT'} className="w-full bg-yellow-500 hover:bg-yellow-600 text-black">
          {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldAlert className="w-4 h-4 mr-2" />}
          Save verified $DUC mint
        </Button>
      </CardContent>
    </Card>
  );
}