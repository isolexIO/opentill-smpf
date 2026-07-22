import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Wallet, Loader2, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import SolanaWalletProvider from './SolanaWalletProvider';

function AmbassadorWalletLoginContent({ onDone }) {
  const { publicKey, connected, signMessage, connecting, wallet } = useWallet();
  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState('');
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    if (connected && publicKey && signMessage && !authenticated && !authenticating) {
      handleAuthenticate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey, signMessage, authenticated]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(''), 5000);
    return () => clearTimeout(t);
  }, [error]);

  const handleAuthenticate = async () => {
    if (!publicKey || !signMessage || authenticating || authenticated) return;
    setAuthenticating(true);
    setError('');
    try {
      const message = `Sign this message to login to openTILL Ambassadors\n\nWallet: ${publicKey.toString()}\nTimestamp: ${Date.now()}`;
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await signMessage(encodedMessage);

      const detectedWalletType = (wallet?.name || '').toLowerCase();
      const walletType = ['phantom', 'solflare', 'backpack', 'jupiter'].includes(detectedWalletType)
        ? detectedWalletType
        : 'phantom';

      const { data } = await base44.functions.invoke('dealerAuth', {
        action: 'wallet_auth',
        wallet_address: publicKey.toString(),
        wallet_type: walletType,
        signature_data: {
          signature: Array.from(signature),
          message,
        },
      });

      if (!data.success) throw new Error(data.error || 'Wallet authentication failed');

      localStorage.setItem('dealerToken', data.token);
      localStorage.setItem('dealerData', JSON.stringify(data.dealer));
      if (data.user) localStorage.setItem('pinLoggedInUser', JSON.stringify(data.user));
      setAuthenticated(true);
      if (onDone) onDone(data);
      else window.location.href = createPageUrl('DealerDashboard');
    } catch (err) {
      const msg = err.message || '';
      const isIgnorable =
        msg.includes('User rejected') ||
        msg.includes('User cancelled') ||
        msg.includes('MWA') ||
        msg.includes('Mobile Wallet Adapter') ||
        msg.includes('compatible app') ||
        msg.includes('not found') ||
        msg.includes('not installed') ||
        msg.includes('WalletNotFound') ||
        msg.includes('WalletNotReady');
      if (!isIgnorable) setError(msg || 'Failed to authenticate wallet');
    } finally {
      setAuthenticating(false);
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-start gap-2 text-red-200 bg-red-500/15 border border-red-400/30 rounded-lg p-2.5 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {(connecting || authenticating) && (
        <div className="flex items-center justify-center gap-2 py-1 text-xs text-white/60">
          <Loader2 className="w-4 h-4 animate-spin" />
          {authenticating ? 'Authenticating...' : 'Connecting wallet...'}
        </div>
      )}
      <WalletMultiButton className="!w-full !h-11 !rounded-md !justify-center !text-sm !font-semibold" />
      <p className="text-center text-white/40 text-xs">
        <Wallet className="w-3 h-3 inline mr-1" />
        Phantom, Solflare, Backpack & more
      </p>
    </div>
  );
}

export default function AmbassadorWalletLogin({ onDone }) {
  return (
    <SolanaWalletProvider autoConnect={false}>
      <AmbassadorWalletLoginContent onDone={onDone} />
    </SolanaWalletProvider>
  );
}