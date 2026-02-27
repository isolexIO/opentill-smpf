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

  // Always include SolanaMobileWalletAdapter; it handles its own compatibility checks internally
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
      onWalletNotFound: async (mobileWalletAdapter) => {
        console.log('Solana Mobile Wallet not found on device');
      },
    });
    adapters.unshift(mobileAdapter);
  } catch (e) {
    console.warn('SolanaMobileWalletAdapter failed to initialize:', e);
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

// Detect if running on a mobile device
function isLikelyMobileDevice() {
  return typeof window !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent);
}

export default function SolanaWalletProvider({ children, autoConnect = false }) {
  const wallets = useMemo(() => buildWallets(), []);
  const isMobile = isLikelyMobileDevice();

  return (
    <ConnectionProvider endpoint={ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect={autoConnect || isMobile} onError={(err) => {
        if (!err.message?.includes('User rejected') && !err.message?.includes('User cancelled')) {
          console.error('[WalletProvider]', err);
        }
      }}>
        <WalletModalProvider>
          {isMobile && <MWAAutoSelector />}
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}