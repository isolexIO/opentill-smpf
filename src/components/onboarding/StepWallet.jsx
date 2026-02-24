import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Wallet, CheckCircle, Info, ChevronRight, Loader2 } from 'lucide-react';
import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import '@solana/wallet-adapter-react-ui/styles.css';

function WalletConnectContent({ formData, onChange, onNext, onBack }) {
  const { publicKey, connected, signMessage, connecting } = useWallet();
  const [authenticating, setAuthenticating] = useState(false);
  const [manualMode, setManualMode] = useState(!!formData.wallet_address);

  const isValidSolana = (addr) => addr && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);

  React.useEffect(() => {
    if (connected && publicKey && !authenticating) {
      onChange('wallet_address', publicKey.toString());
      setAuthenticating(false);
    }
  }, [connected, publicKey]);

  if (manualMode) {
    return (
      <div className="space-y-5">
        <div className="text-center space-y-1 mb-2">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center">
              <Wallet className="w-7 h-7 text-purple-500" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-slate-900">Connect Your Wallet</h2>
          <p className="text-slate-500 text-sm">Your Solana wallet will receive $DUC rewards. You can skip this now.</p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="wallet" className="font-medium text-slate-700">Solana Wallet Address</Label>
            <Input
              id="wallet"
              placeholder="Enter your public wallet address..."
              value={formData.wallet_address || ''}
              onChange={(e) => onChange('wallet_address', e.target.value.trim())}
              className="font-mono text-sm h-11"
            />
            {formData.wallet_address && (
              isValidSolana(formData.wallet_address) ? (
                <p className="flex items-center gap-1 text-xs text-cyan-600">
                  <CheckCircle className="w-3.5 h-3.5" /> Valid Solana address
                </p>
              ) : (
                <p className="text-xs text-amber-600">Address format looks off — double check before continuing.</p>
              )
            )}
          </div>
          <button
            type="button"
            onClick={() => { setManualMode(false); onChange('wallet_address', ''); }}
            className="text-xs text-slate-400 underline"
          >← Back to connect wallet</button>
        </div>

        <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <p>Your wallet is used only to receive $DUC rewards. You can add or change it later in Settings.</p>
        </div>

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" onClick={onBack} className="flex-1 h-12">Back</Button>
          <Button
            type="button"
            onClick={onNext}
            className="flex-[2] bg-cyan-600 hover:bg-cyan-700 text-white h-12 font-bold rounded-xl"
          >
            {formData.wallet_address && isValidSolana(formData.wallet_address) ? 'Continue with Wallet' : 'Skip for Now'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1 mb-2">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center">
            <Wallet className="w-7 h-7 text-purple-500" />
          </div>
        </div>
        <h2 className="text-2xl font-black text-slate-900">Connect Your Wallet</h2>
        <p className="text-slate-500 text-sm">Your Solana wallet will receive $DUC rewards. You can skip this now.</p>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Select Your Wallet</p>
        <WalletMultiButton className="!w-full !h-14 !rounded-lg !justify-start !text-base !font-medium" />
        
        {connected && publicKey && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs text-green-700">
              <CheckCircle className="w-3 h-3 inline mr-1" />
              Connected: {publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-8)}
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() => setManualMode(true)}
          className="w-full flex items-center justify-between p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-slate-500 hover:bg-slate-100 transition-all text-sm"
        >
          <span>Or paste wallet address</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>Your wallet is used only to receive $DUC rewards. You can add or change it later in Settings.</p>
      </div>

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1 h-12">Back</Button>
        <Button
          type="button"
          onClick={onNext}
          className="flex-[2] bg-cyan-600 hover:bg-cyan-700 text-white h-12 font-bold rounded-xl"
          disabled={connecting}
        >
          {connecting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            formData.wallet_address ? 'Continue with Wallet' : 'Skip for Now'
          )}
        </Button>
      </div>
    </div>
  );
}

export default function StepWallet({ formData, onChange, onNext, onBack }) {
  const endpoint = React.useMemo(() => clusterApiUrl('mainnet-beta'), []);
  
  const wallets = React.useMemo(() => {
    return [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ];
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          <WalletConnectContent formData={formData} onChange={onChange} onNext={onNext} onBack={onBack} />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}