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
  return (
    <ConnectionProvider endpoint={ENDPOINT}>
      <WalletProvider wallets={WALLETS} autoConnect={autoConnect} onError={(err) => {
        // Suppress all known benign wallet errors
        const msg = err?.message || '';
        const name = err?.name || '';
        if (
          msg.includes('User rejected') ||
          msg.includes('User cancelled') ||
          msg.includes('session dropped') ||
          msg.includes('1006') ||
          msg.includes('mobile wallet protocol') ||
          msg.includes('no installed wallet') ||
          msg.includes('No wallet found') ||
          name === 'WalletNotFoundError' ||
          name === 'WalletSignMessageError' ||
          name === 'WalletConnectionError'
        ) {
          return;
        }
        console.error('[WalletProvider]', err);
      }}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}