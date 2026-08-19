import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, FileCheck2, KeyRound, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { decryptWallet, verifyBackupFile } from '@/lib/smpfCrypto';
import { saveWallet, getCurrentUserId } from '@/lib/smpfWalletStore';

export default function RestoreFromBackup({ expectedAddress, onRestored }) {
  const { toast } = useToast();
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [fileText, setFileText] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => {
      setFileText(String(reader.result || ''));
    };
    reader.onerror = () => {
      toast({ title: 'Could not read file', variant: 'destructive' });
    };
    reader.readAsText(f);
  }

  async function handleRestore() {
    if (!fileText) {
      toast({ title: 'Select a backup file first', variant: 'destructive' });
      return;
    }
    if (!password) {
      toast({ title: 'Wallet password required', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const recovered = await verifyBackupFile(fileText, password);

      if (expectedAddress && recovered.address !== expectedAddress) {
        throw new Error(
          `This backup is for a different wallet (${recovered.address.slice(0, 6)}…${recovered.address.slice(-4)}) than the one linked to your account (${expectedAddress.slice(0, 6)}…${expectedAddress.slice(-4)}).`
        );
      }

      const userId = await getCurrentUserId();
      const backup = JSON.parse(fileText);
      await saveWallet(recovered.address, backup, userId);

      toast({
        title: 'Wallet restored',
        description: 'Your local keypair is available again. You can now send.',
        className: 'bg-green-500 text-white',
      });
      setPassword('');
      setFile(null);
      setFileText('');
      if (fileRef.current) fileRef.current.value = '';
      if (typeof onRestored === 'function') onRestored(recovered.address);
    } catch (e) {
      toast({ title: 'Restore failed', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 text-left">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-200/90">
          No local keypair is available on this device. Sending requires the wallet's private key,
          which is only present on the device where the wallet was created. Restore it from your
          encrypted backup file below.
        </p>
      </div>

      <div>
        <Label className="text-white text-xs">Encrypted backup file (.json)</Label>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={handleFile}
          className="hidden"
          id="restore-backup-file"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full mt-1 border-white/20 bg-white/5 text-white hover:bg-white/10 text-xs"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          {file ? (
            <>
              <FileCheck2 className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> {file.name}
            </>
          ) : (
            <>
              <Upload className="w-3.5 h-3.5 mr-1.5" /> Choose backup file
            </>
          )}
        </Button>
      </div>

      <div>
        <Label className="text-white text-xs">Wallet password</Label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password used when the wallet was created"
          className="mt-1 bg-white/10 border-white/20 text-white text-xs"
          disabled={busy}
        />
      </div>

      <Button
        onClick={handleRestore}
        disabled={busy || !fileText || !password}
        className="w-full bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5 mr-1.5" />}
        {busy ? 'Restoring…' : 'Restore & Unlock Sending'}
      </Button>
    </div>
  );
}