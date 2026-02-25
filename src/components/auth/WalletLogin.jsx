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
    if (connected && publicKey && !authenticated && !authenticating) {
      handleAuthenticate();
    }
  }, [connected, publicKey]);

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
      if (!err.message?.includes('User rejected') && !err.message?.includes('User cancelled')) {
        setError(err.message || 'Failed to authenticate wallet');
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
          <Alert className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-800 dark:text-red-300">{error}</AlertDescription>
          </Alert>
        )}

        {(connecting || authenticating) && (
          <div className="flex items-center justify-center gap-2 py-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            {authenticating ? 'Authenticating...' : 'Connecting...'}
          </div>
        )}

        {/* Wallet Adapter Multi-Button — auto-detects all installed wallets */}
        <div className="flex flex-col items-stretch gap-3">
          <WalletMultiButton className="!w-full !h-14 !rounded-md !justify-start !text-base !font-medium" />

          {/* Jupiter QR for cross-device */}
          <Button
            onClick={() => setShowJupiterQR(true)}
            variant="outline"
            className="w-full h-14 justify-start gap-3 hover:border-green-300"
          >
            <QrCode className="w-6 h-6 text-green-600" />
            <div className="text-left">
              <p className="font-medium">Scan with Phone</p>
              <p className="text-xs text-gray-500">Connect your mobile wallet via QR</p>
            </div>
          </Button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Detects Phantom, Solflare, Backpack, Solana Mobile (Saga/Seeker) and more
        </p>
      </CardContent>
    </Card>
  );
}

export default function WalletLogin({ onSuccess, merchantId }) {
  const endpoint = useMemo(() => clusterApiUrl('mainnet-beta'), []);

  const wallets = useMemo(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const adapters = [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ];

    // Add Solana Mobile Wallet Adapter for mobile devices (Saga / Seeker)
    if (isMobile) {
      try {
        adapters.unshift(
          new SolanaMobileWalletAdapter({
            addressSelector: createDefaultAddressSelector(),
            appIdentity: {
              name: 'openTILL',
              uri: window.location.origin,
              icon: `${window.location.origin}/favicon.ico`,
            },
            authorizationResultCache: createDefaultAuthorizationResultCache(),
            cluster: 'mainnet-beta',
          })
        );
      } catch (e) {
        // silently skip if not available
      }
    }

    return adapters;
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          <WalletLoginContent onSuccess={onSuccess} merchantId={merchantId} />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}