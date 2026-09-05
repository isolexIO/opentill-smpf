import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function CherryEmbed({ roomId, className, style }) {
  const [config, setConfig] = useState(null); // { appId, roomId, enabled }
  const [status, setStatus] = useState('loading'); // loading | ready | unconfigured

  useEffect(() => {
    let cancelled = false;
    base44.functions.invoke('getCherryConfig')
      .then((res) => {
        if (cancelled) return;
        const cfg = res.data || {};
        setConfig(cfg);
        setStatus(cfg.enabled ? 'ready' : 'unconfigured');
      })
      .catch(() => {
        if (!cancelled) setStatus('unconfigured');
      });
    return () => { cancelled = true; };
  }, []);

  if (status === 'loading') {
    return (
      <div className={`flex items-center justify-center h-full text-gray-300 text-sm ${className || ''}`} style={style}>
        Loading Cherry chat…
      </div>
    );
  }

  if (status === 'unconfigured' || !config?.enabled) {
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

  const params = new URLSearchParams({ appId: config.appId });
  const room = roomId || config.roomId;
  if (room) params.set('roomId', room);
  const src = `https://embed.cherry.fun/?${params.toString()}`;

  return (
    <iframe
      src={src}
      title="openTILL Community Chat"
      className={className}
      style={{ border: 0, width: '100%', height: '100%', ...style }}
      allow="clipboard-read; clipboard-write; publickey-credentials-get *"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
    />
  );
}