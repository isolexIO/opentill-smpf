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
      <div className="min-h-screen flex items-center justify-center bg-[#05060f]">
        <div className="relative">
          <div className="absolute inset-0 rounded-full blur-xl animate-pulse" style={{ background: `radial-gradient(circle, ${settings?.accent_color || '#7B2FD6'}55, transparent)` }} />
          <Loader2 className="w-8 h-8 animate-spin text-white/80 relative" />
        </div>
      </div>
    );
  }

  if (notEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05060f] px-6 text-center relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[120px] opacity-40" style={{ background: '#7B2FD6' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-[120px] opacity-30" style={{ background: '#0FD17A' }} />
        <div className="relative">
          <img src={DUC_LOGO} alt="openTILL" className="w-16 h-16 rounded-full mx-auto mb-5 animate-pulse" />
          <h1 className="text-4xl font-black text-white tracking-tight">openTILL SMPF</h1>
          <p className="text-white/50 mt-3 max-w-md mx-auto">
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
    <div className="min-h-screen bg-[#05060f] text-white relative overflow-hidden">
      <style>{`
        @keyframes auroraFloat { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(40px,-30px) scale(1.1)} }
        @keyframes auroraFloat2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-30px,40px) scale(1.15)} }
        @keyframes gridPulse { 0%,100%{opacity:.15} 50%{opacity:.3} }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .aurora-1 { animation: auroraFloat 18s ease-in-out infinite; }
        .aurora-2 { animation: auroraFloat2 22s ease-in-out infinite; }
        .grid-overlay { background-image: linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px); background-size: 60px 60px; }
        .glass-card { background: rgba(255,255,255,0.04); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.08); }
        .glass-card:hover { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.18); transform: translateY(-4px); box-shadow: 0 20px 40px -20px ${accent}66; }
        .glass-card { transition: all .35s cubic-bezier(.2,.8,.2,1); }
        .text-glow { text-shadow: 0 0 40px ${accent}88; }
      `}</style>

      {/* Ambient aurora orbs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="aurora-1 absolute top-[-10%] left-[-5%] w-[40rem] h-[40rem] rounded-full blur-[140px] opacity-25" style={{ background: accent }} />
        <div className="aurora-2 absolute bottom-[-15%] right-[-10%] w-[45rem] h-[45rem] rounded-full blur-[160px] opacity-20" style={{ background: secondary }} />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 rounded-full blur-[120px] opacity-15 aurora-1" style={{ background: '#3b82f6' }} />
      </div>

      {/* Grid overlay */}
      <div className="fixed inset-0 grid-overlay pointer-events-none z-0" style={{ maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)', WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)' }} />

      <div className="relative z-10">
        {/* Hero */}
        <header className="relative overflow-hidden">
          {heroBg && (
            <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: `url(${heroBg})` }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-[#05060f]/40 via-[#05060f]/60 to-[#05060f]" />
          <div className="relative max-w-5xl mx-auto px-6 pt-24 pb-32 text-center">
            <div className="inline-flex items-center gap-3 mb-8 px-4 py-2 rounded-full glass-card">
              <img src={DUC_LOGO} alt="$DUC" className="w-7 h-7 rounded-full" />
              <span className="text-xs font-bold tracking-[0.25em] uppercase text-white/80">openTILL SMPF</span>
            </div>
            <h1 className="text-5xl sm:text-7xl font-black leading-[1.05] tracking-tight text-glow">
              {settings?.title || 'openTILL SMPF'}
            </h1>
            <p className="text-lg sm:text-2xl text-white/75 mt-6 max-w-2xl mx-auto font-medium tracking-wide">
              {settings?.tagline}
            </p>
            {settings?.description && (
              <p className="text-white/50 mt-4 max-w-2xl mx-auto leading-relaxed">{settings.description}</p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-10">
              <Button asChild className="rounded-full px-7 py-6 text-base font-bold text-white border-0" style={{ background: `linear-gradient(135deg, ${accent}, ${secondary})`, boxShadow: `0 10px 40px -10px ${accent}aa` }}>
                <a href={settings?.cta_url || '/'}>
                  {settings?.cta_text || 'Get Started'} <ArrowRight className="w-4 h-4 ml-1" />
                </a>
              </Button>
              <Button variant="outline" className="rounded-full px-7 py-6 text-base border-white/20 bg-white/5 backdrop-blur text-white hover:bg-white/10 hover:border-white/40">
                <a href="#explore">Explore the platform</a>
              </Button>
            </div>
          </div>
        </header>

        {/* Stats strip */}
        <section className="max-w-5xl mx-auto px-6 -mt-16 relative z-20">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { v: '20+', l: 'Platform modules' },
              { v: 'Cash · Card · Crypto · EBT', l: 'Payment methods' },
              { v: 'Solana', l: 'Blockchain rail' },
              { v: 'White-label', l: 'Ambassador ready' },
            ].map((s) => (
              <div key={s.l} className="glass-card rounded-2xl p-5 text-center">
                <div className="text-base sm:text-lg font-bold tracking-tight" style={{ color: 'white' }}>{s.v}</div>
                <div className="text-xs text-white/50 mt-1 tracking-wide">{s.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Sections grid */}
        <section id="explore" className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-14">
            <div className="inline-block h-1 w-12 rounded-full mb-5" style={{ background: `linear-gradient(90deg, ${accent}, ${secondary})` }} />
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Everything openTILL SMPF does</h2>
            <p className="text-white/50 mt-3 tracking-wide">One platform — from the register to the blockchain.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {sections.map((sec, i) => {
              const Icon = ICONS[sec.icon] || Sparkles;
              const key = sec.id || i;
              return (
                <Link
                  key={key}
                  to={`/Brochure/feature/${key}`}
                  className="glass-card group block rounded-2xl p-6"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                    style={{ background: `linear-gradient(135deg, ${accent}, ${secondary})`, boxShadow: `0 8px 24px -8px ${accent}88` }}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-lg tracking-tight">{sec.title}</h3>
                  <p className="text-sm text-white/55 mt-1.5 leading-relaxed">{sec.description}</p>
                  {sec.bullets && sec.bullets.length > 0 && (
                    <ul className="mt-4 space-y-2">
                      {sec.bullets.map((b, bi) => (
                        <li key={bi} className="flex items-start gap-2 text-sm text-white/70">
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
        <section className="max-w-4xl mx-auto px-6 pb-24">
          <div className="relative rounded-3xl glass-card p-10 sm:p-14 text-center overflow-hidden">
            <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full blur-[100px] opacity-30" style={{ background: accent }} />
            <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full blur-[100px] opacity-30" style={{ background: secondary }} />
            <div className="relative">
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight">Take openTILL SMPF with you</h2>
              <p className="text-white/60 mt-3 max-w-xl mx-auto">
                Scan the code or open the link on any device to revisit the full platform overview.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-8 mt-10">
                {qrUrl && (
                  <div className="bg-white p-3 rounded-2xl shadow-2xl">
                    <img src={qrUrl} alt="openTILL SMPF brochure QR" className="w-40 h-40" />
                    <p className="text-[10px] text-slate-500 mt-1 flex items-center justify-center gap-1">
                      <QrIcon className="w-3 h-3" /> Scan to open
                    </p>
                  </div>
                )}
                <div className="space-y-3 text-left">
                  <Button asChild className="rounded-full px-7 py-5 text-base font-bold text-white border-0" style={{ background: `linear-gradient(135deg, ${accent}, ${secondary})`, boxShadow: `0 10px 40px -10px ${secondary}aa` }}>
                    <a href={settings?.cta_url || '/'}>{settings?.cta_text || 'Get Started'}</a>
                  </Button>
                  {(settings?.website || settings?.contact_email) && (
                    <div className="text-sm text-white/60">
                      {settings?.website && (
                        <div>
                          <a href={settings.website} target="_blank" rel="noreferrer" className="underline hover:text-white">
                            {settings.website}
                          </a>
                        </div>
                      )}
                      {settings?.contact_email && (
                        <div>
                          <a href={`mailto:${settings.contact_email}`} className="underline hover:text-white">
                            {settings.contact_email}
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-white/30 mt-10 tracking-widest uppercase">
            © Isolex Corporation · openTILL SMPF · Powered by Solana
          </p>
        </section>
      </div>
    </div>
  );
}