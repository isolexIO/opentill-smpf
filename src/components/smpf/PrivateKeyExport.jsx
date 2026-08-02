import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { KeyRound, Loader2, ShieldAlert, Copy, CheckCircle2 } from 'lucide-react';
import { getWallet } from '@/lib/smpfWalletStore';
import { decryptWallet } from '@/lib/smpfCrypto';
import { useToast } from '@/components/ui/use-toast';

export default function PrivateKeyExport({ address }) {
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [keyText, setKeyText] = useState('');
  const [holdProgress, setHoldProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  const clearTimer = useRef(null);

  async function decrypt() {
    if (!password) return;
    setBusy(true);
    try {
      const stored = await getWallet(address);
      if (!stored) throw new Error('Wallet backup not found.');
      const r = await decryptWallet(stored.backup, password);
      if (r.address !== address) throw new Error('Backup does not match this wallet.');
      setKeyText(r.secretKeyB64);
      toast({ title: 'Decrypted', description: 'Hold the button below to reveal your key.' });
    } catch (e) {
      toast({ title: 'Export failed', description: e.message || 'Incorrect wallet password.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  function startHold() {
    setHoldProgress(0);
    const startedAt = Date.now();
    timer.current = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - startedAt) / 1500) * 100);
      setHoldProgress(pct);
      if (pct >= 100) {
        clearInterval(timer.current);
        reveal();
      }
    }, 40);
  }
  function cancelHold() {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    setHoldProgress(0);
  }
  function reveal() {
    setKeyText((k) => k); // already set
    toast({ title: 'Key revealed', description: 'Clipboard will auto-clear in 30 seconds.' });
  }

  function copy() {
    navigator.clipboard?.writeText(keyText);
    setCopied(true);
    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => {
      navigator.clipboard?.writeText(' ');
      setKeyText('');
      setCopied(false);
      toast({ title: 'Clipboard cleared' });
    }, 30000);
  }

  React.useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
    if (clearTimer.current) clearTimeout(clearTimer.current);
  }, []);

  return (
    <Card className="border-red-500/30 bg-red-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white text-base"><KeyRound className="w-5 h-5 text-red-300" /> Export private key</CardTitle>
        <CardDescription className="text-white/50">Anyone with this key has full control of your wallet. Never share it.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert className="bg-red-500/10 border-red-500/40">
          <ShieldAlert className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-200">
            This is your real Ed25519 secret key. Do not display it during screen sharing. openTILL cannot recover it for you.
          </AlertDescription>
        </Alert>

        {!keyText ? (
          <>
            <div>
              <Label className="text-white">Reauthenticate with wallet password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 bg-white/10 border-white/20 text-white" />
            </div>
            <Button onClick={decrypt} disabled={busy || !password} className="w-full bg-white text-purple-700 hover:bg-gray-100">
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
              Decrypt key
            </Button>
          </>
        ) : (
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-lg">
              <button
                onPointerDown={startHold}
                onPointerUp={cancelHold}
                onPointerLeave={cancelHold}
                className="w-full p-4 bg-black/40 rounded-lg text-white text-sm select-none"
                style={{ background: `linear-gradient(90deg, rgba(239,68,68,0.3) ${holdProgress}%, rgba(0,0,0,0.4) ${holdProgress}%)` }}
              >
                {holdProgress > 0 && holdProgress < 100 ? 'Keep holding…' : 'Hold to reveal private key'}
              </button>
            </div>
            <div className="bg-black/30 rounded-lg p-3 font-mono text-xs break-all text-white/80 min-h-[3rem]">
              {holdProgress >= 100 ? keyText : '••••••••••••••••••••••••••••••••••••••••••••••••••••'}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 border-white/30 text-white bg-transparent" onClick={copy}>
                {copied ? <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-300" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? 'Copied (clears in 30s)' : 'Copy'}
              </Button>
              <Button variant="outline" className="flex-1 border-white/30 text-red-300 bg-transparent" onClick={() => { setKeyText(''); setPassword(''); }}>
                Hide
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}