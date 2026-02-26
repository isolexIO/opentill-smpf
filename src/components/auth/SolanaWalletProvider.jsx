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
export default function SolanaWalletProvider({ children, autoConnect = false }) {
  const wallets = useMemo(() => buildWallets(), []);

  return (
    <ConnectionProvider endpoint={ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect={autoConnect} onError={(err) => {
        // Suppress "User rejected" noise
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