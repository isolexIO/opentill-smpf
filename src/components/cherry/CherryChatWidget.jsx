import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import CherryEmbed from '@/components/cherry/CherryEmbed';
import CherryLogo from '@/components/cherry/CherryLogo';
import { base44 } from '@/api/base44Client';

export default function CherryChatWidget() {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(null); // null = unknown, bool = configured state
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    base44.functions.invoke('getCherryConfig')
      .then((res) => { if (!cancelled) setEnabled(Boolean(res.data?.enabled)); })
      .catch(() => { if (!cancelled) setEnabled(false); });
    return () => { cancelled = true; };
  }, []);

  // Hide on the dedicated Community page (it has its own embed) and when unconfigured
  if (enabled === false || location.pathname === '/Community') return null;
  if (enabled === null) return null; // still loading config

  return (
    <>
      {open && (
        <div className="fixed bottom-40 left-6 z-[60] w-[min(92vw,380px)] h-[70vh] max-h-[560px] rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-slate-900 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-700 to-pink-600 text-white">
            <div className="flex items-center gap-2">
              <CherryLogo className="w-4 h-4" />
              <span className="font-semibold text-sm">openTILL Community</span>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="p-1 rounded hover:bg-white/20 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <CherryEmbed className="h-full w-full" />
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-24 left-6 z-[60] flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 text-white px-4 py-3 shadow-lg hover:scale-105 transition-transform"
        aria-label="Open community chat"
      >
        <CherryLogo className="w-5 h-5" />
        <span className="text-sm font-medium hidden sm:inline">Community</span>
      </button>
    </>
  );
}