import React, { useState } from 'react';
import { Connection, Transaction, PublicKey, Keypair } from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferInstruction,
} from '@solana/spl-token';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, ExternalLink, ShieldAlert } from 'lucide-react';
import { getWallet, getSession } from '@/lib/smpfWalletStore';
import { decryptWallet, b64ToBuf } from '@/lib/smpfCrypto';
import { useToast } from '@/components/ui/use-toast';

function friendlyError(err) {
  const m = String(err && err.message ? err.message : err);
  if (/insufficient/i.test(m)) return 'Insufficient SOL for the network fee.';
  if (/blockhash/i.test(m)) return 'Transaction expired before confirmation. Please retry.';
  return m;
}

export default function NFTSendDialog({ asset, address, rpc, network, onDone }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(!!asset);
  const [to, setTo] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(null);
  const explorer = network === 'devnet' ? 'https://solana.fm/tx' : 'https://solscan.io/tx';
  const programId = asset?.standard === 'Token-2022' ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;

  async function send() {
    if (!to) return toast({ title: 'Recipient address is not valid.', variant: 'destructive' });
    if (!password) return toast({ title: 'Wallet password required', variant: 'destructive' });
    setBusy(true);
    try {
      let recipient; try { recipient = new PublicKey(to); } catch { throw new Error('Recipient address is not valid.'); }
      const session = getSession();
      if (!session) throw new Error('Wallet is locked.');
      const stored = await getWallet(address);
      if (!stored) throw new Error('Wallet backup not found.');
      let recovered; try { recovered = await decryptWallet(stored.backup, password); } catch { throw new Error('Incorrect wallet password.'); }
      if (recovered.address !== address) throw new Error('Backup does not match this wallet.');
      const kp = Keypair.fromSecretKey(b64ToBuf(recovered.secretKeyB64));
      const conn = new Connection(rpc, 'confirmed');
      const owner = new PublicKey(address);
      const mint = new PublicKey(asset.mint);
      const sourceATA = await getAssociatedTokenAddress(mint, owner, false, programId, ASSOCIATED_TOKEN_PROGRAM_ID);
      const destATA = await getAssociatedTokenAddress(mint, recipient, false, programId, ASSOCIATED_TOKEN_PROGRAM_ID);
      const tx = new Transaction({ feePayer: owner });
      const destInfo = await conn.getAccountInfo(destATA);
      if (!destInfo) tx.add(createAssociatedTokenAccountInstruction(owner, destATA, recipient, mint, programId, ASSOCIATED_TOKEN_PROGRAM_ID));
      tx.add(createTransferInstruction(sourceATA, destATA, owner, 1, [], programId));
      const { blockhash } = await conn.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      const sim = await conn.simulateTransaction(tx);
      if (sim.value.err) throw new Error('Transaction simulation produced a warning. Review the recipient and try again.');
      tx.sign(kp);
      const sig = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: false });
      await conn.confirmTransaction(sig, 'confirmed');
      setSent(sig);
      toast({ title: 'NFT sent', description: 'Transfer confirmed.' });
      onDone?.();
    } catch (e) {
      toast({ title: 'Send failed', description: friendlyError(e), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  function close() { setOpen(false); setSent(null); setTo(''); setPassword(''); }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="max-w-md bg-slate-900 border-white/20 text-white">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Send className="w-4 h-4" /> Send NFT</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-white/60">{asset?.name} · <span className="font-mono text-xs break-all">{asset?.mint}</span></div>
          {sent ? (
            <div className="space-y-3">
              <div className="text-emerald-300 text-sm">Transfer confirmed.</div>
              <a href={`${explorer}/${sent}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-emerald-300 text-sm">View on explorer <ExternalLink className="w-3 h-3" /></a>
              <Button variant="outline" className="w-full border-white/30 text-white bg-transparent" onClick={close}>Done</Button>
            </div>
          ) : (
            <>
              <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="Recipient Solana address" className="bg-white/10 border-white/20 text-white font-mono text-sm" />
              <div className="flex items-start gap-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/30">
                <ShieldAlert className="w-4 h-4 text-yellow-300 shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-100/90">NFT transfers are irreversible. Sending the entire balance to a new address requires extra care.</p>
              </div>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Wallet password to confirm" className="bg-white/10 border-white/20 text-white" />
              <Button onClick={send} disabled={busy || !to || !password} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white">
                {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />} Confirm &amp; send NFT
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}