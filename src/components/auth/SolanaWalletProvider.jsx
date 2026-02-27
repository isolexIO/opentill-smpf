import { useMemo, useEffect } from 'react';
import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import '@solana/wallet-adapter-react-ui/styles.css';

const ENDPOINT = clusterApiUrl('mainnet-beta');

const WALLETS = [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter(),
];

export default function SolanaWalletProvider({ children, autoConnect = false }) {
  const wallets = useMemo(() => buildWallets(), []);
  const isAndroid = isAndroidDevice();

  return (
    <ConnectionProvider endpoint={ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect={autoConnect} onError={(err) => {
        // Suppress session drop errors (1006) - these happen when wallet app closes
        if (
          err.message?.includes('User rejected') ||
          err.message?.includes('User cancelled') ||
          err.message?.includes('session dropped') ||
          err.message?.includes('1006')
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