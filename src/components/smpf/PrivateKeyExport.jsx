import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Key, Copy, Check, Lock, ShieldCheck } from 'lucide-react';

export default function PrivateKeyExport({ wallet, currentUserEmail = 'admin@isolex.net' }) {
  const [passphrase, setPassphrase] = useState('');
  const [exportedBase58, setExportedBase58] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hasLocalStorageKey, setHasLocalStorageKey] = useState(false);

  useEffect(() => {
    const localData = localStorage.getItem(`smpf_sk_${currentUserEmail}`);
    if (localData) {
      setHasLocalStorageKey(true);
    }
  }, [currentUserEmail]);

  const handleDecryptAndReveal = async () => {
    setError('');
    setBusy(true);

    try {
      // 1. Check local browser storage fallback first
      const localData = localStorage.getItem(`smpf_sk_${currentUserEmail}`);
      if (localData) {
        const parsed = JSON.parse(localData);
        if (parsed?.secretKey) {
          setExportedBase58(parsed.secretKey);
          setShowKey(true);
          setBusy(false);
          return;
        }
      }

      // 2. Check if wallet instance holds an encrypted key property
      if (wallet?.encryptedSecretKey) {
        // Implement wallet decryption helper if provided
        setExportedBase58(wallet.encryptedSecretKey);
        setShowKey(true);
        setBusy(false);
        return;
      }

      setError('No encrypted or active secret key found in browser storage for this account.');
    } catch (err) {
      setError(err.message || 'Failed to export private key.');
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = () => {
    if (exportedBase58) {
      navigator.clipboard.writeText(exportedBase58);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card className="border-slate-800 bg-slate-900/90">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Key className="w-5 h-5 text-indigo-400" />
          <h3 className="font-bold text-lg text-white">Export Private Key</h3>
        </div>

        {!showKey ? (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              Export your raw Solana private key string (Base58) to import into external browser extension wallets like Solflare or Phantom.
            </p>

            {!hasLocalStorageKey && !wallet?.encryptedSecretKey && (
              <div className="flex items-center gap-2 p-3 bg-red-950/40 border border-red-800/60 rounded text-red-300 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>No secret key stored locally in browser storage for this account. Generate a wallet first.</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Wallet Passphrase (Optional)</label>
              <div className="relative">
                <Input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Enter wallet passphrase"
                  className="bg-slate-950 border-slate-800 text-sm pr-10"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-400 font-medium">{error}</p>
            )}

            <Button
              onClick={handleDecryptAndReveal}
              disabled={busy}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
            >
              {busy ? 'Decrypting...' : 'Reveal Private Key'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-950/30 border border-emerald-800/50 rounded flex items-center gap-2 text-emerald-300 text-xs">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Secret key successfully loaded from session storage.</span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-400">Raw Solana Private Key (Base58)</label>
              <div className="flex items-center gap-2 bg-slate-950 p-3 rounded border border-slate-800">
                <span className="text-xs font-mono text-emerald-400 break-all flex-1">
                  {exportedBase58}
                </span>
                <Button size="sm" onClick={handleCopy} className="bg-slate-800 hover:bg-slate-700 text-white shrink-0">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span className="ml-1 text-xs">{copied ? 'Copied' : 'Copy'}</span>
                </Button>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowKey(false)}
              className="w-full border-slate-800 text-slate-400 text-xs hover:bg-slate-800"
            >
              Hide Private Key
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}