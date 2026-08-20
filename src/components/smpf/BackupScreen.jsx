import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react';
import { encryptWallet, b64ToBuf, bufToB64, verifyBackupFile } from '@/lib/smpfCrypto';
import { saveWallet, getCurrentUserId } from '@/lib/smpfWalletStore';

export default function BackupScreen({ secretKeyB64, address, onDone, onBack, userId }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [saved, setSaved] = useState(false);
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const secretBytes = b64ToBuf(secretKeyB64);

  async function handleEncrypt() {
    setError('');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    if (!acknowledged) return setError('Please acknowledge the backup warning.');
    setBusy(true);
    try {
      const backup = await encryptWallet(secretBytes, password, address);
      const file = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = `opentill-smpf-wallet-${address.slice(0, 8)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      const uid = userId !== undefined ? userId : await getCurrentUserId();
      await saveWallet(address, backup, uid);
      setSaved(true);
    } catch (e) {
      setError('Could not create encrypted backup: ' + (e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyFile(file) {
    setError('');
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      await verifyBackupFile(text, password);
      setVerified(true);
    } catch (e) {
      setError('Verification failed: ' + (e.message || e));
    } finally {
      setBusy(false);
    }
  }

  const canFinish = saved && verified && acknowledged;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Secure wallet backup</h2>
        <p className="text-white/70 mt-2">
          Because your SMPF address is custom, it cannot always be restored from a standard seed
          phrase. Save this encrypted backup file — it contains your real keypair.
        </p>
      </div>

      <Card className="bg-white/10 backdrop-blur border-white/20">
        <CardContent className="p-6 space-y-4">
          <div>
            <Label className="text-white">Wallet password (min 8 characters)</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 bg-white/10 border-white/20 text-white" />
          </div>
          <div>
            <Label className="text-white">Confirm password</Label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1 bg-white/10 border-white/20 text-white" />
          </div>

          <label className="flex items-start gap-3 p-3 rounded-lg bg-black/20 cursor-pointer">
            <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} className="mt-1" />
            <span className="text-sm text-white/80">
              I understand that losing <strong>both</strong> the encrypted backup file <strong>and</strong> my
              wallet password may permanently remove access to my funds.
            </span>
          </label>

          <Button onClick={handleEncrypt} disabled={busy || !acknowledged || !password || password !== confirm} className="w-full bg-white text-purple-700 hover:bg-gray-100">
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Create &amp; download encrypted backup
          </Button>

          {saved && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-300 text-sm">
                <ShieldCheck className="w-4 h-4" /> Backup saved. Now verify it can be restored.
              </div>
              <div>
                <Label className="text-white">Re-upload your backup file to verify</Label>
                <Input
                  type="file"
                  accept="application/json"
                  className="mt-1 bg-white/10 border-white/20 text-white file:text-white"
                  onChange={(e) => handleVerifyFile(e.target.files?.[0])}
                />
              </div>
              {verified && (
                <div className="flex items-center gap-2 text-emerald-300 text-sm">
                  <ShieldCheck className="w-4 h-4" /> Verified — your backup can decrypt your wallet.
                </div>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-300">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 border-white/30 text-white bg-transparent" onClick={onBack} disabled={busy}>
              Back
            </Button>
            <Button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white" onClick={onDone} disabled={!canFinish || busy}>
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
              Activate wallet
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
        <AlertTriangle className="w-4 h-4 text-yellow-300 shrink-0 mt-0.5" />
        <p className="text-xs text-yellow-100/90">
          Never share this file or your password. openTILL cannot recover them for you.
        </p>
      </div>
    </div>
  );
}