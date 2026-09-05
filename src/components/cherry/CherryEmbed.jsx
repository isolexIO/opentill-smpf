import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';

const SDK_URL = 'https://cdn.cherry.fun/embed/v1/cherry-embed.min.js';

// Load the Cherry embed SDK script once for the whole app.
function loadCherrySDK() {
  if (window.CherryEmbedSDK) return Promise.resolve();
  if (document.getElementById('cherry-embed-sdk')) {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (window.CherryEmbedSDK) { clearInterval(check); resolve(); }
      }, 100);
    });
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.id = 'cherry-embed-sdk';
    s.src = SDK_URL;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Cherry SDK'));
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

    base44.functions.invoke('getCherryConfig')
      .then((res) => {
        if (cancelled) return;
        config = res.data || {};
        if (!config.enabled) { setStatus('unconfigured'); return; }
        return loadCherrySDK();
      })
      .then(() => {
        if (cancelled || !config || !config.enabled) return;
        if (!window.CherryEmbedSDK?.CherryEmbed) { setStatus('error'); return; }
        // Mount into the container
        const inst = new window.CherryEmbedSDK.CherryEmbed({
          appId: config.appId,
          container: containerRef.current,
          roomId: roomId || config.roomId || '',
        });
        instanceRef.current = inst;
        try { inst.mount(); } catch (e) { console.error('Cherry mount error', e); }
        setStatus('ready');
      })
      .catch((err) => {
        console.error('Cherry embed error', err);
        if (!cancelled) setStatus('error');
      });

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
              ? 'Please refresh the page or try again later.'
              : 'Paste your Cherry appId into the CHERRY_APP_ID secret in your app\u2019s Secrets settings to enable wallet-to-wallet community, support, and collab.'}
          </p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className={className} style={style} />;
}