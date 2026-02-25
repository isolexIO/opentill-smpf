import { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
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

  const isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
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
    } catch {
      // not available on this device
    }
  }

  return adapters;
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