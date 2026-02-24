import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Code2, Users, TrendingUp, Shield, Zap, ArrowRight, Github, ExternalLink } from 'lucide-react';

export default function BuildersPage() {
  const [stats, setStats] = useState({
    developers: 0,
    chips: 0,
    installs: 0,
    revenue: 0
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const builders = await base44.entities.Builder.list();
      const verifiedBuilders = builders.filter(b => b.status === 'verified').length;
      
      const chipSubmissions = await base44.entities.ChipSubmission.filter({ status: 'published' });
      
      const totalInstalls = chipSubmissions.reduce((sum, chip) => sum + (chip.total_installs || 0), 0);
      const totalRevenue = builders.reduce((sum, builder) => sum + (builder.total_earnings || 0), 0);

      setStats({
        developers: verifiedBuilders,
        chips: chipSubmissions.length,
        installs: totalInstalls,
        revenue: totalRevenue
      });
    } catch (error) {
      console.error('Error loading builder stats:', error);
    }
  };

  const features = [
    {
      icon: Code2,
      title: 'Easy Integration',
      description: 'Build with our SDK and connect your Chip to the marketplace in minutes.',
    },
    {
      icon: TrendingUp,
      title: 'Earn Money',
      description: 'Set your own pricing and earn up to 70% revenue share on every sale.',
    },
    {
      icon: Users,
      title: 'Global Audience',
      description: 'Access thousands of merchants using openTILL across the world.',
    },
    {
      icon: Shield,
      title: 'Secure & Verified',
      description: 'Verified developer badges and secure payment processing via Stripe.',
    },
    {
      icon: Zap,
      title: 'Real-time Analytics',
      description: 'Track sales, installations, and earnings with detailed dashboards.',
    },
  ];

  const buildersHighlight = [
    { label: 'Verified Developers', value: stats.developers.toString() },
    { label: 'Chips Published', value: stats.chips.toString() },
    { label: 'Total Installs', value: stats.installs.toLocaleString() },
    { label: 'Revenue Paid', value: `$${(stats.revenue / 1000).toFixed(0)}K` },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-5xl sm:text-6xl font-black text-gray-900 dark:text-white tracking-tight">
                Build the Future of POS
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                Create powerful Chips and monetize your innovations on the openTILL marketplace.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => window.location.href = createPageUrl('BuilderOnboarding')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-12 text-base font-bold"
              >
                Start Building <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                className="px-8 h-12 text-base"
                onClick={() => window.open('https://docs.opentill.io/chips', '_blank')}
              >
                <Github className="w-4 h-4 mr-2" />
                View Docs
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

      {/* Stats Section */}
      <div className="border-y border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {buildersHighlight.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl sm:text-4xl font-black text-blue-600 dark:text-blue-400">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-4">
            Why Build on openTILL?
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Get everything you need to build, ship, and monetize your Chip for thousands of merchants.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <Card key={idx} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* How It Works Section */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-4xl font-black mb-12 text-center">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { num: '1', title: 'Set Up', desc: 'Create your builder account and connect Stripe' },
              { num: '2', title: 'Build', desc: 'Develop your Chip using our SDK and tools' },
              { num: '3', title: 'Submit', desc: 'Submit for review and get published' },
              { num: '4', title: 'Earn', desc: 'Earn revenue as merchants install your Chip' },
            ].map((step, idx) => (
              <div key={idx} className="text-center">
                <div className="text-4xl font-black opacity-20 mb-2">{step.num}</div>
                <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                <p className="text-white/80 text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card className="bg-gradient-to-br from-slate-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-0">
          <CardContent className="p-12 text-center space-y-6">
            <div>
              <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">
                Ready to Start Building?
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Join our community of developers and earn money from day one.
              </p>
            </div>
            <div className="flex gap-4 justify-center pt-4">
              <Button
                onClick={() => window.location.href = createPageUrl('BuilderOnboarding')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-12 text-base font-bold"
              >
                Create Builder Account
              </Button>
              <Button
                variant="outline"
                className="px-8 h-12 text-base"
                onClick={() => window.open('https://discord.gg/opentill', '_blank')}
              >
                Join Discord Community
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer Note */}
      <div className="border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-sm text-gray-600 dark:text-gray-400">
          Have questions? Email us at <a href="mailto:builders@opentill.io" className="text-blue-600 dark:text-blue-400 hover:underline">builders@opentill.io</a>
        </div>
      </div>
    </div>
  );
}