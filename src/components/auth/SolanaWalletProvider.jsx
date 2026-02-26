import { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { SolanaMobileWalletAdapter, createDefaultAuthorizationResultCache, createDefaultAddressSelector } from '@solana-mobile/wallet-adapter-mobile';
import { clusterApiUrl } from '@solana/web3.js';
import '@solana/wallet-adapter-react-ui/styles.css';

const ENDPOINT = clusterApiUrl('mainnet-beta');

function buildWallets() {
  // Always include SolanaMobileWalletAdapter — required for Solana Mobile dApp Store (Saga/Seeker).
  // The adapter self-selects only when the MWA runtime is present, so it's safe on all platforms.
  const mobileAdapter = new SolanaMobileWalletAdapter({
    addressSelector: createDefaultAddressSelector(),
    appIdentity: {
      name: 'openTILL',
      uri: 'https://opentill-pos.com',
      icon: 'https://opentill-pos.com/favicon.ico',
    },
    authorizationResultCache: createDefaultAuthorizationResultCache(),
    cluster: 'mainnet-beta',
  });

  return [
    mobileAdapter,
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
  ];
}

/**
 * Single shared Solana wallet provider.
 * Wrap any component tree that needs wallet access with this.
 * autoConnect defaults to false to avoid unexpected prompts.
 */
// Detect if running inside Solana Mobile dApp Store (MWA runtime present)
function isMobileWalletAdapterAvailable() {
  return typeof window !== 'undefined' && 
    window.location.protocol !== 'https:' ? false :
    /Android/i.test(navigator.userAgent) || 
    typeof window.solanaMobileWalletAdapterInjected !== 'undefined';
}

function AutoSelectMobileWallet() {
  const { select, wallets, connected } = useMemo ? null : null;
  return null;
}

export default function SolanaWalletProvider({ children, autoConnect = false }) {
  const wallets = useMemo(() => buildWallets(), []);
  // On Solana Mobile (dApp Store), autoConnect must be true so MWA connects automatically
  const shouldAutoConnect = autoConnect || isMobileWalletAdapterAvailable();

  return (
    <ConnectionProvider endpoint={ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect={shouldAutoConnect} onError={(err) => {
        if (!err.message?.includes('User rejected') && !err.message?.includes('User cancelled')) {
          console.error('[WalletProvider]', err);
        }
      }}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}