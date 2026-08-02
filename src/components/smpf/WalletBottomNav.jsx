import React from 'react';
import { Home, Coins, Send, QrCode, Image, Activity, Settings } from 'lucide-react';

const ITEMS = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'tokens', label: 'Tokens', icon: Coins },
  { key: 'send', label: 'Send', icon: Send },
  { key: 'receive', label: 'Receive', icon: QrCode },
  { key: 'nfts', label: 'NFTs', icon: Image },
  { key: 'activity', label: 'Activity', icon: Activity },
  { key: 'settings', label: 'Settings', icon: Settings },
];

export default function WalletBottomNav({ active, onChange }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-slate-950/95 backdrop-blur border-t border-white/10 md:hidden">
      <div className="grid grid-cols-7 gap-0.5 px-1 py-1.5 safe-area-inset-bottom">
        {ITEMS.map(({ key, label, icon: Icon }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg transition-colors ${
                isActive ? 'text-emerald-400' : 'text-white/50'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-medium leading-none">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export const NAV_ITEMS = ITEMS;