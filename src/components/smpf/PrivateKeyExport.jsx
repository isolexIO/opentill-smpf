import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Key, Lock, Copy, CheckCircle2, ShieldAlert, Loader2, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getWallet } from '@/lib/smpfWalletStore';
import { decryptWallet } from '@/lib/smpfCrypto';
import bs58 from 'bs58';

export default function PrivateKeyExport({ wallet, session, onClose }) {
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [decrypting, setDecrypting] = useState(false);
  const [exportedKey, setExportedKey] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleExport = async (e) => {
    e.preventDefault();
    if (!password) return;

    setDecrypting(true);
    try {
      // 1. Fetch wallet entry from IndexedDB using address
      const record = await getWallet(wallet.address);
      let encryptedData = record?.backup;

      // 2. Decrypt secret key and encode as base58 (Phantom / Solflare compatible)
      if (encryptedData) {
        const decrypted = await decryptWallet(encryptedData, password);
        setExportedKey(bs58.encode(decrypted.secretKey));
        toast({ title: 'Key Exported', description: 'Base58 private key ready for Phantom / Solflare import.' });
        return;
      }

      // 3. Fallback: scan local keypair payloads (smpf_sk_<email>) for this address.
      //    These store the base58 secret key directly from generation.
      let localPayload = null;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('smpf_sk_')) {
          try {
            const p = JSON.parse(localStorage.getItem(k));
            if (p && p.address === wallet.address) { localPayload = p; break; }
          } catch { /* skip malformed */ }
        }
      }

      if (localPayload && localPayload.secretKey) {
        // localPayload.secretKey is the base58-encoded 64-byte Ed25519 secret key
        // captured at generation time (Phantom / Solflare compatible).
        setExportedKey(localPayload.secretKey);
        toast({ title: 'Key Exported', description: 'Base58 private key ready for Phantom / Solflare import.' });
        return;
      }

      toast({
        title: 'Export failed',
        description: 'Wallet backup not found in local storage. Please complete onboarding again.',
        variant: 'destructive',
      });
    } catch (err) {
      toast({
        title: 'Decryption failed',
        description: 'Incorrect password or invalid backup data.',
        variant: 'destructive',
      });
    } finally {
      setDecrypting(false);
    }
  };

  const copyKey = () => {
    if (!exportedKey) return;
    navigator.clipboard.writeText(exportedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Copied', description: 'Private key copied to clipboard.' });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-900 border-white/10 text-white relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Key className="w-5 h-5 text-purple-400" /> Export Private Key
          </CardTitle>
          <CardDescription className="text-white/60 text-xs">
            Anyone with this key has full control of your wallet. Never share it. Exported as base58 — compatible with Phantom, Solflare, and other Solana wallets.
          </CardDescription>
          <div className="mt-2 p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[11px] text-blue-200/90">
            Custom vanity addresses (e.g. …SMPF) are <strong>not</strong> recoverable from a 12-word seed phrase. To restore this wallet, use the encrypted backup file you downloaded during onboarding.
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2.5 text-xs text-amber-200">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p>This is your real Ed25519 secret key. Do not display it during screen sharing.</p>
          </div>

          {!exportedKey ? (
            <form onSubmit={handleExport} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Reauthenticate with wallet password</Label>
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-950 border-white/10 text-white"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-500 text-white"
                disabled={decrypting || !password}
              >
                {decrypting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Decrypt Key'}
              </Button>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-slate-950 border border-white/10 rounded-lg break-all font-mono text-xs text-emerald-400">
                {exportedKey}
              </div>

              <Button
                onClick={copyKey}
                variant="outline"
                className="w-full border-white/20 bg-white/5 hover:bg-white/10 text-white flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Copied Key
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Copy Private Key
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}