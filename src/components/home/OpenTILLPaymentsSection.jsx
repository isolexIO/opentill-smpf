import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createPageUrl } from '@/utils';
import {
  CreditCard,
  Zap,
  Shield,
  CheckCircle,
  ArrowRight,
  Wifi,
  Smartphone,
  Monitor,
} from 'lucide-react';
import OpenTILLPaymentsLogo from '@/components/payment/OpenTILLPaymentsLogo';

// Official Stripe Terminal product images (publicly hosted on Stripe's CDN)
const TERMINALS = [
  {
    name: 'Stripe Reader S700',
    desc: 'Smart countertop reader with a 5.5" touchscreen that can run your POS app.',
    img: 'https://images.stripeassets.com/fzn2n1nzq965/3fFobFbTyXueMGNmKDECxp/4349382b59d14f8db7707e1162f85dcc/Property_1_S700.png',
    tags: ['Countertop', 'Handheld'],
    icon: Monitor,
  },
  {
    name: 'Stripe Reader M2',
    desc: 'Compact mobile reader for accepting payments on the go.',
    img: 'https://images.stripeassets.com/fzn2n1nzq965/mnfl223akEEJrvfGQriXT/14092881b660553efa84a3e40bf661f8/Property_1_M2.png',
    tags: ['Mobile'],
    icon: Smartphone,
  },
  {
    name: 'BBPOS WisePOS E',
    desc: 'Smart reader with a 5" touchscreen display for countertop and handheld use.',
    img: 'https://images.stripeassets.com/fzn2n1nzq965/3ywge4aKzsVRNFLu43sUKZ/ffc0c56ccfaa227a85a1691f1928f11e/Property_1_WisePOS-E.png',
    tags: ['Countertop', 'Handheld'],
    icon: Monitor,
  },
  {
    name: 'BBPOS WisePad 3',
    desc: 'Compact mobile reader with a built-in PIN pad.',
    img: 'https://images.stripeassets.com/fzn2n1nzq965/mA5anW5Cih5rHZpkHNObR/08a698270ca595ddd310959875793ae2/Property_1_WisePad-3.png',
    tags: ['Mobile'],
    icon: Smartphone,
  },
  {
    name: 'Verifone V660p',
    desc: 'Handheld reader with an embedded receipt printer.',
    img: 'https://images.stripeassets.com/fzn2n1nzq965/ETY3dDAgIpuS2GdowU2tC/a68b490ba441b888834088578d38ee01/Property_1_V660p.png',
    tags: ['Handheld'],
    icon: Wifi,
  },
];

const RATES = [
  {
    label: 'Card-Present Rate',
    value: '2.7% + $0.05',
    sub: 'per in-person transaction',
  },
  {
    label: 'Platform Fee',
    value: '0.80%',
    sub: 'included in surcharge',
  },
  {
    label: 'Effective Total',
    value: '3.5% + $0.05',
    sub: 'recovered via dual pricing',
  },
];

const BENEFITS = [
  'Dual-pricing compliant surcharging',
  'Next-day settlement & automatic payouts',
  'PCI-DSS Level 1 secure card-present processing',
  'Tap, dip, or swipe — contactless ready',
];

export default function OpenTILLPaymentsSection() {
  return (
    <section id="opentill-payments" className="py-24 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-full text-sm font-bold mb-4">
            <CreditCard className="w-4 h-4" />
            POWERED BY STRIPE
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="flex justify-center mb-6"
          >
            <OpenTILLPaymentsLogo width="w-[350px]" height="h-[130px]" cover />
          </motion.div>

          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
            Accept Card Payments In Person
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            openTILL Payments pairs compliant dual pricing with Stripe Terminal hardware —
            countertop, mobile, and handheld readers that just work.
          </p>
        </div>

        {/* Rates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
          {RATES.map((rate, i) => (
            <motion.div
              key={rate.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`rounded-2xl p-6 text-center shadow-lg border ${
                i === 2
                  ? 'bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-300 dark:border-indigo-700'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              }`}
            >
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                {rate.label}
              </p>
              <p className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-1">
                {rate.value}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{rate.sub}</p>
            </motion.div>
          ))}
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16 max-w-5xl mx-auto">
          {BENEFITS.map((b) => (
            <div
              key={b}
              className="flex items-start gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
            >
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700 dark:text-gray-300">{b}</span>
            </div>
          ))}
        </div>

        {/* Compatible Terminals */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full text-sm font-bold mb-3">
            <Shield className="w-4 h-4" />
            COMPATIBLE TERMINALS
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            Hardware That Works With openTILL
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mt-2 max-w-2xl mx-auto">
            Every reader below is supported by openTILL Payments over internet-connected
            Stripe Terminal — provision locations and register readers right from your dashboard.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-12">
          {TERMINALS.map((t, i) => {
            const Icon = t.icon;
            return (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl transition-shadow overflow-hidden flex flex-col"
              >
                <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-900 flex items-center justify-center p-4">
                  <img
                    src={t.img}
                    alt={t.name}
                    className="max-h-full max-w-full object-contain"
                    loading="lazy"
                  />
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Icon className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                      {t.name}
                    </h4>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 flex-1">
                    {t.desc}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {t.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-[10px] px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="text-center">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                const ref = params.get('ref') || params.get('referral') || params.get('code');
                const dealerId = params.get('dealer_id') || params.get('dealerid') || params.get('dealer');
                const qs = new URLSearchParams();
                if (ref) qs.set('ref', ref);
                if (dealerId) qs.set('dealer_id', dealerId);
                const query = qs.toString();
                window.location.href = query
                  ? `${createPageUrl('MerchantOnboarding')}?${query}`
                  : createPageUrl('MerchantOnboarding');
              }}
            >
              <Zap className="w-5 h-5 mr-2" />
              Get Started with openTILL Payments
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
              onClick={() => window.location.href = createPageUrl('DeviceShop')}
            >
              Shop Terminals
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Processing rates shown are the in-person card-present rate plus the openTILL
            platform fee. Surcharges sync automatically with dual pricing.
          </p>
        </div>
      </div>
    </section>
  );
}