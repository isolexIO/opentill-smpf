import { useState, useRef, useEffect } from 'react';
import { Store, ChevronDown, Check, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Inline dropdown that lets a merchant switch the active Location. Shown in
 * the POS/dashboard nav. When the merchant has no Location records (single
 * location / shared mode) the switcher renders nothing.
 */
export default function LocationSwitcher({ locations, activeLocationId, onSwitch }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!locations || locations.length === 0) return null;

  const active = locations.find((l) => l.id === activeLocationId) || locations[0];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors max-w-[200px]"
      >
        <Store className="w-4 h-4 text-blue-600 shrink-0" />
        <span className="truncate">{active?.name || 'Select location'}</span>
        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 max-h-80 overflow-auto">
          {locations.map((loc) => (
            <button
              key={loc.id}
              type="button"
              onClick={() => { onSwitch(loc.id); setOpen(false); }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50',
                loc.id === activeLocationId ? 'text-blue-600 font-medium' : 'text-gray-700'
              )}
            >
              <MapPin className="w-4 h-4 shrink-0 text-gray-400" />
              <div className="min-w-0 flex-1">
                <div className="truncate">{loc.name}</div>
                <div className="text-xs text-gray-400">
                  {loc.catalog_mode === 'shared' ? 'Shared catalog' : 'Standalone catalog'}
                </div>
              </div>
              {loc.id === activeLocationId && <Check className="w-4 h-4 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}