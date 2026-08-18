import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Rocket, ArrowRight, TrendingUp, Lock, Sparkles } from 'lucide-react';
import { DUC_LOGO_URL, DUC_PRESALE_URL } from '@/lib/smpfConstants';

const HIGHLIGHTS = [
  { icon: TrendingUp, label: 'Early-Bird Pricing', desc: 'Lowest token price during the presale window.' },
  { icon: Lock, label: 'Locked Vesting', desc: 'Transparent, roadmap-backed unlock schedule.' },
  { icon: Sparkles, label: 'Utility Across openTILL', desc: 'Spend $DUC on chips, staking, and rewards.' },
];

export default function DucPresaleCard() {
  return (
    <Card className="bg-gradient-to-br from-indigo-600/30 via-purple-600/20 to-blue-700/30 border-indigo-500/40 text-white overflow-hidden relative">
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-400/20 rounded-full blur-3xl" />
      <CardContent className="p-5 relative z-10 space-y-4">
        <div className="flex items-center gap-3">
          <img src={DUC_LOGO_URL} alt="$DUC" className="w-12 h-12 rounded-full object-cover border border-indigo-300/40" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black">$DUC Presale</h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                <Rocket className="w-3 h-3" /> Live
              </span>
            </div>
            <p className="text-xs text-white/60">Digital Utility Credit · openTILL ecosystem</p>
          </div>
        </div>

        <p className="text-xs text-white/70">
          The $DUC token powers loyalty rewards, chip-based features, and on-platform staking.
          Join the presale now to lock in early-bird pricing before it lists.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {HIGHLIGHTS.map((h) => {
            const Icon = h.icon;
            return (
              <div key={h.label} className="bg-white/5 border border-white/10 rounded-lg p-2.5">
                <Icon className="w-4 h-4 text-indigo-300 mb-1" />
                <p className="text-[11px] font-bold text-white">{h.label}</p>
                <p className="text-[10px] text-white/50 leading-tight">{h.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex-1"
            onClick={() => window.open(DUC_PRESALE_URL, '_blank', 'noopener,noreferrer')}
          >
            <Rocket className="w-3.5 h-3.5 mr-1.5" /> Join the Presale
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
          <Button
            variant="outline"
            className="border-white/20 bg-white/5 text-white hover:bg-white/10 text-xs font-semibold flex-1"
            onClick={() => window.open('https://cmd.openTILL.io', '_blank', 'noopener,noreferrer')}
          >
            Learn More
          </Button>
        </div>
        <p className="text-[10px] text-white/40 text-center">
          Visit{' '}
          <a href={DUC_PRESALE_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-white/70">
            ico.opentill.io
          </a>{' '}
          for full tokenomics and vesting schedules.
        </p>
      </CardContent>
    </Card>
  );
}