import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';

const SCRIPT_SRC = 'https://cdn.cherry.fun/embed/v1/cherry-embed.min.js';

export default function CherryEmbed({ roomId, className, style }) {
  const containerRef = useRef(null);
  const chatRef = useRef(null);
  const [config, setConfig] = useState(null); // { appId, roomId, enabled }
  const [status, setStatus] = useState('loading'); // loading | ready | error | unconfigured

  useEffect(() => {
    let cancelled = false;
    base44.functions.invoke('getCherryConfig')
      .then((res) => {
        if (cancelled) return;
        const cfg = res.data || {};
        setConfig(cfg);
        if (!cfg.enabled) setStatus('unconfigured');
      })
      .catch((e) => {
        console.error('Cherry config fetch failed:', e);
        if (!cancelled) setStatus('unconfigured');
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!config || !config.enabled) return;
    let cancelled = false;

    const init = () => {
      if (cancelled || !containerRef.current || !window.CherryEmbedSDK) return;
      try {
        chatRef.current = new window.CherryEmbedSDK.CherryEmbed({
          appId: config.appId,
          container: containerRef.current,
          roomId: roomId || config.roomId || undefined,
        });
        chatRef.current.mount();
        if (!cancelled) setStatus('ready');
      } catch (e) {
        console.error('Cherry embed failed:', e);
        if (!cancelled) setStatus('error');
      }
    };

    if (window.CherryEmbedSDK) {
      init();
    } else {
      const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
      if (existing) {
        if (window.CherryEmbedSDK) init();
        else existing.addEventListener('load', init);
      } else {
        const s = document.createElement('script');
        s.src = SCRIPT_SRC;
        s.async = true;
        s.onload = init;
        s.onerror = () => { if (!cancelled) setStatus('error'); };
        document.head.appendChild(s);
      }
    }

    return () => {
      cancelled = true;
      if (chatRef.current && typeof chatRef.current.unmount === 'function') {
        try { chatRef.current.unmount(); } catch (e) { /* noop */ }
      }
      chatRef.current = null;
    };
  }, [config, roomId]);

  if (status === 'unconfigured') {
    return (
      <div className={`flex items-center justify-center text-center p-8 rounded-xl bg-white/5 border border-white/10 ${className || ''}`} style={style}>
        <div className="max-w-sm">
          <p className="text-sm text-gray-200 font-medium">Cherry chat is not configured yet.</p>
          <p className="text-xs text-gray-400 mt-2">
            Paste your Cherry appId into the <code className="text-purple-300">CHERRY_APP_ID</code> secret in your app's Secrets settings to enable wallet-to-wallet community, support, and collab.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={className} style={style}>
      {status === 'loading' && (
        <div className="flex items-center justify-center h-full text-gray-300 text-sm">
          Loading Cherry chat…
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center justify-center h-full text-gray-300 text-sm text-center px-6">
          Couldn't load Cherry chat. Check your connection and try again.
        </div>
      )}
    </div>
  );
}