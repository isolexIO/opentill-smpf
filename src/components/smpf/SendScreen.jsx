import React, { useState, useEffect } from 'react';
import { Connection, Transaction, PublicKey, LAMPORTS_PER_SOL, SystemProgram, Keypair } from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferInstruction,
} from '@solana/spl-token';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Send, Loader2, ShieldAlert, ExternalLink, Coins } from 'lucide-react';
import { b64ToBuf } from '@/lib/smpfCrypto';
import { getWallet, getSession } from '@/lib/smpfWalletStore';
import { decryptWallet } from '@/lib/smpfCrypto';
import { listContacts } from '@/lib/smpfAddressBook';
import { useToast } from '@/components/ui/use-toast';

function friendlyError(err) {
  const m = String(err && err.message ? err.message : err);
  if (/insufficient/i.test(m)) return 'Insufficient SOL for the network fee.';
  if (/blockhash/i.test(m)) return 'Transaction expired before confirmation. Please retry.';
  if (/429|rate/i.test(m)) return 'Network provider is temporarily unavailable. Please retry.';
  return m;
}

const ATA_RENT = 2039280;

export default function SendScreen({ address, rpc, network }) {
  const { toast } = useToast();
  const [assets, setAssets] = useState([]);
  const [selAsset, setSelAsset] = useState('SOL');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [solBalance, setSolBalance] = useState(0);
  const [contacts, setContacts] = useState([]);

  const conn = React.useMemo(() => new Connection(rpc, 'confirmed'), [rpc]);
  const explorer = network === 'devnet' ? 'https://solana.fm/tx' : 'https://solscan.io/tx';

  useEffect(() => { loadAssets(); /* eslint-disable-next-line */ }, [rpc]);
  useEffect(() => { listContacts().then(setContacts).catch(() => {}); }, []);

  async function loadAssets() {
    try {
      const pub = new PublicKey(address);
      const lamports = await conn.getBalance(pub);
      setSolBalance(lamports / 1e9);
      const list = [{ key: 'SOL', label: 'SOL', decimals: 9, balance: lamports / 1e9, programId: null, mint: null, sourceATA: null }];
      for (const programId of [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID]) {
        const res = await conn.getParsedTokenAccountsByOwner(pub, { programId });
        for (const acc of res.value) {
          const info = acc.account.data?.parsed?.info;
          if (!info) continue;
          const dec = Number(info.tokenAmount?.decimals || 0);
          const ui = Number(info.tokenAmount?.uiAmount || 0);
          list.push({
            key: info.mint,
            label: `${info.mint.slice(0, 4)}…${info.mint.slice(-4)}`,
            decimals: dec,
            balance: ui,
            programId: programId.toBase58(),
            mint: info.mint,
            sourceATA: acc.pubkey.toBase58(),
          });
        }
      }
      setAssets(list);
    } catch {}
  }

  const current = assets.find((a) => a.key === selAsset) || assets[0];

  function setMax() {
    if (!current) return;
    if (current.key === 'SOL') {
      setAmount(String(Math.max(0, current.balance - 0.0001).toFixed(5)));
    } else {
      setAmount(String(current.balance));
    }
  }

  async function prepare() {
    setResult(null);
    setPreview(null);
    setBusy(true);
    try {
      if (!to) throw new Error('Recipient address is not valid.');
      let recipient;
      try { recipient = new PublicKey(to); } catch { throw new Error('Recipient address is not valid.'); }

      const fromPubkey = new PublicKey(address);
      let tx = new Transaction({ feePayer: fromPubkey });
      let ataCost = 0;
      let needAta = false;
      let transferAmount;

      if (current.key === 'SOL') {
        transferAmount = Math.round((parseFloat(amount) || 0) * LAMPORTS_PER_SOL);
        if (transferAmount <= 0) throw new Error('Enter a valid amount.');
        tx.add(SystemProgram.transfer({ fromPubkey, toPubkey: recipient, lamports: transferAmount }));
      } else {
        transferAmount = Math.round((parseFloat(amount) || 0) * Math.pow(10, current.decimals));
        if (transferAmount <= 0) throw new Error('Enter a valid amount.');
        const programId = new PublicKey(current.programId);
        const destATA = await getAssociatedTokenAddress(new PublicKey(current.mint), recipient, false, programId, ASSOCIATED_TOKEN_PROGRAM_ID);
        const destInfo = await conn.getAccountInfo(destATA);
        if (!destInfo) {
          tx.add(createAssociatedTokenAccountInstruction(fromPubkey, destATA, recipient, new PublicKey(current.mint), programId, ASSOCIATED_TOKEN_PROGRAM_ID));
          ataCost = ATA_RENT;
          needAta = true;
        }
        tx.add(createTransferInstruction(new PublicKey(current.sourceATA), destATA, fromPubkey, transferAmount, [], programId));
      }

      const { blockhash } = await conn.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      const fee = 5000 + (needAta ? ATA_RENT : 0);

      let simulation = 'ok';
      try {
        const sim = await conn.simulateTransaction(tx);
        if (sim.value.err) simulation = 'warning';
      } catch {
        simulation = 'warning';
      }

      setPreview({
        to: recipient.toBase58(),
        amount: parseFloat(amount),
        asset: current.label,
        feeSol: fee / LAMPORTS_PER_SOL,
        ataCostSol: ataCost / LAMPORTS_PER_SOL,
        needAta,
        simulation,
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
      let recovered;
      try { recovered = await decryptWallet(stored.backup, password); } catch { throw new Error('Incorrect wallet password.'); }
      if (recovered.address !== address) throw new Error('Backup does not match this wallet.');
      const kp = Keypair.fromSecretKey(b64ToBuf(recovered.secretKeyB64));
      const tx = preview.builtTx;
      tx.sign(kp);
      const sig = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: false });
      await conn.confirmTransaction(sig, 'confirmed');
      setResult({ sent: true, signature: sig });
      setPreview(null);
      setPassword('');
      await loadAssets();
      toast({ title: 'Sent', description: 'Transaction confirmed.' });
    } catch (e) {
      toast({ title: 'Send failed', description: friendlyError(e), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  const poison = to.length > 10 && contacts.some((c) => c.address !== to && c.address.slice(0, 4) === to.slice(0, 4) && c.address.slice(-4) === to.slice(-4));

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white">Send</h2>
        <p className="text-white/60 text-sm">SOL, $DUC, and other Solana tokens.</p>
      </div>

      <Card className="bg-white/10 backdrop-blur border-white/20">
        <CardContent className="p-6 space-y-4">
          <div>
            <Label className="text-white">Asset</Label>
            <select
              value={selAsset}
              onChange={(e) => { setSelAsset(e.target.value); setAmount(''); setPreview(null); }}
              className="mt-1 w-full bg-white/10 border border-white/20 text-white rounded-md p-2"
            >
              {assets.map((a) => (
                <option key={a.key} value={a.key} className="bg-slate-900">
                  {a.key === 'SOL' ? `SOL (${a.balance.toFixed(4)})` : `${a.label} (${a.balance})`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-white">Recipient address</Label>
            <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="Solana address" className="mt-1 bg-white/10 border-white/20 text-white font-mono text-sm" />
            {poison && <p className="text-xs text-yellow-300 mt-1 flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> This address resembles a saved contact but doesn't match exactly. Verify carefully.</p>}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-white">Amount</Label>
              <button className="text-xs text-emerald-300" onClick={setMax}>Max</button>
            </div>
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.0" type="number" className="mt-1 bg-white/10 border-white/20 text-white" />
            {current && current.key !== 'SOL' && <p className="text-[10px] text-white/40 mt-1">Balance: {current.balance} {current.label}</p>}
          </div>

          {!preview && !result && (
            <Button onClick={prepare} disabled={busy || !to || !amount} className="w-full bg-white text-purple-700 hover:bg-gray-100">
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Review transaction
            </Button>
          )}

          {preview && !result && (
            <div className="space-y-3">
              <div className="bg-black/30 rounded-lg p-3 text-sm text-white space-y-1">
                <div className="flex justify-between"><span className="text-white/60">To</span><span className="font-mono text-xs break-all">{preview.to}</span></div>
                <div className="flex justify-between"><span className="text-white/60">Amount</span><span>{preview.amount} {preview.asset}</span></div>
                <div className="flex justify-between"><span className="text-white/60">Network fee</span><span>~{preview.feeSol.toFixed(6)} SOL</span></div>
                {preview.needAta && <div className="flex justify-between"><span className="text-white/60">ATA creation</span><span>~{preview.ataCostSol.toFixed(6)} SOL</span></div>}
                <div className="flex justify-between"><span className="text-white/60">Simulation</span><span className={preview.simulation === 'ok' ? 'text-emerald-300' : 'text-yellow-300'}>{preview.simulation === 'ok' ? 'OK' : 'Warning — review'}</span></div>
              </div>
              <div className="flex items-start gap-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/30">
                <ShieldAlert className="w-4 h-4 text-yellow-300 shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-100/90">First-time recipient. Verify the address carefully before confirming.</p>
              </div>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Wallet password to confirm" className="bg-white/10 border-white/20 text-white" />
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 border-white/30 text-white bg-transparent" onClick={() => setPreview(null)}>Cancel</Button>
                <Button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white" disabled={busy || !password} onClick={confirmAndSend}>
                  {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Confirm &amp; send
                </Button>
              </div>
            </div>
          )}

          {result?.sent && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-300 text-sm"><Coins className="w-4 h-4" /> Transaction confirmed.</div>
              <a href={`${explorer}/${result.signature}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-emerald-300 text-sm underline">
                View on explorer <ExternalLink className="w-3 h-3" />
              </a>
              <Button variant="outline" className="w-full border-white/30 text-white bg-transparent" onClick={() => { setResult(null); setTo(''); setAmount(''); }}>
                Send another
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}