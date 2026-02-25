import React, { useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import SolanaWalletProvider from '@/components/auth/SolanaWalletProvider';
import { CheckCircle2 } from 'lucide-react';

function WalletConnectContent({ onWalletConnected }) {
  const { publicKey, connected } = useWallet();

  useEffect(() => {
    if (connected && publicKey && onWalletConnected) {
      onWalletConnected(publicKey.toString());
    }
  }, [connected, publicKey]);

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
  return (
    <SolanaWalletProvider autoConnect={false}>
      <WalletConnectContent onWalletConnected={onWalletConnected} />
    </SolanaWalletProvider>
  );
}