import { useEffect, useRef, useState } from 'react';
import { CherryEmbed as CherryEmbedSDK } from '@cherrydotfun/chat-embed-sdk';

// Wallet-only Cherry chat embed. No backend, no token, no app secret — the
// iframe runs its own connect & sign flow. Config values are fixed by the
// embed owner in the Cherry portal (allowed origins: node1.opentill.io,
// opentill.io), so the chat only loads on those origins.
const CHERRY_CONFIG = {
  appId: '217de9df-d93f-4cdf-a990-3aae120518ab',
  embedUrl: 'https://embed.cherry.fun',
  roomId: 'b90a9a91-a9ff-47ec-80bf-44365b0d8b49',
  mode: 'single',
  position: 'inline',
  theme: { mode: 'dark', primaryColor: '#FF5BA8' },
};

export default function CherryEmbed({ className, style }) {
  const containerRef = useRef(null);
  const instanceRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const chat = new CherryEmbedSDK({
          ...CHERRY_CONFIG,
          container: containerRef.current,
        });
        instanceRef.current = chat;
        await chat.mount();
        if (!cancelled) setReady(true);
      } catch (err) {
        console.error('Cherry embed mount failed:', err);
      }
    })();

    return () => {
      cancelled = true;
      try { instanceRef.current?.unmount?.(); } catch (e) { /* noop */ }
      instanceRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, []);

  return (
    <div className={`relative ${className || ''}`} style={style}>
      <div ref={containerRef} className="w-full h-full" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}