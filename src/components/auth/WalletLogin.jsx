import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wallet, Loader2, AlertCircle, QrCode } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import SolanaWalletProvider from './SolanaWalletProvider';
import JupiterMobileQR from './JupiterMobileQR';

function WalletLoginContent({ onSuccess, merchantId }) {
  const { publicKey, connected, signMessage, connecting } = useWallet();
  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState('');
  const [showJupiterQR, setShowJupiterQR] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    // Wait until all three are ready: connected, publicKey, AND signMessage
    if (connected && publicKey && signMessage && !authenticated && !authenticating) {
      handleAuthenticate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey, signMessage, authenticated]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(''), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  const handleAuthenticate = async () => {
    if (!publicKey || !signMessage || authenticating || authenticated) return;
    setAuthenticating(true);
    setError('');
    try {
      const message = `Sign this message to login to openTILL\n\nWallet: ${publicKey.toString()}\nTimestamp: ${Date.now()}`;
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await signMessage(encodedMessage);

      const { data } = await base44.functions.invoke('authenticateWallet', {
        wallet_address: publicKey.toString(),
        wallet_type: 'phantom',
        signature_data: {
          signature: Array.from(signature),
          message,
        },
        merchant_id: merchantId || null,
      });

      if (!data.success) throw new Error(data.error || 'Wallet authentication failed');

      if (data.is_new_user) {
        sessionStorage.setItem('pendingWalletAuth', JSON.stringify({
          wallet_address: publicKey.toString(),
          wallet_type: 'adapter',
        }));
        window.location.href = createPageUrl('MerchantOnboarding');
        return;
      }

      if (data.user) {
        setAuthenticated(true);
        localStorage.setItem('pinLoggedInUser', JSON.stringify(data.user));
        if (onSuccess) {
          onSuccess(data.user);
        } else {
          window.location.href = createPageUrl('SystemMenu');
        }
      }
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
      if (!isIgnorable) {
        setError(msg || 'Failed to authenticate wallet');
      }
    } finally {
      setAuthenticating(false);
    }
  };

  if (showJupiterQR) {
    return (
      <div className="space-y-3">
        <JupiterMobileQR onSuccess={onSuccess} />
        <Button variant="ghost" className="w-full" onClick={() => setShowJupiterQR(false)}>
          ← Back to wallet options
        </Button>
      </div>
    );
  }

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Login with Crypto Wallet
        </CardTitle>
        <CardDescription>
          Connect your Solana wallet to login securely
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert className="bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {(connecting || authenticating) && (
          <div className="flex items-center justify-center gap-2 py-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            {authenticating ? 'Authenticating...' : 'Connecting wallet...'}
          </div>
        )}

        <div className="flex flex-col items-stretch gap-3">
          {/* On mobile, show Phantom/Solflare deep links first */}
          {isMobile ? (
            <>
              <a
                href={`https://phantom.app/ul/browse/${encodeURIComponent(window.location.origin + window.location.pathname)}`}
                className="flex items-center gap-3 w-full h-14 px-4 rounded-md border border-gray-200 hover:bg-gray-50 transition"
              >
                <img src="https://phantom.app/img/phantom-logo.svg" alt="Phantom" className="w-7 h-7" onError={e => e.target.style.display='none'} />
                <div className="text-left">
                  <p className="font-medium text-sm">Open in Phantom</p>
                  <p className="text-xs text-gray-500">Connect with Phantom wallet</p>
                </div>
              </a>
              <a
                href={`solflare://ul/browse?url=${encodeURIComponent(window.location.href)}`}
                className="flex items-center gap-3 w-full h-14 px-4 rounded-md border border-gray-200 hover:bg-gray-50 transition"
              >
                <img src="https://solflare.com/assets/logo.svg" alt="Solflare" className="w-7 h-7" onError={e => e.target.style.display='none'} />
                <div className="text-left">
                  <p className="font-medium text-sm">Open in Solflare</p>
                  <p className="text-xs text-gray-500">Connect with Solflare wallet</p>
                </div>
              </a>
              <div className="relative flex items-center gap-2">
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-xs text-gray-400 whitespace-nowrap">or use browser extension</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>
            </>
          ) : null}

          {/* Wallet adapter multi-button for desktop browser extensions */}
          <WalletMultiButton className="!w-full !h-14 !rounded-md !justify-start !text-base !font-medium" />

          {/* QR scan option */}
          <Button
            onClick={() => setShowJupiterQR(true)}
            variant="outline"
            className="w-full h-14 justify-start gap-3 hover:border-green-300"
          >
            <QrCode className="w-6 h-6 text-green-600" />
            <div className="text-left">
              <p className="font-medium">Scan QR with Phone</p>
              <p className="text-xs text-gray-500">Use any Solana wallet to scan & login</p>
            </div>
          </Button>
        </div>

        <p className="text-xs text-gray-500 text-center">
          Works with Phantom, Solflare, Backpack & more
        </p>
      </CardContent>
    </Card>
  );
}

export default function WalletLogin({ onSuccess, merchantId }) {
  return (
    <SolanaWalletProvider autoConnect={false}>
      <WalletLoginContent onSuccess={onSuccess} merchantId={merchantId} />
    </SolanaWalletProvider>
  );
}