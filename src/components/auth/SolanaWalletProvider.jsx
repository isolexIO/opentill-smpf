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

  // Only include SolanaMobileWalletAdapter on actual Android/Saga devices with MWA runtime
  if (typeof window !== 'undefined' && /Android/i.test(navigator.userAgent)) {
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
          // Wallet app not found — do nothing, user can use Phantom/Solflare deep links
          console.log('Solana Mobile Wallet not found on device');
        },
      });
      adapters.unshift(mobileAdapter);
    } catch (e) {
      // If MWA adapter fails to initialize, continue without it
    }
  }

  return adapters;
}

/**
 * Single shared Solana wallet provider.
 * Wrap any component tree that needs wallet access with this.
 * autoConnect defaults to false to avoid unexpected prompts.
 */
// Auto-selects the MWA adapter when running inside the Solana Mobile dApp Store
function MWAAutoSelector() {
  const { select, wallets, wallet, connected } = useWallet();

  useEffect(() => {
    if (connected || wallet) return;
    // The MWA adapter name as registered
    const mwaAdapter = wallets.find(w =>
      w.adapter.name === 'Mobile Wallet Adapter' || w.adapter.name === 'Solana Mobile'
    );
    if (mwaAdapter) {
      select(mwaAdapter.adapter.name);
    }
  }, [wallets]);

  return null;
}

// Check if running inside Solana Mobile dApp Store environment
function isInsideMobileWalletAdapterApp() {
  return typeof window !== 'undefined' &&
    /Android/i.test(navigator.userAgent) &&
    window.isSecureContext;
}

export default function SolanaWalletProvider({ children, autoConnect = false }) {
  const wallets = useMemo(() => buildWallets(), []);
  const inMobileApp = isInsideMobileWalletAdapterApp();

  return (
    <ConnectionProvider endpoint={ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect={autoConnect || inMobileApp} onError={(err) => {
        if (!err.message?.includes('User rejected') && !err.message?.includes('User cancelled')) {
          console.error('[WalletProvider]', err);
        }
      }}>
        <WalletModalProvider>
          {inMobileApp && <MWAAutoSelector />}
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}