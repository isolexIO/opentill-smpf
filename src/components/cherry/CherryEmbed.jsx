import { useEffect, useRef, useState } from 'react';
import { CherryEmbed as CherryEmbedSDK } from '@cherrydotfun/chat-embed-sdk';
import { base44 } from '@/api/base44Client';

// Wallet-only Cherry chat embed. No backend token or app secret is exposed
// client-side — the appId is served from the `getCherryConfig` backend function,
// which reads the CHERRY_APP_ID secret. The iframe runs its own connect & sign
// flow and only loads on origins registered in the Cherry portal.
const EMBED_CONFIG = {
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
  const [config, setConfig] = useState(null);

  // Fetch the appId (secret-served) from the backend.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await base44.functions.invoke('getCherryConfig', {});
        const cfg = res?.data ?? res;
        if (!cancelled && cfg?.appId) {
          setConfig({
            ...EMBED_CONFIG,
            appId: cfg.appId,
            roomId: cfg.roomId || EMBED_CONFIG.roomId,
          });
        }
      } catch (err) {
        console.error('Cherry config fetch failed:', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Mount the embed once we have the appId.
  useEffect(() => {
    if (!config || !containerRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        const chat = new CherryEmbedSDK({
          ...config,
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
  }, [config]);

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