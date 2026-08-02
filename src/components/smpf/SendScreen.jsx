import React, { useState } from 'react';
import { Connection, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Keypair } from '@solana/web3.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Send, Loader2, AlertTriangle, ExternalLink, ShieldAlert } from 'lucide-react';
import { b64ToBuf } from '@/lib/smpfCrypto';
import { getWallet, getSession } from '@/lib/smpfWalletStore';
import { useToast } from '@/components/ui/use-toast';

function friendlyError(err) {
  const m = String(err && err.message ? err.message : err);
  if (/insufficient/i.test(m)) return 'Insufficient SOL for the network fee.';
  if (/blockhash/i.test(m)) return 'Transaction expired before confirmation. Please retry.';
  if (/429|rate/i.test(m)) return 'Network provider is temporarily unavailable. Please retry.';
  return m;
}

export default function SendScreen({ address, rpc, network }) {
  const { toast } = useToast();
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const conn = React.useMemo(() => new Connection(rpc, 'confirmed'), [rpc]);

  async function validateAndPreview() {
    setResult(null);
    setBusy(true);
    try {
      if (!to) throw new Error('Recipient address is not valid.');
      let recipient;
      try {
        recipient = new PublicKey(to);
      } catch {
        throw new Error('Recipient address is not valid.');
      }
      const lamports = Math.round((parseFloat(amount) || 0) * LAMPORTS_PER_SOL);
      if (lamports <= 0) throw new Error('Enter a valid amount.');

      const fromPubkey = new PublicKey(address);
      const balance = await conn.getBalance(fromPubkey);
      const fee = 5000; // approximate lamports per signature
      if (lamports + fee > balance) throw new Error('Insufficient SOL for the network fee.');

      const { blockhash } = await conn.getLatestBlockhash();
      const tx = new Transaction({ feePayer: fromPubkey, recentBlockhash: blockhash }).add(
        SystemProgram.transfer({ fromPubkey, toPubkey: recipient, lamports })
      );
      if (memo) {
        // best-effort memo; keep preview simple
      }
      const sim = await conn.simulateTransaction(tx);
      setResult({
        to: recipient.toBase58(),
        amount: parseFloat(amount),
        feeSol: fee / LAMPORTS_PER_SOL,
        simulation: sim.value.err ? 'warning' : 'ok',
        newContact: true,
        builtTx: tx,
      });
    } catch (e) {
      toast({ title: 'Could not prepare send', description: friendlyError(e), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  async function confirmAndSend() {
    if (!password) return toast({ title: 'Wallet password required', variant: 'destructive' });
    setBusy(true);
    try {
      const session = getSession();
      if (!session) throw new Error('Wallet is locked.');
      const stored = await getWallet(address);
      if (!stored) throw new Error('Wallet backup not found.');

      const { decryptWallet } = await import('@/lib/smpfCrypto');
      let recovered;
      try {
        recovered = await decryptWallet(stored.backup, password);
      } catch {
        throw new Error('Incorrect wallet password.');
      }
      if (recovered.address !== address) throw new Error('Backup does not match this wallet.');

      const kp = Keypair.fromSecretKey(b64ToBuf(recovered.secretKeyB64));
      const tx = result.builtTx;
      tx.sign(kp);
      const sig = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: false });
      await conn.confirmTransaction(sig, 'confirmed');
      setResult({ ...result, sent: true, signature: sig });
      toast({ title: 'Sent', description: 'Transaction confirmed.' });
    } catch (e) {
      toast({ title: 'Send failed', description: friendlyError(e), variant: 'destructive' });
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  const explorerBase = network === 'devnet' ? 'https://solana.fm/tx' : 'https://solscan.io/tx';

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white">Send SOL</h2>
        <p className="text-white/60 text-sm">$DUC and token transfers arrive in a follow-up build.</p>
      </div>

      <Card className="bg-white/10 backdrop-blur border-white/20">
        <CardContent className="p-6 space-y-4">
          <div>
            <Label className="text-white">Recipient address</Label>
            <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="Solana address" className="mt-1 bg-white/10 border-white/20 text-white font-mono text-sm" />
          </div>
          <div>
            <Label className="text-white">Amount (SOL)</Label>
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.0" type="number" className="mt-1 bg-white/10 border-white/20 text-white" />
          </div>
          <div>
            <Label className="text-white">Memo (optional)</Label>
            <Input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Note" className="mt-1 bg-white/10 border-white/20 text-white" />
          </div>

          {!result && (
            <Button onClick={validateAndPreview} disabled={busy || !to || !amount} className="w-full bg-white text-purple-700 hover:bg-gray-100">
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Review transaction
            </Button>
          )}

          {result && !result.sent && (
            <div className="space-y-3">
              <div className="bg-black/30 rounded-lg p-3 text-sm text-white space-y-1">
                <div className="flex justify-between"><span className="text-white/60">To</span><span className="font-mono text-xs break-all">{result.to}</span></div>
                <div className="flex justify-between"><span className="text-white/60">Amount</span><span>{result.amount} SOL</span></div>
                <div className="flex justify-between"><span className="text-white/60">Network fee</span><span>~{result.feeSol.toFixed(6)} SOL</span></div>
                <div className="flex justify-between"><span className="text-white/60">Simulation</span><span className={result.simulation === 'ok' ? 'text-emerald-300' : 'text-yellow-300'}>{result.simulation === 'ok' ? 'OK' : 'Warning — review'}</span></div>
              </div>
              {result.newContact && (
                <div className="flex items-start gap-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/30">
                  <ShieldAlert className="w-4 h-4 text-yellow-300 shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-100/90">First-time recipient. Verify the address carefully.</p>
                </div>
              )}
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Wallet password to confirm" className="bg-white/10 border-white/20 text-white" />
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 border-white/30 text-white bg-transparent" onClick={() => { setResult(null); setConfirming(false); }}>Cancel</Button>
                <Button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white" disabled={busy || !password} onClick={() => { setConfirming(true); confirmAndSend(); }}>
                  {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Confirm &amp; send
                </Button>
              </div>
            </div>
          )}

          {result?.sent && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-300 text-sm"><ShieldAlert className="w-4 h-4" /> Transaction confirmed.</div>
              <a href={`${explorerBase}/${result.signature}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-emerald-300 text-sm underline">
                View on explorer <ExternalLink className="w-3 h-3" />
              </a>
              <Button variant="outline" className="w-full border-white/30 text-white bg-transparent" onClick={() => { setResult(null); setTo(''); setAmount(''); setMemo(''); setPassword(''); }}>
                Send another
              </Button>
            </div>
          )}

          {busy && !confirming && (
            <div className="flex items-start gap-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/30">
              <AlertTriangle className="w-4 h-4 text-yellow-300 shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-100/90">Preparing transaction…</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}