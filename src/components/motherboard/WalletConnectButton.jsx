import React, { useMemo } from 'react';
import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import '@solana/wallet-adapter-react-ui/styles.css';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Wallet, Link2, CheckCircle2 } from 'lucide-react';

function WalletConnectContent({ onWalletConnected }) {
  const { publicKey, connected } = useWallet();

  React.useEffect(() => {
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
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter()
    ],
    []
  );

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