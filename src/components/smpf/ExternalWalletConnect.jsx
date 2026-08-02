import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, Link2, Unlink, Copy, CheckCircle2 } from 'lucide-react';
import { useInjectedWallet } from '@/lib/useInjectedWallet';

export default function ExternalWalletConnect() {
  const { name, pubkey, connected, connect, disconnect } = useInjectedWallet();
  const [copied, setCopied] = React.useState(false);

  function copy() {
    if (!pubkey) return;
    navigator.clipboard?.writeText(pubkey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Card className="bg-white/10 border-white/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white text-base"><Link2 className="w-5 h-5 text-emerald-300" /> External wallet</CardTitle>
        <CardDescription className="text-white/50">Connect a Solana wallet-standard compatible wallet. We never ask for your seed phrase or private key.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {connected && pubkey ? (
          <>
            <div className="flex items-center gap-2 text-sm text-emerald-300">
              <CheckCircle2 className="w-4 h-4" /> {name} connected
            </div>
            <div className="bg-black/30 rounded-lg p-3 font-mono text-xs break-all text-white">{pubkey}</div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 border-white/30 text-white bg-transparent" onClick={copy}>
                {copied ? <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-300" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button variant="outline" className="flex-1 border-white/30 text-red-300 bg-transparent" onClick={disconnect}>
                <Unlink className="w-4 h-4 mr-2" /> Disconnect
              </Button>
            </div>
          </>
        ) : (
          <Button onClick={connect} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white">
            <Wallet className="w-4 h-4 mr-2" /> Connect {name || 'Solana wallet'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}