import { useEffect, useRef, useState } from 'react';
import { CHERRY_APP_ID, CHERRY_ROOM_ID, CHERRY_ENABLED } from '@/lib/cherryConfig';

const SCRIPT_SRC = 'https://cdn.cherry.fun/embed/v1/cherry-embed.min.js';

export default function CherryEmbed({ roomId, className, style }) {
  const containerRef = useRef(null);
  const chatRef = useRef(null);
  const [status, setStatus] = useState(CHERRY_ENABLED ? 'loading' : 'unconfigured');

  useEffect(() => {
    if (!CHERRY_ENABLED) return;
    let cancelled = false;

    const init = () => {
      if (cancelled || !containerRef.current || !window.CherryEmbedSDK) return;
      try {
        chatRef.current = new window.CherryEmbedSDK.CherryEmbed({
          appId: CHERRY_APP_ID,
          container: containerRef.current,
          roomId: roomId || CHERRY_ROOM_ID || undefined,
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
  }, [roomId]);

  if (status === 'unconfigured') {
    return (
      <div className={`flex items-center justify-center text-center p-8 rounded-xl bg-white/5 border border-white/10 ${className || ''}`} style={style}>
        <div className="max-w-sm">
          <p className="text-sm text-gray-200 font-medium">Cherry chat is not configured yet.</p>
          <p className="text-xs text-gray-400 mt-2">
            Add a Cherry appId in <code className="text-purple-300">src/lib/cherryConfig.js</code> to enable wallet-to-wallet community, support, and collab.
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