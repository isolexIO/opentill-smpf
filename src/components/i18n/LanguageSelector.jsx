import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/useLanguage';

/**
 * Compact language dropdown. Adapts to light (merchant app) or dark (public)
 * backgrounds via the `variant` prop: 'dark' (default) for the public site,
 * 'light' for the merchant app nav.
 */
export default function LanguageSelector({ variant = 'dark', className = '' }) {
  const { language, setLanguage, languages } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = languages.find((l) => l.code === language) || languages[0];

  const isDark = variant === 'dark';
  const triggerClasses = isDark
    ? 'text-white/90 hover:bg-white/10 border-white/20'
    : 'text-gray-700 hover:bg-gray-100 border-gray-200';
  const menuClasses = isDark
    ? 'bg-gray-900/95 border-white/10 text-white'
    : 'bg-white border-gray-200 text-gray-900';
  const itemHover = isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100';

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium transition-colors ${triggerClasses}`}
        aria-label="Select language"
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline">{current.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          className={`absolute end-0 mt-1 min-w-[160px] rounded-md border shadow-lg z-50 ${menuClasses}`}
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => {
                setLanguage(lang.code);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-sm transition-colors ${itemHover} ${
                lang.code === language ? 'font-semibold' : ''
              }`}
            >
              <span>{lang.label}</span>
              {lang.code === language && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}