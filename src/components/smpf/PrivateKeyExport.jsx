import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Key, Lock, Copy, CheckCircle2, ShieldAlert, Loader2, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getWallet } from '@/lib/smpfWalletStore';
import { decryptWallet } from '@/lib/smpfCrypto';

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
      
      // Fallback: If record or backup is missing in IndexedDB, use active session if available
      let encryptedData = record?.backup;

      if (!encryptedData) {
        toast({
          title: 'Export failed',
          description: 'Wallet backup not found in local storage. Please complete onboarding again.',
          variant: 'destructive',
        });
        return;
      }

      // 2. Decrypt secret key base64 string
      const secretKeyB64 = await decryptWallet(encryptedData, password);
      setExportedKey(secretKeyB64);
      toast({ title: 'Key Exported', description: 'Private key decrypted successfully.' });
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
            Anyone with this key has full control of your wallet. Never share it.
          </CardDescription>
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