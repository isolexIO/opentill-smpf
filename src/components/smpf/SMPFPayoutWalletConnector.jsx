import { useState, useEffect } from 'react';
import nacl from 'tweetnacl';
import { Keypair } from '@solana/web3.js';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Wallet, Loader2, CheckCircle2, Link2, AlertCircle, ArrowRight, KeyRound } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { listWallets, getWallet } from '@/lib/smpfWalletStore';
import { decryptWallet, b64ToBuf } from '@/lib/smpfCrypto';
import { createPageUrl } from '@/utils';

export default function SMPFPayoutWalletConnector({ onLinked, title = 'SMPF Wallet Payouts' }) {
  const [user, setUser] = useState(null);
  const [localWallet, setLocalWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const u = await base44.auth.me();
      setUser(u);
      const wallets = await listWallets(u?.id);
      const match = u?.wallet_address ? wallets.find((w) => w.address === u.wallet_address) : null;
      setLocalWallet(match || wallets[0] || null);
    } catch {
      // not logged in
    } finally {
      setLoading(false);
    }
  }

  const solAddress = localWallet?.address;
  const isBound = !!user?.wallet_address && !!solAddress && user.wallet_address === solAddress;
  const otherBound = !!user?.wallet_address && !!solAddress && user.wallet_address !== solAddress;

  async function handleConnect() {
    if (!password) {
      toast({ title: 'Wallet password required', variant: 'destructive' });
      return;
    }
    if (!solAddress) {
      toast({ title: 'No local wallet', description: 'Generate an SMPF wallet first.', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const stored = await getWallet(solAddress);
      if (!stored) throw new Error('Wallet backup not found on this device.');
      let recovered;
      try {
        recovered = await decryptWallet(stored.backup, password);
      } catch {
        throw new Error('Incorrect wallet password.');
      }
      if (recovered.address !== solAddress) throw new Error('Backup does not match this wallet.');

      const kp = Keypair.fromSecretKey(b64ToBuf(recovered.secretKeyB64));
      const message = `Link this wallet to openTILL\n\nWallet: ${solAddress}\nUser: ${user.email}\nTimestamp: ${Date.now()}`;
      const messageBytes = new TextEncoder().encode(message);
      const signature = nacl.sign.detached(messageBytes, kp.secretKey);

      const { data } = await base44.functions.invoke('linkWalletToUser', {
        wallet_address: solAddress,
        wallet_type: 'smpf',
        signature_data: { signature: Array.from(signature), message },
      });

      if (!data.success) throw new Error(data.error || 'Failed to connect wallet');

      toast({ title: 'Connected for payouts', description: 'Your SMPF wallet is now linked for $DUC reward payouts.', className: 'bg-green-500 text-white' });
      setPassword('');
      setShowInput(false);
      await load();
      if (typeof onLinked === 'function') onLinked();
    } catch (e) {
      toast({ title: 'Connection failed', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-indigo-200 dark:border-indigo-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="w-4 h-4 text-indigo-600" /> {title}
        </CardTitle>
        <CardDescription>
          Connect your SMPF wallet to receive $DUC reward payouts directly on-chain.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!solAddress ? (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">No SMPF wallet found on this device</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  Generate a non-custodial SMPF wallet to connect it for $DUC reward payouts.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={() => (window.location.href = createPageUrl('SMPFWalletOnboarding'))}
            >
              <KeyRound className="w-4 h-4 mr-2" /> Generate SMPF Wallet
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </div>
        ) : isBound ? (
          <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-300">Connected for payouts</p>
              <p className="text-xs text-green-700 dark:text-green-400 font-mono mt-0.5">
                {solAddress.slice(0, 6)}…{solAddress.slice(-4)}
              </p>
            </div>
          </div>
        ) : otherBound ? (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">A different wallet is already linked</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 font-mono">
                  Linked: {user.wallet_address.slice(0, 6)}…{user.wallet_address.slice(-4)}
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  This device has a different SMPF wallet. Visit the SMPF Wallet to manage your linked address.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">SMPF Wallet</p>
                  <p className="text-xs text-gray-500 font-mono">{solAddress.slice(0, 6)}…{solAddress.slice(-4)}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-amber-600 border-amber-300">Not linked</Badge>
            </div>

            {!showInput ? (
              <Button onClick={() => setShowInput(true)} className="w-full bg-indigo-600 hover:bg-indigo-700">
                <Link2 className="w-4 h-4 mr-2" /> Connect for Payouts
              </Button>
            ) : (
              <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <div>
                  <Label className="text-sm">Wallet password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your SMPF wallet password"
                    onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Your password decrypts the local wallet key to sign a proof-of-ownership message.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setShowInput(false); setPassword(''); }} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleConnect} disabled={busy} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                    {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link2 className="w-4 h-4 mr-2" />}
                    {busy ? 'Connecting…' : 'Confirm & Connect'}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}