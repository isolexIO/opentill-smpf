import { useMemo, useEffect } from 'react';
import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { SolanaMobileWalletAdapter, createDefaultAuthorizationResultCache, createDefaultAddressSelector } from '@solana-mobile/wallet-adapter-mobile';
import { clusterApiUrl } from '@solana/web3.js';
import '@solana/wallet-adapter-react-ui/styles.css';

const ENDPOINT = clusterApiUrl('mainnet-beta');

function buildWallets() {
  const adapters = [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
  ];

  // Only include SolanaMobileWalletAdapter on Android devices (Saga/Seeker)
  const isAndroid = typeof window !== 'undefined' && /Android/i.test(navigator.userAgent);
  if (isAndroid) {
    try {
      const mobileAdapter = new SolanaMobileWalletAdapter({
        addressSelector: createDefaultAddressSelector(),
        appIdentity: {
          name: 'openTILL',
          uri: 'https://opentill-pos.com',
          icon: '/favicon.ico',
        },
        authorizationResultCache: createDefaultAuthorizationResultCache(),
        cluster: 'mainnet-beta',
        onWalletNotFound: async () => {
          console.log('Solana Mobile Wallet not found on device');
        },
      });
      adapters.unshift(mobileAdapter);
    } catch (e) {
      // Silently skip if MWA fails to initialize
    }
  }

  return adapters;
}

// Auto-selects the MWA adapter when running inside the Solana Mobile dApp Store
function MWAAutoSelector() {
  const { select, wallets, wallet, connected } = useWallet();

  useEffect(() => {
    if (connected || wallet) return;
    const mwaAdapter = wallets.find(w =>
      w.adapter.name === 'Mobile Wallet Adapter' || w.adapter.name === 'Solana Mobile'
    );
    if (mwaAdapter) {
      select(mwaAdapter.adapter.name);
    }
  }, [wallets]);

  return null;
}

// Detect if running on an Android device (for MWA auto-select)
function isAndroidDevice() {
  return typeof window !== 'undefined' && /Android/i.test(navigator.userAgent);
}

export default function SolanaWalletProvider({ children, autoConnect = false }) {
  const wallets = useMemo(() => buildWallets(), []);
  const isAndroid = isAndroidDevice();

  return (
    <ConnectionProvider endpoint={ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect={autoConnect} onError={(err) => {
        // Suppress known benign wallet errors
        if (
          err.message?.includes('User rejected') ||
          err.message?.includes('User cancelled') ||
          err.message?.includes('session dropped') ||
          err.message?.includes('1006') ||
          err.message?.includes('no installed wallet') ||
          err.message?.includes('No wallet found') ||
          err.message?.includes('WalletNotFoundError') ||
          err.name === 'WalletNotFoundError'
        ) {
          return;
        }
        console.error('[WalletProvider]', err);
      }}>
        <WalletModalProvider>
          {isAndroid && <MWAAutoSelector />}
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}