import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Key, Lock, Copy, CheckCircle2, ShieldAlert, Loader2, X, QrCode, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getWallet } from '@/lib/smpfWalletStore';
import { decryptWallet } from '@/lib/smpfCrypto';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import QRCode from 'qrcode';

// A valid Solana secret key is 64 bytes: [32-byte seed || 32-byte public key],
// where the public key is derived from the seed. Solflare/Phantom derive the
// address from the seed and reject keys whose stored public key doesn't match.
// The old broken generator stitched a random public key onto the seed, so
// those keys fail this check and must be regenerated.
function isValidSecretKeyForAddress(secretKeyBs58, expectedAddress) {
  try {
    const sk = bs58.decode(secretKeyBs58);
    if (sk.length !== 64) return false;
    const { publicKey } = nacl.sign.keyPair.fromSecretKey(sk);
    return bs58.encode(publicKey) === expectedAddress;
  } catch {
    return false;
  }
}

export default function PrivateKeyExport({ wallet, session, onClose }) {
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [decrypting, setDecrypting] = useState(false);
  const [exportedKey, setExportedKey] = useState(null);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [showQr, setShowQr] = useState(false);

  // Generate a QR code from the exported base58 key so it can be scanned by
  // Phantom / Solflare mobile apps for direct import.
  useEffect(() => {
    if (!exportedKey) { setQrDataUrl(null); return; }
    QRCode.toDataURL(exportedKey, { width: 240, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [exportedKey]);

  const handleExport = async (e) => {
    e.preventDefault();
    if (!password) return;

    setDecrypting(true);
    try {
      // 1. Fetch the ENCRYPTED wallet entry from IndexedDB. Plaintext keys are
      //    never stored in localStorage — only the encrypted backup blob is
      //    persisted, and it requires the user's password to decrypt.
      const record = await getWallet(wallet.address);
      const encryptedData = record?.backup;

      if (!encryptedData) {
        toast({
          title: 'Export failed',
          description: 'Encrypted wallet backup not found. Please complete onboarding again to create a new wallet.',
          variant: 'destructive',
        });
        return;
      }

      // 2. Decrypt the secret key and encode as base58 (Phantom / Solflare compatible)
      const decrypted = await decryptWallet(encryptedData, password);
      const candidateKey = bs58.encode(decrypted.secretKey);

      // 3. Validate the key actually derives this wallet's address. Keys created
      //    by the old broken generator have a mismatched public key and will NOT
      //    import into Solflare/Phantom — those wallets must be regenerated.
      if (!isValidSecretKeyForAddress(candidateKey, wallet.address)) {
        toast({
          title: 'Invalid key — regenerate wallet',
          description: 'This wallet was created with a broken keypair generator. Its private key cannot be imported into Solflare/Phantom. Please delete this wallet and run onboarding again to generate a valid key.',
          variant: 'destructive',
        });
        return;
      }

      setExportedKey(candidateKey);
      toast({ title: 'Key Exported', description: 'Base58 private key ready for Phantom / Solflare import.' });
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

              {qrDataUrl && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowQr((s) => !s)}
                    className="w-full flex items-center justify-center gap-2 text-xs text-indigo-300 hover:text-indigo-200 transition-colors py-1"
                  >
                    <QrCode className="w-4 h-4" />
                    {showQr ? 'Hide QR code' : 'Show QR code for mobile import'}
                  </button>
                  {showQr && (
                    <div className="flex flex-col items-center gap-2 p-3 bg-white rounded-lg">
                      <img src={qrDataUrl} alt="Private key QR code" className="w-48 h-48" />
                      <p className="text-[10px] text-slate-600 text-center">
                        Open Phantom or Solflare on your phone, choose <strong>Import Private Key</strong>, then scan this code.
                      </p>
                    </div>
                  )}
                </div>
              )}

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