import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wallet, Loader2, AlertCircle, QrCode } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import JupiterMobileQR from './JupiterMobileQR';

export default function WalletLogin({ onSuccess, merchantId }) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [walletType, setWalletType] = useState('');
  const [showJupiterQR, setShowJupiterQR] = useState(false);

  // Auto-clear error after 4 seconds
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(''), 4000);
    return () => clearTimeout(timer);
  }, [error]);

  const connectPhantom = async () => {
    setConnecting(true);
    setError('');
    setWalletType('Phantom');

    try {
      // Check for Phantom
      const getProvider = () => {
        if ('phantom' in window) {
          const provider = window.phantom?.solana;
          if (provider?.isPhantom) return provider;
        }
        return window.solana?.isPhantom ? window.solana : null;
      };

      const provider = getProvider();
      
      if (!provider) {
        const isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (isMobile) {
          // Deep link to Phantom mobile app
          const url = window.location.href;
          const dappUrl = encodeURIComponent(url);
          window.location.href = `https://phantom.app/ul/browse/${dappUrl}?ref=${dappUrl}`;
          return;
        } else {
          window.open('https://phantom.app/', '_blank');
          throw new Error('Phantom wallet not found. Please install the extension or open in Phantom mobile browser.');
        }
      }

      // Connect
      const resp = await provider.connect();
      const publicKey = resp.publicKey.toString();

      console.log('Phantom connected:', publicKey);

      // Sign message
      const message = `Sign this message to login to ChainLINK POS\n\nWallet: ${publicKey}\nTimestamp: ${Date.now()}`;
      const encodedMessage = new TextEncoder().encode(message);
      const signedMessage = await provider.signMessage(encodedMessage, 'utf8');

      await authenticateWallet(publicKey, 'phantom', {
        signature: Array.from(signedMessage.signature),
        message: message
      });

    } catch (err) {
      console.error('Phantom connection error:', err);
      if (!err.message?.includes('User rejected') && !err.message?.includes('User cancelled')) {
        setError(err.message || 'Failed to connect to Phantom wallet');
      }
    } finally {
      setConnecting(false);
      setWalletType('');
    }
  };

  const connectSolflare = async () => {
    setConnecting(true);
    setError('');
    setWalletType('Solflare');

    try {
      const isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
      
      // On mobile, try to detect any Solana wallet or redirect to Solflare
      if (isMobile) {
        // Try window.solana first (may be injected by Solflare mobile)
        const provider = window?.solana || window?.solflare;
        
        if (provider) {
          // Found a wallet provider
          const resp = await provider.connect();
          const publicKey = resp.publicKey.toString();

          console.log('Mobile Solflare connected:', publicKey);

          const message = `Sign this message to login to ChainLINK POS\n\nWallet: ${publicKey}\nTimestamp: ${Date.now()}`;
          const encodedMessage = new TextEncoder().encode(message);
          const signedMessage = await provider.signMessage(encodedMessage, 'utf8');

          await authenticateWallet(publicKey, 'solflare', {
            signature: Array.from(signedMessage.signature),
            message: message
          });
        } else {
          // No wallet detected, redirect to Solflare mobile
          const url = window.location.href;
          window.location.href = `https://solflare.com/ul/v1/browse/${encodeURIComponent(url)}`;
          return;
        }
      } else {
        // Desktop - check for Solflare extension
        const provider = window?.solflare;
        
        if (!provider) {
          window.open('https://solflare.com/', '_blank');
          throw new Error('Solflare wallet not found. Please install the extension.');
        }

        await provider.connect();
        const publicKey = provider.publicKey.toString();

        console.log('Solflare connected:', publicKey);

        const message = `Sign this message to login to ChainLINK POS\n\nWallet: ${publicKey}\nTimestamp: ${Date.now()}`;
        const encodedMessage = new TextEncoder().encode(message);
        const signedMessage = await provider.signMessage(encodedMessage, 'utf8');

        await authenticateWallet(publicKey, 'solflare', {
          signature: Array.from(signedMessage.signature),
          message: message
        });
      }

    } catch (err) {
      console.error('Solflare connection error:', err);
      if (!err.message?.includes('User rejected') && !err.message?.includes('User cancelled')) {
        setError(err.message || 'Failed to connect to Solflare wallet');
      }
    } finally {
      setConnecting(false);
      setWalletType('');
    }
  };

  const connectMobileWallet = async () => {
    setConnecting(true);
    setError('');
    setWalletType('Mobile');

    try {
      // Try to detect any available Solana wallet provider (works on both mobile and desktop)
      const provider = window?.solana || window?.phantom?.solana || window?.solflare || window?.backpack;
      
      if (!provider) {
        const isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
        
        if (isMobile) {
          // Redirect to a popular wallet
          throw new Error('No wallet app detected. Please install Phantom, Solflare, or Backpack and open this page in the wallet browser.');
        } else {
          throw new Error('No wallet detected. Please install a Solana wallet extension (Phantom, Solflare, Backpack).');
        }
      }

      const resp = await provider.connect();
      const publicKey = resp.publicKey.toString();

      console.log('Mobile Wallet connected:', publicKey);

      const message = `Sign this message to login to ChainLINK POS\n\nWallet: ${publicKey}\nTimestamp: ${Date.now()}`;
      const encodedMessage = new TextEncoder().encode(message);
      const signedMessage = await provider.signMessage(encodedMessage, 'utf8');

      await authenticateWallet(publicKey, 'mobile', {
        signature: Array.from(signedMessage.signature),
        message: message
      });

    } catch (err) {
      console.error('Mobile Wallet connection error:', err);
      if (!err.message?.includes('User rejected') && !err.message?.includes('User cancelled')) {
        setError(err.message || 'Failed to connect wallet');
      }
    } finally {
      setConnecting(false);
      setWalletType('');
    }
  };

  const connectSolanaSeeker = async () => {
    setConnecting(true);
    setError('');
    setWalletType('Solana Mobile');

    try {
      // Check if running on Solana Mobile (Saga/Seeker)
      const provider = window?.solana;
      
      if (!provider) {
        throw new Error('Solana Mobile wallet not detected. Please open this page in the Solana Mobile wallet browser.');
      }

      const resp = await provider.connect();
      const publicKey = resp.publicKey.toString();

      console.log('Solana Mobile connected:', publicKey);

      const message = `Sign this message to login to ChainLINK POS\n\nWallet: ${publicKey}\nTimestamp: ${Date.now()}`;
      const encodedMessage = new TextEncoder().encode(message);
      const signedMessage = await provider.signMessage(encodedMessage, 'utf8');

      await authenticateWallet(publicKey, 'solana_mobile', {
        signature: Array.from(signedMessage.signature),
        message: message
      });

    } catch (err) {
      console.error('Solana Mobile connection error:', err);
      if (!err.message?.includes('User rejected') && !err.message?.includes('User cancelled')) {
        setError(err.message || 'Failed to connect to Solana Mobile wallet');
      }
    } finally {
      setConnecting(false);
      setWalletType('');
    }
  };

  const connectJupiter = async () => {
    setConnecting(true);
    setError('');
    setWalletType('Jupiter');

    try {
      const isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
      
      if (isMobile) {
        // Mobile: Try to connect directly or use deep link
        const provider = window?.solana || window?.jupiter;
        
        if (provider) {
          // Wallet detected, connect directly
          const resp = await provider.connect();
          const publicKey = resp.publicKey.toString();

          console.log('Mobile Jupiter connected:', publicKey);

          const message = `Sign this message to login to ChainLINK POS\n\nWallet: ${publicKey}\nTimestamp: ${Date.now()}`;
          const encodedMessage = new TextEncoder().encode(message);
          const signedMessage = await provider.signMessage(encodedMessage, 'utf8');

          await authenticateWallet(publicKey, 'jupiter', {
            signature: Array.from(signedMessage.signature),
            message: message
          });
        } else {
          // No wallet detected - deep link to Jupiter mobile
          const url = window.location.href;
          window.location.href = `jupiter://browser?url=${encodeURIComponent(url)}`;
          return;
        }
      } else {
        // Desktop: Show QR code
        setShowJupiterQR(true);
        setConnecting(false);
        setWalletType('');
        return;
      }

    } catch (err) {
      console.error('Jupiter connection error:', err);
      if (!err.message?.includes('User rejected') && !err.message?.includes('User cancelled')) {
        setError(err.message || 'Failed to connect to Jupiter wallet');
      }
    } finally {
      setConnecting(false);
      setWalletType('');
    }
  };



  const authenticateWallet = async (walletAddress, walletType, signatureData) => {
    try {
      // Call backend function to authenticate wallet
      const { data } = await base44.functions.invoke('authenticateWallet', {
        wallet_address: walletAddress,
        wallet_type: walletType,
        signature_data: signatureData,
        merchant_id: merchantId || null
      });

      if (!data.success) {
        throw new Error(data.error || 'Wallet authentication failed');
      }

      // Check if this is a new user needing onboarding
      if (data.is_new_user) {
        // Store wallet info for onboarding
        sessionStorage.setItem('pendingWalletAuth', JSON.stringify({
          wallet_address: walletAddress,
          wallet_type: walletType,
          signature_data: signatureData
        }));

        // Redirect to onboarding
        window.location.href = createPageUrl('MerchantOnboarding');
        return;
      }

      // Existing user - log them in
      if (data.user) {
        localStorage.setItem('pinLoggedInUser', JSON.stringify(data.user));
        
        // Log the action - wrap in try/catch to prevent blocking login
        try {
          await base44.entities.SystemLog.create({
            merchant_id: data.user.merchant_id || null,
            log_type: 'merchant_action',
            action: 'Wallet Login',
            description: `User logged in with ${walletType} wallet: ${walletAddress}`,
            user_email: data.user.email || walletAddress,
            severity: 'info'
          });
        } catch (logError) {
          console.log('Could not log wallet login:', logError);
        }

        // Success callback or redirect
        if (onSuccess) {
          onSuccess(data.user);
        } else {
          // Default redirect to System Menu
          window.location.href = createPageUrl('SystemMenu');
        }
      }

    } catch (err) {
      console.error('Wallet authentication error:', err);
      throw err;
    }
  };

  if (showJupiterQR) {
    return <JupiterMobileQR onSuccess={onSuccess} />;
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

        <div className="grid gap-3">
          {/* Phantom */}
          <Button
            onClick={connectPhantom}
            disabled={connecting}
            variant="outline"
            className="w-full justify-start h-14 hover:border-purple-300 transition-all"
          >
            {connecting && walletType === 'Phantom' ? (
              <Loader2 className="w-6 h-6 mr-3 animate-spin text-purple-600" />
            ) : (
              <img 
                src="https://phantom.app/img/phantom-icon-purple.png" 
                alt="Phantom"
                className="w-6 h-6 mr-3"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="24" fill="%23AB9FF2"/><path d="M96 48c0 13.2-10.8 24-24 24s-24-10.8-24-24S58.8 24 72 24s24 10.8 24 24z" fill="%23fff"/><circle cx="64" cy="52" r="4" fill="%23AB9FF2"/><circle cx="80" cy="52" r="4" fill="%23AB9FF2"/></svg>';
                }}
              />
            )}
            <span className="font-medium">Phantom</span>
          </Button>

          {/* Solflare */}
          <Button
            onClick={connectSolflare}
            disabled={connecting}
            variant="outline"
            className="w-full justify-start h-14 hover:border-orange-300 transition-all"
          >
            {connecting && walletType === 'Solflare' ? (
              <Loader2 className="w-6 h-6 mr-3 animate-spin text-orange-600" />
            ) : (
              <img 
                src="https://solflare.com/assets/logo.svg" 
                alt="Solflare"
                className="w-6 h-6 mr-3"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="24" fill="%23FC9332"/><circle cx="64" cy="64" r="32" fill="%23fff"/></svg>';
                }}
              />
            )}
            <span className="font-medium">Solflare</span>
          </Button>

          {/* Jupiter */}
          <Button
            onClick={connectJupiter}
            disabled={connecting}
            variant="outline"
            className="w-full justify-start h-14 hover:border-green-300 transition-all"
          >
            {connecting && walletType === 'Jupiter' ? (
              <Loader2 className="w-6 h-6 mr-3 animate-spin text-green-600" />
            ) : (
              <img 
                src="https://jup.ag/svg/jupiter-logo.svg" 
                alt="Jupiter"
                className="w-6 h-6 mr-3"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="24" fill="%2319FB9B"/><circle cx="64" cy="64" r="28" fill="%23000"/><circle cx="64" cy="64" r="16" fill="%2319FB9B"/></svg>';
                }}
              />
            )}
            <span className="font-medium">Jupiter</span>
          </Button>

          {/* Solana Mobile (Saga/Seeker) */}
          <Button
            onClick={connectSolanaSeeker}
            disabled={connecting}
            variant="outline"
            className="w-full justify-start h-14 hover:border-red-300 transition-all"
          >
            {connecting && walletType === 'Solana Mobile' ? (
              <Loader2 className="w-6 h-6 mr-3 animate-spin text-red-600" />
            ) : (
              <img 
                src="https://solanamobile.com/android-chrome-512x512.png" 
                alt="Solana Mobile"
                className="w-6 h-6 mr-3"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="24" fill="%23DC1FFF"/><path d="M32 48h64l-8 8H32z" fill="%23fff"/><path d="M32 64h64l-8 8H32z" fill="%23fff"/><path d="M32 80h64l-8 8H32z" fill="%23fff"/></svg>';
                }}
              />
            )}
            <span className="font-medium">Solana Mobile (Saga/Seeker)</span>
          </Button>

          {/* Generic Mobile Wallet */}
          <Button
            onClick={connectMobileWallet}
            disabled={connecting}
            variant="outline"
            className="w-full justify-start h-14 hover:border-blue-300 transition-all"
          >
            {connecting && walletType === 'Mobile' ? (
              <Loader2 className="w-6 h-6 mr-3 animate-spin text-blue-600" />
            ) : (
              <img 
                src="https://solana.com/src/img/branding/solanaLogoMark.svg" 
                alt="Solana"
                className="w-6 h-6 mr-3"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="24" fill="%2314F195"/><path d="M32 48h64l-8 8H32z" fill="%23000"/><path d="M32 64h64l-8 8H32z" fill="%23000"/><path d="M32 80h64l-8 8H32z" fill="%23000"/></svg>';
                }}
              />
            )}
            <span className="font-medium">Other Mobile Wallet</span>
          </Button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Don't have a wallet? Click any option above to get started.
        </p>
      </CardContent>
    </Card>
  );
}