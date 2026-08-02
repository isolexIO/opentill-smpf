import { useState, useEffect } from 'react';

// Lightweight Solana wallet-standard connect using the injected provider
// (Phantom / any window.solana provider). Never requests seed phrases.
export function useInjectedWallet() {
  const [provider, setProvider] = useState(null);
  const [name, setName] = useState('');
  const [pubkey, setPubkey] = useState(null);

  useEffect(() => {
    let p = (window.solana && window.solana.isPhantom && window.solana)
      || (window.phantom && window.phantom.solana)
      || window.solana;
    if (p) { setProvider(p); setName(p.name || (p.isPhantom ? 'Phantom' : 'Wallet')); }
  }, []);

  async function connect() {
    if (!provider) { window.open('https://phantom.app/', '_blank'); return null; }
    try {
      const res = await provider.connect();
      const pk = res.publicKey.toString();
      setPubkey(pk);
      return pk;
    } catch {
      return null;
    }
  }

  async function disconnect() {
    try { await provider?.disconnect(); } catch {}
    setPubkey(null);
  }

  useEffect(() => {
    if (!provider?.on) return;
    const handler = (newKey) => {
      if (!newKey) { setPubkey(null); }
      else { setPubkey(newKey.publicKey?.toString?.() || null); }
    };
    provider.on('accountChanged', handler);
    provider.on('disconnect', () => setPubkey(null));
    return () => { try { provider.off?.('accountChanged', handler); } catch {} };
  }, [provider]);

  return { provider, name, pubkey, connected: !!pubkey, connect, disconnect };
}