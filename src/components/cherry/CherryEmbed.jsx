import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';

// Official Cherry Chat Embed SDK (browser global build via jsDelivr).
const SDK_URL = 'https://cdn.jsdelivr.net/npm/@cherrydotfun/chat-embed-sdk@0.1.7/dist/index.global.js';
const MOUNT_TIMEOUT_MS = 12000;

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
    let timeoutId = null;

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

        // If mount() never resolves (e.g. Cherry blocks the origin), surface a helpful error.
        timeoutId = setTimeout(() => {
          if (!cancelled) setStatus('error');
        }, MOUNT_TIMEOUT_MS);

        await inst.mount();
        if (cancelled) return;
        clearTimeout(timeoutId);
        timeoutId = null;
        setStatus('ready');
      } catch (err) {
        console.error('Cherry embed error', err);
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      try { instanceRef.current?.unmount?.(); } catch (e) { /* noop */ }
      instanceRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [roomId]);

  return (
    <div className={`relative ${className || ''}`} style={style}>
      {/* Persistent mount target — never swapped, so the SDK's iframe survives */}
      <div ref={containerRef} className="w-full h-full" />

      {status !== 'ready' && (
        <div className="absolute inset-0 flex items-center justify-center text-center p-6 rounded-xl bg-white/5 border border-white/10">
          <div className="max-w-sm">
            {status === 'loading' && (
              <>
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-200 font-medium">Loading Cherry chat…</p>
              </>
            )}
            {status === 'unconfigured' && (
              <>
                <p className="text-sm text-gray-200 font-medium">Cherry chat is not configured yet.</p>
                <p className="text-xs text-gray-400 mt-2">
                  Create a Chat embed at portal.cherry.fun, add your site origin to its Allowed origins,
                  then set its appId as the <code className="text-purple-300">CHERRY_APP_ID</code> secret.
                </p>
              </>
            )}
            {status === 'error' && (
              <>
                <p className="text-sm text-gray-200 font-medium">Cherry chat could not be loaded.</p>
                <p className="text-xs text-gray-400 mt-2">
                  At portal.cherry.fun → Project → Chat embeds, open your embed and make sure your site
                  origin (<code className="text-purple-300">{typeof window !== 'undefined' ? window.location.origin : ''}</code>)
                  is in its <b>Allowed origins</b>, and that <code className="text-purple-300">CHERRY_APP_ID</code> is
                  set to your own embed&apos;s appId — not the example one.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}