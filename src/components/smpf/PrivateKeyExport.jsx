import React, { useState, useEffect } from 'react';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { base44 } from '@/api/base44Client';
import { listWallets, getWallet } from '@/lib/smpfWalletStore';
import { decryptWallet } from '@/lib/smpfCrypto';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { KeyRound, Eye, EyeOff, Copy, Check, ShieldAlert, Loader2 } from 'lucide-react';

export default function PrivateKeyExport({ wallet }) {
  const [passphrase, setPassphrase] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copiedBase58, setCopiedBase58] = useState(false);
  const [copiedArray, setCopiedArray] = useState(false);

  // Formatted keys ready for export
  const [exportedBase58, setExportedBase58] = useState('');
  const [exportedByteArray, setExportedByteArray] = useState('');

  async function handleDecrypt() {
    setError('');
    if (!passphrase) {
      setError('Please enter your wallet passphrase.');
      return;
    }

    setBusy(true);
    try {
      // 1. Get current user
      const currentUser = await base44.auth.me();

      // 2. Fetch full local wallet entry with encryptedSecretKey
      let targetWallet = wallet?.encryptedSecretKey ? wallet : null;

      if (!targetWallet) {
        const userWallets = await listWallets(currentUser?.id).catch(() => []);
        targetWallet = userWallets?.[0] || null;
      }

      if (!targetWallet && wallet?.address) {
        targetWallet = await getWallet(wallet.address).catch(() => null);
      }

      if (!targetWallet || !targetWallet.encryptedSecretKey) {
        throw new Error('No encrypted secret key stored locally in browser storage for this account.');
      }

      // 3. Decrypt wallet secret key using passphrase
      const decrypted = await decryptWallet(targetWallet, passphrase);
      
      let secretKeyBytes;
      if (decrypted instanceof Uint8Array) {
        secretKeyBytes = decrypted;
      } else if (decrypted?.secretKeyB64) {
        secretKeyBytes = Uint8Array.from(atob(decrypted.secretKeyB64), c => c.charCodeAt(0));
      } else if (typeof decrypted === 'string') {
        secretKeyBytes = Uint8Array.from(atob(decrypted), c => c.charCodeAt(0));
      } else if (decrypted?.secretKey) {
        secretKeyBytes = new Uint8Array(Object.values(decrypted.secretKey));
      } else {
        throw new Error('Invalid secret key structure returned from decryption.');
      }

      // 4. Verify keypair validity with Solana Web3 Keypair
      const keypair = Keypair.fromSecretKey(secretKeyBytes);

      // 5. Format for Solflare / Phantom imports
      const base58Key = bs58.encode(keypair.secretKey);
      const byteArrayKey = JSON.stringify(Array.from(keypair.secretKey));

      setExportedBase58(base58Key);
      setExportedByteArray(byteArrayKey);
      setShowKey(true);
    } catch (err) {
      console.error('PrivateKeyExport error:', err);
      setError(err?.message || 'Decryption failed. Please check your passphrase.');
    } finally {
      setBusy(false);
    }
  }

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'base58') {
      setCopiedBase58(true);
      setTimeout(() => setCopiedBase58(false), 2000);
    } else {
      setCopiedArray(true);
      setTimeout(() => setCopiedArray(false), 2000);
    }
  };

  return (
    <Card className="bg-slate-900 border-white/10 text-white">
      <CardHeader>
        <CardTitle className="text-lg font-black flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-amber-400" /> Export Private Key
        </CardTitle>
        <CardDescription className="text-white/60 text-xs">
          Export your raw Solana private key to import into external wallets like Solflare, Phantom, or Backpack.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-400 text-xs">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!showKey ? (
          <div className="space-y-3">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Warning:</strong> Never share your private key or enter it into untrusted websites. Anyone with this key has full control over your funds.
              </span>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-white/80">Wallet Passphrase</Label>
              <Input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Enter passphrase to decrypt..."
                className="bg-slate-950 border-white/10 text-xs text-white placeholder:text-white/30"
              />
            </div>

            <Button
              onClick={handleDecrypt}
              disabled={busy || !passphrase}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              Decrypt Secret Key
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Base58 Format (Solflare Default) */}
            <div className="space-y-1.5 p-3 bg-slate-950 border border-white/10 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-indigo-400 font-mono uppercase font-semibold">
                  Base58 String (Solflare / Phantom)
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(exportedBase58, 'base58')}
                  className="h-6 px-2 text-xs text-white/60 hover:text-white"
                >
                  {copiedBase58 ? <Check className="w-3 h-3 text-emerald-400 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                  {copiedBase58 ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <p className="font-mono text-xs text-indigo-300 break-all select-all font-semibold">
                {exportedBase58}
              </p>
            </div>

            {/* Byte Array Format */}
            <div className="space-y-1.5 p-3 bg-slate-950 border border-white/10 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-indigo-400 font-mono uppercase font-semibold">
                  JSON Byte Array `[218, 14, ...]`
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(exportedByteArray, 'array')}
                  className="h-6 px-2 text-xs text-white/60 hover:text-white"
                >
                  {copiedArray ? <Check className="w-3 h-3 text-emerald-400 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                  {copiedArray ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <p className="font-mono text-[11px] text-white/70 break-all select-all max-h-20 overflow-y-auto">
                {exportedByteArray}
              </p>
            </div>

            <Button
              onClick={() => {
                setShowKey(false);
                setPassphrase('');
                setExportedBase58('');
                setExportedByteArray('');
              }}
              variant="outline"
              className="w-full border-white/10 bg-slate-950 text-white hover:bg-white/5 text-xs"
            >
              <EyeOff className="w-4 h-4 mr-2" /> Hide Private Key
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}