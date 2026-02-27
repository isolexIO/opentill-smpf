import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Wallet, CheckCircle, Info, ChevronRight, Loader2, Monitor, ExternalLink } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import SolanaWalletProvider from '@/components/auth/SolanaWalletProvider';

function isMobileOrApp() {
  const ua = navigator.userAgent || '';
  const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(ua);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  return isMobile || isStandalone;
}

const isValidSolana = (addr) => addr && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);

// Phantom deep link — uses phantom:// URI scheme to open the native app
function buildPhantomDeepLink() {
  const appUrl = encodeURIComponent(window.location.origin);
  const redirectLink = encodeURIComponent(window.location.href);
  // phantom:// scheme opens the app directly; fallback to universal link if not installed
  return `phantom://v1/connect?app_url=${appUrl}&redirect_link=${redirectLink}&cluster=mainnet-beta`;
}

// Solflare deep link — uses solflare:// URI scheme
function buildSolflareDeepLink() {
  const appUrl = encodeURIComponent(window.location.origin);
  const redirectLink = encodeURIComponent(window.location.href);
  return `solflare://v1/connect?app_url=${appUrl}&redirect_link=${redirectLink}&cluster=mainnet-beta`;
}

function MobileWalletConnect({ formData, onChange, onNext, onBack }) {
  const [manualMode, setManualMode] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState(null);

  // On return from deep link, wallet may inject public key as a query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Phantom returns phantom_encryption_public_key or just the public key
    const pk = params.get('phantom_public_key') || params.get('public_key') || params.get('pk');
    if (pk && isValidSolana(pk)) {
      onChange('wallet_address', pk);
    }
  }, []);

  const handleDeepLink = (wallet) => {
    setConnectingWallet(wallet);
    if (wallet === 'phantom') {
      window.location.href = buildPhantomDeepLink();
    } else if (wallet === 'solflare') {
      window.location.href = buildSolflareDeepLink();
    }
  };

  if (manualMode) {
    return (
      <div className="space-y-5">
        <div className="text-center space-y-1 mb-2">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center">
              <Wallet className="w-7 h-7 text-purple-500" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-slate-900">Paste Wallet Address</h2>
          <p className="text-slate-500 text-sm">Open your wallet app, copy your address, and paste it below.</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="wallet" className="font-medium text-slate-700">Solana Wallet Address</Label>
          <Input
            id="wallet"
            placeholder="Paste your public wallet address..."
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
          onClick={() => setManualMode(false)}
          className="text-xs text-slate-400 underline"
        >← Back to wallet connect</button>

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

      {formData.wallet_address && isValidSolana(formData.wallet_address) && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-xs text-green-700 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            Connected: {formData.wallet_address.slice(0, 8)}...{formData.wallet_address.slice(-8)}
          </p>
        </div>
      )}

      <div className="space-y-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Open Wallet App</p>

        {/* Phantom */}
        <button
          type="button"
          onClick={() => handleDeepLink('phantom')}
          className="w-full flex items-center gap-4 p-4 bg-[#551BF9] hover:bg-[#4415d4] text-white rounded-xl transition-all text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <img src="https://phantom.app/img/phantom-logo.png" alt="Phantom" className="w-6 h-6 object-contain" onError={(e) => { e.target.style.display='none'; }} />
            <Wallet className="w-5 h-5 hidden" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm">Connect with Phantom</p>
            <p className="text-white/70 text-xs">Opens Phantom wallet app</p>
          </div>
          <ExternalLink className="w-4 h-4 text-white/60" />
        </button>

        {/* Solflare */}
        <button
          type="button"
          onClick={() => handleDeepLink('solflare')}
          className="w-full flex items-center gap-4 p-4 bg-[#FC8B21] hover:bg-[#e07a17] text-white rounded-xl transition-all text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <img src="https://solflare.com/assets/logo.svg" alt="Solflare" className="w-6 h-6 object-contain" onError={(e) => { e.target.style.display='none'; }} />
            <Wallet className="w-5 h-5 hidden" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm">Connect with Solflare</p>
            <p className="text-white/70 text-xs">Opens Solflare wallet app</p>
          </div>
          <ExternalLink className="w-4 h-4 text-white/60" />
        </button>

        <button
          type="button"
          onClick={() => setManualMode(true)}
          className="w-full flex items-center justify-between p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-slate-500 hover:bg-slate-100 transition-all text-sm"
        >
          <span>Or paste wallet address manually</span>
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
        >
          {formData.wallet_address && isValidSolana(formData.wallet_address) ? 'Continue with Wallet' : 'Skip for Now'}
        </Button>
      </div>
    </div>
  );
}

function DesktopWalletConnect({ formData, onChange, onNext, onBack }) {
  const { publicKey, connected, connecting } = useWallet();
  const [manualMode, setManualMode] = useState(!!formData.wallet_address);

  useEffect(() => {
    if (connected && publicKey) {
      onChange('wallet_address', publicKey.toString());
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
          <Button type="button" onClick={onNext} className="flex-[2] bg-cyan-600 hover:bg-cyan-700 text-white h-12 font-bold rounded-xl">
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

      <div className="flex items-start gap-2 bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-600">
        <Monitor className="w-4 h-4 shrink-0 mt-0.5" />
        <p>Use your browser wallet extension (Phantom, Solflare, Backpack, etc.)</p>
      </div>

      <div className="space-y-3">
        <WalletMultiButton className="!w-full !h-14 !rounded-lg !justify-start !text-base !font-medium" />

        {connected && publicKey && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs text-green-700 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
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
        <Button type="button" onClick={onNext} disabled={connecting} className="flex-[2] bg-cyan-600 hover:bg-cyan-700 text-white h-12 font-bold rounded-xl">
          {connecting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Connecting...</> : formData.wallet_address ? 'Continue with Wallet' : 'Skip for Now'}
        </Button>
      </div>
    </div>
  );
}

function WalletConnectContent({ formData, onChange, onNext, onBack }) {
  const mobile = isMobileOrApp();

  if (mobile) {
    return <MobileWalletConnect formData={formData} onChange={onChange} onNext={onNext} onBack={onBack} />;
  }

  return <DesktopWalletConnect formData={formData} onChange={onChange} onNext={onNext} onBack={onBack} />;
}

export default function StepWallet({ formData, onChange, onNext, onBack }) {
  return (
    <SolanaWalletProvider autoConnect={false}>
      <WalletConnectContent formData={formData} onChange={onChange} onNext={onNext} onBack={onBack} />
    </SolanaWalletProvider>
  );
}