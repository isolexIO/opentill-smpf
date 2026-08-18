import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Rocket, ArrowRight, TrendingUp, Lock, Sparkles } from 'lucide-react';
import { DUC_LOGO_URL, DUC_PRESALE_URL } from '@/lib/smpfConstants';

const DUC_LOGO = DUC_LOGO_URL;

const ICO_URL = DUC_PRESALE_URL;

const HIGHLIGHTS = [
  { icon: TrendingUp, label: 'Early-Bird Pricing', desc: 'Lowest token price available during the presale window.' },
  { icon: Lock, label: 'Locked Vesting', desc: 'Roadmap-backed tokenomics with transparent unlock schedules.' },
  { icon: Sparkles, label: 'Utility Across openTILL', desc: 'Spend $DUC on chips, staking, and platform rewards.' },
];

export default function DUCPresaleSection() {
  return (
    <section className="py-20 px-4 relative overflow-hidden bg-gradient-to-br from-purple-700 via-indigo-700 to-blue-800">
      <div className="absolute inset-0 z-0 opacity-20">
        <div className="absolute top-10 left-10 w-72 h-72 bg-white/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-green-400/20 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      <div className="max-w-5xl mx-auto relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/15 backdrop-blur-sm border border-white/30 text-white rounded-full text-sm font-bold mb-6">
            <Rocket className="w-4 h-4" />
            $DUC PRESALE IS LIVE
          </div>

          <div className="flex justify-center mb-6">
            <img src={DUC_LOGO} alt="$DUC token" className="w-20 h-20 drop-shadow-2xl" />
          </div>

          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Get $DUC Before It Lists
          </h2>
          <p className="text-xl text-white/90 max-w-2xl mx-auto mb-10">
            The $DUC token powers the openTILL ecosystem — loyalty rewards, chip-based features,
            and on-platform staking. Join the presale now to lock in early-bird pricing.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 max-w-4xl mx-auto">
            {HIGHLIGHTS.map((h) => {
              const Icon = h.icon;
              return (
                <div
                  key={h.label}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20 text-left"
                >
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-white font-bold mb-1">{h.label}</h3>
                  <p className="text-sm text-white/80">{h.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="text-lg px-8 py-6 bg-white text-purple-700 hover:bg-gray-100 font-semibold shadow-2xl"
              onClick={() => window.open(ICO_URL, '_blank')}
            >
              <Rocket className="mr-2 w-5 h-5" />
              Join the $DUC Presale
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 bg-white/20 backdrop-blur-sm border-2 border-white text-white hover:bg-white hover:text-purple-700 font-semibold transition-all"
              onClick={() => window.open(ICO_URL, '_blank')}
            >
              Learn More
            </Button>
          </div>

          <p className="text-xs text-white/70 mt-6">
            Visit{' '}
            <a
              href={ICO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold hover:text-white"
            >
              ico.opentill.io
            </a>{' '}
            for full tokenomics, vesting schedules, and participation terms.
          </p>
        </motion.div>
      </div>
    </section>
  );
}