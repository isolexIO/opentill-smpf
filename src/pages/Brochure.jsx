import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight, Check, QrCode as QrIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  ShoppingCart,
  DollarSign,
  CreditCard,
  Coins,
  ReceiptText,
  Monitor,
  Smartphone,
  SlidersHorizontal,
  Package,
  Heart,
  Vault,
  Wallet,
  Cpu,
  Building2,
  Code2,
  CreditCard as SubIcon,
  ShieldCheck,
  BarChart3,
  Globe,
  HardDrive,
  Sparkles,
} from 'lucide-react';

const DUC_LOGO =
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6970e2871534100b4ebb8d45/8e45f76fe_DUC3.png';

export const DEFAULT_SECTIONS = [
  {
    icon: 'ShoppingCart',
    title: 'POS & Checkout',
    description: 'A fast, touch-first register built for speed during any rush.',
    bullets: ['Product grid with departments', 'Cart, split payments & open items', 'Barcode scanning and quick keys'],
  },
  {
    icon: 'DollarSign',
    title: 'Dual Pricing & Surcharge',
    description: 'Compliant cash-vs-card pricing that recovers your fees.',
    bullets: ['Cash discount or surcharge modes', 'Auto-sync to your processing rate', 'Region-aware compliance (US/CA)'],
  },
  {
    icon: 'CreditCard',
    title: 'openTILL Payments',
    description: 'Stripe-powered card processing, terminals, and payouts.',
    bullets: ['In-person & online card payments', 'Stripe Connect onboarding', 'Terminals and reader management'],
  },
  {
    icon: 'Coins',
    title: 'Solana Pay & Crypto',
    description: 'Accept SOL, USDC, and $DUC straight from a QR code.',
    bullets: ['On-chain transaction detection', 'Custom token mint support', 'Zero chargebacks, instant settlement'],
  },
  {
    icon: 'ReceiptText',
    title: 'EBT / SNAP',
    description: 'Route eligible items and process EBT with confidence.',
    bullets: ['Item-level EBT eligibility', 'Split EBT + card transactions', 'Audit-ready receipts'],
  },
  {
    icon: 'Monitor',
    title: 'Customer & Kitchen Displays',
    description: 'Dual-screen experiences that keep service moving.',
    bullets: ['Tip selection and approvals', 'Kitchen display routing', 'Ad rotation on idle screens'],
  },
  {
    icon: 'Smartphone',
    title: 'Mobile Stations',
    description: 'Turn any phone into a POS or customer display.',
    bullets: ['Secure token-based mobile links', 'PIN-protected cashier controls', 'Works offline-friendly in browser'],
  },
  {
    icon: 'SlidersHorizontal',
    title: 'Menu & Modifiers',
    description: 'Flexible modifier groups for any menu or catalog.',
    bullets: ['Single/multi selection groups', 'Per-product or department scope', 'Price adjustments and defaults'],
  },
  {
    icon: 'Package',
    title: 'Inventory & Products',
    description: 'Track stock, departments, and product metadata.',
    bullets: ['Stock alerts and reorder hints', 'EBT and age-restricted tags', 'Departments and categories'],
  },
  {
    icon: 'Heart',
    title: 'Customers & Loyalty',
    description: 'Build repeat visits with points and $DUC rewards.',
    bullets: ['Customer portal with PIN login', 'Loyalty points & $DUC earning', 'Purchase history and profiles'],
  },
  {
    icon: 'Vault',
    title: '$DUC Vault',
    description: 'Earn, stake, and claim $DUC from processing volume.',
    bullets: ['Rewards on card volume', 'Staking with lockup terms', 'Referral bonus engine'],
  },
  {
    icon: 'Wallet',
    title: 'SMPF Wallet',
    description: 'A non-custodial Solana wallet with vanity addresses.',
    bullets: ['$DUC, SOL & token balances', 'Custom DUC / SMPF / TILL addresses', 'NFT transfers and backups'],
  },
  {
    icon: 'Cpu',
    title: 'Marketplace & Chips',
    description: 'Installable feature modules from the openTILL marketplace.',
    bullets: ['Browse and install chips', 'Builder-submitted modules', 'Per-merchant feature toggles'],
  },
  {
    icon: 'Building2',
    title: 'Ambassador Network',
    description: 'White-label reseller platform with branded subdomains.',
    bullets: ['Custom branding and domain', 'Commission and payout tracking', 'Merchant self-signup portals'],
  },
  {
    icon: 'Code2',
    title: 'Builder Platform',
    description: 'Developers submit chips and earn from installs.',
    bullets: ['Chip submissions & review', 'Stripe Connect & $DUC payouts', 'Analytics and install tracking'],
  },
  {
    icon: 'CreditCard',
    title: 'Subscriptions',
    description: 'Tiered support and platform plans with invoicing.',
    bullets: ['Subscription plans & billing', 'Public plan visibility controls', 'Invoice checkout & payments'],
  },
  {
    icon: 'ShieldCheck',
    title: 'Age Verification',
    description: 'ID checks for restricted items, logged for audit.',
    bullets: ['Scan or manual entry', 'Per-item minimum age', 'Verification audit trail'],
  },
  {
    icon: 'BarChart3',
    title: 'Reporting & Analytics',
    description: 'Sales, staff performance, and time tracking in one place.',
    bullets: ['Sales and preset reports', 'Employee performance & time clock', 'AI merchant insights'],
  },
  {
    icon: 'Globe',
    title: 'Online Ordering',
    description: 'A hosted menu site with pickup and delivery.',
    bullets: ['Online menu & cart', 'Pickup and delivery options', 'Delivery fee and radius controls'],
  },
  {
    icon: 'HardDrive',
    title: 'Device Shop',
    description: 'Buy card readers, printers, and hardware from the platform.',
    bullets: ['Curated device catalog', 'Order tracking', 'Hardware pairing guides'],
  },
];

export const ICONS = {
  ShoppingCart,
  DollarSign,
  CreditCard,
  Coins,
  ReceiptText,
  Monitor,
  Smartphone,
  SlidersHorizontal,
  Package,
  Heart,
  Vault,
  Wallet,
  Cpu,
  Building2,
  Code2,
  SubIcon,
  ShieldCheck,
  BarChart3,
  Globe,
  HardDrive,
  Sparkles,
};

export default function Brochure() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notEnabled, setNotEnabled] = useState(false);
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const records = await base44.entities.BrochureSettings.list().catch(() => []);
      const found = records && records[0];
      if (!found || !found.enabled) {
        setNotEnabled(true);
        setLoading(false);
        return;
      }
      setSettings(found);
      if (found.show_qr) {
        try {
          const url = `${window.location.origin}${createPageUrl('Brochure')}`;
          const dataUrl = await QRCode.toDataURL(url, { width: 240, margin: 1 });
          setQrUrl(dataUrl);
        } catch (e) {
          /* ignore */
        }
      }
      setLoading(false);
    } catch (e) {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-white/70" />
      </div>
    );
  }

  if (notEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-6 text-center">
        <div>
          <h1 className="text-3xl font-black text-white">openTILL SMPF</h1>
          <p className="text-white/60 mt-3 max-w-md mx-auto">
            Our interactive brochure is being prepared. Please check back soon.
          </p>
        </div>
      </div>
    );
  }

  const accent = settings?.accent_color || '#7B2FD6';
  const secondary = settings?.secondary_color || '#0FD17A';
  const sections = (settings?.sections && settings.sections.length > 0) ? settings.sections : DEFAULT_SECTIONS;
  const heroBg = settings?.hero_image_url || null;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Hero */}
      <header
        className="relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${accent} 0%, #0b1120 60%, ${secondary}120 100%)` }}
      >
        {heroBg && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30"
            style={{ backgroundImage: `url(${heroBg})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-slate-950" />
        <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-28 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <img src={DUC_LOGO} alt="$DUC" className="w-12 h-12 rounded-full bg-white/10 p-1" />
            <span className="text-sm font-bold tracking-widest uppercase text-white/80">openTILL SMPF</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black leading-tight">{settings?.title || 'openTILL SMPF'}</h1>
          <p className="text-lg sm:text-xl text-white/80 mt-4 max-w-2xl mx-auto font-medium">
            {settings?.tagline}
          </p>
          {settings?.description && (
            <p className="text-white/60 mt-4 max-w-2xl mx-auto">{settings.description}</p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <Button
              asChild
              className="bg-white text-slate-900 hover:bg-white/90 rounded-full px-6"
            >
              <a href={settings?.cta_url || '/'}>
                {settings?.cta_text || 'Get Started'} <ArrowRight className="w-4 h-4 ml-1" />
              </a>
            </Button>
            <Button variant="outline" className="rounded-full px-6 border-white/30 bg-transparent text-white hover:bg-white/10">
              <a href="#explore">Explore the platform</a>
            </Button>
          </div>
        </div>
        <div className="absolute -bottom-px left-0 right-0 h-16 bg-gradient-to-b from-transparent to-slate-950" />
      </header>

      {/* Stats strip */}
      <section className="max-w-5xl mx-auto px-6 -mt-12 relative z-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { v: '20+', l: 'Platform modules' },
            { v: 'Cash · Card · Crypto · EBT', l: 'Payment methods' },
            { v: 'Solana', l: 'Blockchain rail' },
            { v: 'White-label', l: 'Ambassador ready' },
          ].map((s) => (
            <div key={s.l} className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-4 text-center">
              <div className="text-base sm:text-lg font-bold">{s.v}</div>
              <div className="text-xs text-white/60 mt-0.5">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Sections grid */}
      <section id="explore" className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black">Everything openTILL SMPF does</h2>
          <p className="text-white/60 mt-2">One platform — from the register to the blockchain.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {sections.map((sec, i) => {
            const Icon = ICONS[sec.icon] || Sparkles;
            const key = sec.id || i;
            return (
              <Link
                key={key}
                to={`/Brochure/feature/${key}`}
                className="group block rounded-2xl border border-white/10 bg-white/5 p-5 hover:border-white/25 hover:bg-white/[0.07] transition-colors"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: `linear-gradient(135deg, ${accent}, ${secondary})` }}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-lg">{sec.title}</h3>
                <p className="text-sm text-white/60 mt-1">{sec.description}</p>
                {sec.bullets && sec.bullets.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {sec.bullets.map((b, bi) => (
                      <li key={bi} className="flex items-start gap-2 text-sm text-white/75">
                        <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: secondary }} />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      {/* QR / share + CTA */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div
          className="rounded-3xl border border-white/10 p-8 sm:p-12 text-center"
          style={{ background: `linear-gradient(135deg, ${accent}22, ${secondary}22)` }}
        >
          <h2 className="text-2xl sm:text-3xl font-black">Take openTILL SMPF with you</h2>
          <p className="text-white/70 mt-2 max-w-xl mx-auto">
            Scan the code or open the link on any device to revisit the full platform overview.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-8">
            {qrUrl && (
              <div className="bg-white p-3 rounded-2xl">
                <img src={qrUrl} alt="openTILL SMPF brochure QR" className="w-40 h-40" />
                <p className="text-[10px] text-slate-500 mt-1 flex items-center justify-center gap-1">
                  <QrIcon className="w-3 h-3" /> Scan to open
                </p>
              </div>
            )}
            <div className="space-y-3">
              <Button
                asChild
                className="rounded-full px-6 text-slate-900"
                style={{ background: secondary }}
              >
                <a href={settings?.cta_url || '/'}>{settings?.cta_text || 'Get Started'}</a>
              </Button>
              {(settings?.website || settings?.contact_email) && (
                <div className="text-sm text-white/70">
                  {settings?.website && (
                    <div>
                      <a href={settings.website} target="_blank" rel="noreferrer" className="underline">
                        {settings.website}
                      </a>
                    </div>
                  )}
                  {settings?.contact_email && (
                    <div>
                      <a href={`mailto:${settings.contact_email}`} className="underline">
                        {settings.contact_email}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-white/40 mt-8">
          © Isolex Corporation · openTILL SMPF · Powered by Solana
        </p>
      </section>
    </div>
  );
}