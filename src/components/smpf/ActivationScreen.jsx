import React, { useState } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Copy, ArrowRight, BadgeCheck } from 'lucide-react';

export default function ActivationScreen({ address, solBalance, ducBalance, onOpenWallet }) {
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    QRCode.toDataURL(address, { margin: 1, width: 240, color: { dark: '#0f172a', light: '#ffffff' } })
      .then(setQr)
      .catch(() => {});
  }, [address]);

  function copy() {
    navigator.clipboard?.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Your SMPF wallet is ready</h2>
        <p className="text-white/70 mt-2">Your gateway to $DUC and the Solana ecosystem.</p>
      </div>

      <Card className="bg-white/10 backdrop-blur border-white/20">
        <CardContent className="p-6 space-y-5 text-center">
          <div className="flex justify-center">
            {qr ? (
              <img src={qr} alt="Wallet QR" className="w-48 h-48 rounded-lg bg-white p-2" />
            ) : (
              <div className="w-48 h-48 rounded-lg bg-white/20 animate-pulse" />
            )}
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-sm font-semibold">
            <BadgeCheck className="w-4 h-4" /> SMPF Verified
          </div>

          <div className="bg-black/30 rounded-lg p-3 break-all font-mono text-sm text-white">{address}</div>

          <Button variant="outline" className="border-white/30 text-white bg-transparent" onClick={copy}>
            {copied ? <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-300" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? 'Copied' : 'Copy address'}
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-black/20 rounded-lg p-3">
              <p className="text-xs text-white/60 uppercase tracking-wide">SOL balance</p>
              <p className="text-xl font-bold text-white">{typeof solBalance === 'number' ? solBalance.toFixed(4) : '—'}</p>
            </div>
            <div className="bg-black/20 rounded-lg p-3">
              <p className="text-xs text-white/60 uppercase tracking-wide">$DUC balance</p>
              <p className="text-xl font-bold text-yellow-300">{typeof ducBalance === 'number' ? ducBalance.toFixed(2) : '—'}</p>
            </div>
          </div>

          <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white" onClick={onOpenWallet}>
            Open my wallet <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}