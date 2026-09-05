import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';

// Official Cherry Chat Embed SDK (browser global build via jsDelivr).
const SDK_URL = 'https://cdn.jsdelivr.net/npm/@cherrydotfun/chat-embed-sdk@0.1.7/dist/index.global.js';

function loadCherrySDK() {
  if (window.CherryEmbedSDK) return Promise.resolve();
  const existing = document.getElementById('cherry-embed-sdk');
  if (existing) {
    return new Promise((resolve, reject) => {
      const check = setInterval(() => {
        if (window.CherryEmbedSDK) { clearInterval(check); resolve(); }
      }, 100);
      existing.addEventListener('error', () => { clearInterval(check); reject(new Error('Cherry SDK failed')); });
    });
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.id = 'cherry-embed-sdk';
    s.src = SDK_URL;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Cherry SDK failed to load'));
    document.head.appendChild(s);
  });
}

export default function CherryEmbed({ roomId, className, style }) {
  const containerRef = useRef(null);
  const instanceRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | ready | unconfigured | error

  useEffect(() => {
    let cancelled = false;
    let config = null;

    (async () => {
      try {
        const res = await base44.functions.invoke('getCherryConfig');
        if (cancelled) return;
        config = res.data || {};
        if (!config.enabled) { setStatus('unconfigured'); return; }

        await loadCherrySDK();
        if (cancelled) return;
        const Ctor = window.CherryEmbedSDK?.CherryEmbed;
        if (!Ctor) { setStatus('error'); return; }

        const inst = new Ctor({
          appId: config.appId,
          container: containerRef.current,
          roomId: roomId || config.roomId || '',
        });
        instanceRef.current = inst;
        await inst.mount();
        if (!cancelled) setStatus('ready');
      } catch (err) {
        console.error('Cherry embed error', err);
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      try { instanceRef.current?.unmount?.(); } catch (e) { /* noop */ }
      instanceRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [roomId]);

  if (status === 'loading') {
    return (
      <div ref={containerRef} className={`flex items-center justify-center h-full text-gray-300 text-sm ${className || ''}`} style={style}>
        Loading Cherry chat…
      </div>
    );
  }

  if (status === 'unconfigured' || status === 'error') {
    return (
      <div className={`flex items-center justify-center text-center p-8 rounded-xl bg-white/5 border border-white/10 ${className || ''}`} style={style}>
        <div className="max-w-sm">
          <p className="text-sm text-gray-200 font-medium">
            {status === 'error' ? 'Cherry chat could not be loaded.' : 'Cherry chat is not configured yet.'}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            {status === 'error'
              ? 'Make sure your site origin is added to this Cherry embed\u2019s Allowed origins at portal.cherry.fun, then refresh.'
              : 'Paste your Cherry appId into the CHERRY_APP_ID secret in your app\u2019s Secrets settings to enable chat.'}
          </p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className={className} style={style} />;
}