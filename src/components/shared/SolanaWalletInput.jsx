import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Wallet } from 'lucide-react';

export default function SolanaWalletInput({ value, onChange, disabled, placeholder = 'Solana wallet address' }) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async () => {
    setError('');
    const provider = window.solana || window.phantom?.solana;
    if (!provider) {
      setError('Phantom wallet not detected. Install the Phantom extension or paste your address manually.');
      return;
    }
    try {
      setConnecting(true);
      const resp = await provider.connect();
      const address = resp?.publicKey?.toString();
      if (address) onChange(address);
    } catch (e) {
      setError(e?.message || 'Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || connecting}
          placeholder={placeholder}
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleConnect}
          disabled={disabled || connecting}
          className="shrink-0"
        >
          {connecting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Wallet className="w-4 h-4 mr-2" />
          )}
          Connect
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}