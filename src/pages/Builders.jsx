import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Code2, Users, TrendingUp, Shield, Zap, ArrowRight, Github, Menu, X } from 'lucide-react';

const ICON_MAP = { Code2, Users, TrendingUp, Shield, Zap, Github };

const DEFAULT_SETTINGS = {
  hero_headline: 'Build the Future of POS',
  hero_subheadline: 'Create powerful Chips and monetize your innovations on the openTILL marketplace.',
  hero_cta_text: 'Start Building',
  hero_docs_text: 'View Docs',
  hero_docs_url: 'https://docs.opentill.io/chips',
  revenue_share: '70%',
  features: [
    { icon: 'Code2', title: 'Easy Integration', description: 'Build with our SDK and connect your Chip to the marketplace in minutes.' },
    { icon: 'TrendingUp', title: 'Earn Money', description: 'Set your own pricing and earn up to 70% revenue share on every sale.' },
    { icon: 'Users', title: 'Global Audience', description: 'Access thousands of merchants using openTILL across the world.' },
    { icon: 'Shield', title: 'Secure & Verified', description: 'Verified developer badges and secure payment processing via Stripe.' },
    { icon: 'Zap', title: 'Real-time Analytics', description: 'Track sales, installations, and earnings with detailed dashboards.' },
  ],
  how_it_works: [
    { num: '1', title: 'Set Up', desc: 'Create your builder account and connect Stripe' },
    { num: '2', title: 'Build', desc: 'Develop your Chip using our SDK and tools' },
    { num: '3', title: 'Submit', desc: 'Submit for review and get published' },
    { num: '4', title: 'Earn', desc: 'Earn revenue as merchants install your Chip' },
  ],
  cta_headline: 'Ready to Start Building?',
  cta_subheadline: 'Join our community of developers and earn money from day one.',
  contact_email: 'builders@opentill.io',
  discord_url: 'https://discord.gg/opentill',
};

export default function BuildersPage() {
  const [s, setS] = useState(DEFAULT_SETTINGS);
  const [stats, setStats] = useState({ developers: 0, chips: 0, installs: 0 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsList, builders, chipSubmissions] = await Promise.all([
        base44.entities.BuilderSplashSettings.list(),
        base44.entities.Builder.list(),
        base44.entities.ChipSubmission.filter({ status: 'published' }),
      ]);

      if (settingsList.length > 0) setS(settingsList[0]);

      setStats({
        developers: builders.filter(b => b.status === 'verified').length,
        chips: chipSubmissions.length,
        installs: chipSubmissions.reduce((sum, c) => sum + (c.total_installs || 0), 0),
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-5xl sm:text-6xl font-black text-gray-900 tracking-tight">{s.hero_headline}</h1>
              <p className="text-xl text-gray-600">{s.hero_subheadline}</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => window.location.href = createPageUrl('BuilderOnboarding')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-12 text-base font-bold"
              >
                {s.hero_cta_text} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                className="px-8 h-12 text-base"
                onClick={() => window.open(s.hero_docs_url, '_blank')}
              >
                <Github className="w-4 h-4 mr-2" />
                {s.hero_docs_text}
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl blur-3xl opacity-20"></div>
            <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-8 text-white shadow-2xl">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm opacity-90">
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                  npx create-chip-app my-chip
                </div>
                <div className="bg-black/20 rounded p-4 font-mono text-sm space-y-2">
                  <div>$ Building your chip...</div>
                  <div className="text-blue-200">✓ Chip scaffold created</div>
                  <div className="text-blue-200">✓ SDK integrated</div>
                  <div className="text-blue-200">✓ Ready to publish</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="border-y border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-3 gap-8">
            {[
              { value: stats.developers.toString(), label: 'Verified Developers' },
              { value: stats.chips.toString(), label: 'Chips Published' },
              { value: stats.installs.toLocaleString(), label: 'Total Installs' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl sm:text-4xl font-black text-blue-600">{stat.value}</div>
                <div className="text-sm text-gray-600 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-black text-gray-900 mb-4">Why Build on openTILL?</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Get everything you need to build, ship, and monetize your Chip for thousands of merchants.
            Earn up to <span className="font-bold text-blue-600">{s.revenue_share}</span> revenue share.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {s.features.map((feature, idx) => {
            const Icon = ICON_MAP[feature.icon] || Zap;
            return (
              <Card key={idx} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-4xl font-black mb-12 text-center">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {s.how_it_works.map((step, idx) => (
              <div key={idx} className="text-center">
                <div className="text-4xl font-black opacity-20 mb-2">{step.num}</div>
                <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                <p className="text-white/80 text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card className="bg-gradient-to-br from-slate-50 to-gray-100 border-0">
          <CardContent className="p-12 text-center space-y-6">
            <div>
              <h2 className="text-3xl font-black text-gray-900 mb-2">{s.cta_headline}</h2>
              <p className="text-gray-600">{s.cta_subheadline}</p>
            </div>
            <div className="flex gap-4 justify-center pt-4 flex-wrap">
              <Button
                onClick={() => window.location.href = createPageUrl('BuilderOnboarding')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-12 text-base font-bold"
              >
                Create Builder Account
              </Button>
              <Button
                variant="outline"
                className="px-8 h-12 text-base"
                onClick={() => window.open(s.discord_url, '_blank')}
              >
                Join Discord Community
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center text-sm text-gray-600">
          Have questions? Email us at{' '}
          <a href={`mailto:${s.contact_email}`} className="text-blue-600 hover:underline">{s.contact_email}</a>
        </div>
      </div>
    </div>
  );
}