import React, { useState } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, CheckCircle2, BadgeCheck, Share2 } from 'lucide-react';

export default function ReceiveScreen({ address }) {
  const [qr, setQr] = useState('');
  const [amount, setAmount] = useState('');
  const [label, setLabel] = useState('');
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    const url = amount ? `solana:${address}?amount=${encodeURIComponent(amount)}` : `solana:${address}`;
    QRCode.toDataURL(url, { margin: 1, width: 320, color: { dark: '#0f172a', light: '#ffffff' } })
      .then(setQr)
      .catch(() => {});
  }, [address, amount]);

  function copy() {
    navigator.clipboard?.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: label || 'My openTILL SMPF address', text: address });
      } catch {}
    } else {
      copy();
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white">Receive</h2>
        <p className="text-white/60 text-sm">The same address receives SOL, $DUC, and other Solana tokens.</p>
      </div>

      <Card className="bg-white/10 backdrop-blur border-white/20">
        <CardContent className="p-6 space-y-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-sm font-semibold">
            <BadgeCheck className="w-4 h-4" /> SMPF Verified
          </div>

          {qr && <img src={qr} alt="Receive QR" className="w-64 h-64 mx-auto rounded-xl bg-white p-2" />}

          <div className="bg-black/30 rounded-lg p-3 break-all font-mono text-xs text-white">{address}</div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 border-white/30 text-white bg-transparent" onClick={copy}>
              {copied ? <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-300" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button variant="outline" className="flex-1 border-white/30 text-white bg-transparent" onClick={share}>
              <Share2 className="w-4 h-4 mr-2" /> Share
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-left">
            <div>
              <Label className="text-white">Requested amount (optional)</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.0" className="mt-1 bg-white/10 border-white/20 text-white" />
            </div>
            <div>
              <Label className="text-white">Payment label (optional)</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Note" className="mt-1 bg-white/10 border-white/20 text-white" />
            </div>
          </div>
          <p className="text-xs text-white/40">This QR is Solana Pay-compatible.</p>
        </CardContent>
      </Card>
    </div>
  );
}