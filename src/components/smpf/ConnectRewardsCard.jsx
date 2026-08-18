import { useState } from 'react';
import nacl from 'tweetnacl';
import { Keypair } from '@solana/web3.js';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Gift, Loader2, CheckCircle2, Link2, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getWallet } from '@/lib/smpfWalletStore';
import { decryptWallet, b64ToBuf } from '@/lib/smpfCrypto';

export default function ConnectRewardsCard({ user, solAddress, wallet, onLinked }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const { toast } = useToast();

  const isBound = !!user?.wallet_address && !!solAddress && user.wallet_address === solAddress;
  const otherBound = !!user?.wallet_address && !!solAddress && user.wallet_address !== solAddress;

  async function handleConnect() {
    if (!password) {
      toast({ title: 'Wallet password required', variant: 'destructive' });
      return;
    }
    if (!wallet || !solAddress) {
      toast({ title: 'No local wallet', description: 'Create or restore your SMPF wallet on this device first.', variant: 'destructive' });
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

      toast({ title: 'Connected for rewards', description: 'Your SMPF wallet is now linked for $DUC reward payouts.', className: 'bg-emerald-500 text-white' });
      setPassword('');
      setShowInput(false);
      if (typeof onLinked === 'function') onLinked();
    } catch (e) {
      toast({ title: 'Connection failed', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="bg-gradient-to-br from-emerald-600/20 to-teal-600/10 border-emerald-500/30 text-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs text-white/80 font-mono uppercase tracking-wider flex items-center gap-1.5">
          <Gift className="w-3.5 h-3.5 text-emerald-300" /> Rewards Payout Wallet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isBound ? (
          <div className="flex items-start gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span className="text-white/90">Connected — $DUC rewards will be sent to this wallet.</span>
          </div>
        ) : otherBound ? (
          <div className="flex items-start gap-2 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span className="text-white/80">
              A different wallet is already linked to your account ({user.wallet_address.slice(0, 6)}…{user.wallet_address.slice(-4)}). Reset your wallet to change it.
            </span>
          </div>
        ) : !wallet ? (
          <div className="flex items-start gap-2 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span className="text-white/80">Restore your SMPF wallet on this device to connect it for reward payouts.</span>
          </div>
        ) : (
          <>
            <p className="text-[11px] text-white/60">
              Connect your SMPF wallet to receive $DUC reward payouts. Your wallet address will be linked to your account.
            </p>
            {!showInput ? (
              <Button onClick={() => setShowInput(true)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold">
                <Link2 className="w-3.5 h-3.5 mr-1.5" /> Connect for Rewards
              </Button>
            ) : (
              <div className="space-y-2">
                <div>
                  <Label className="text-white text-xs">Wallet password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter wallet password"
                    className="bg-white/10 border-white/20 text-white text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setShowInput(false); setPassword(''); }} className="border-white/20 text-white hover:bg-white/10 text-xs flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleConnect} disabled={busy} className="bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold flex-1">
                    {busy ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5 mr-1.5" />}
                    {busy ? 'Connecting…' : 'Confirm'}
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