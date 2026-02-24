import React, { useMemo, useEffect } from 'react';
import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  BackpackWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { SolanaMobileWalletAdapter, createDefaultAuthorizationResultCache, createDefaultAddressSelector } from '@solana-mobile/wallet-adapter-mobile';
import { clusterApiUrl } from '@solana/web3.js';
import '@solana/wallet-adapter-react-ui/styles.css';
import { CheckCircle2 } from 'lucide-react';

function WalletConnectContent({ onWalletConnected }) {
  const { publicKey, connected } = useWallet();

  useEffect(() => {
    if (connected && publicKey) {
      onWalletConnected(publicKey.toString());
    }
  }, [connected, publicKey, onWalletConnected]);

  return (
    <div className="flex items-center gap-2">
      {connected ? (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-medium">
            {publicKey?.toString().slice(0, 4)}...{publicKey?.toString().slice(-4)}
          </span>
        </div>
      ) : (
        <WalletMultiButton />
      )}
    </div>
  );
}

export default function WalletConnectButton({ onWalletConnected }) {
  const endpoint = useMemo(() => clusterApiUrl('mainnet-beta'), []);

  const wallets = useMemo(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const adapters = [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new BackpackWalletAdapter(),
    ];

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
        // silently skip
      }
    }

    return adapters;
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletConnectContent onWalletConnected={onWalletConnected} />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}