import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, ArrowRight, Check, Sparkles, QrCode as QrIcon } from 'lucide-react';
import { DEFAULT_SECTIONS, ICONS } from './Brochure';

const IMG_BASE = 'https://media.base44.com/images/public/6970e2871534100b4ebb8d45/';

const SECTION_IMAGES = {
  sec_pos: '1c83b9940_generated_image.png',
  sec_dual: '6e0bdfcbc_generated_image.png',
  sec_payments: '37f3a176f_generated_image.png',
  sec_solana: '472be9d13_generated_image.png',
  sec_ebt: 'a27ad8be9_generated_image.png',
  sec_displays: 'b7563ff35_generated_image.png',
  sec_mobile: '20860b5b8_generated_image.png',
  sec_modifiers: '7d2187a04_generated_image.png',
  sec_inventory: '26f803b73_generated_image.png',
  sec_customers: 'c64cd03b8_generated_image.png',
  sec_vault: 'dffb407bd_generated_image.png',
  sec_wallet: '7b450a350_generated_image.png',
  sec_marketplace: 'b8f23d2a2_generated_image.png',
  sec_ambassador: 'faae94bfd_generated_image.png',
  sec_builder: '27c362be4_generated_image.png',
  sec_subscriptions: 'a2b12548f_generated_image.png',
  sec_age: '9f05ff46d_generated_image.png',
  sec_reports: 'dfd9c2785_generated_image.png',
  sec_online: '919ebe42a_generated_image.png',
  sec_deviceshop: '6de3aae9d_generated_image.png',
  sec_delivery: '8439318d0_generated_image.png',
  sec_marketplaces_int: 'ade757151_generated_image.png',
  sec_security: '31ef18b6b_generated_image.png',
  sec_ico: '8914e7a6f_generated_image.png',
  sec_whitelabel: '5c7ddfad7_generated_image.png',
};

// In-depth sales pitch for each feature.
const PITCH = {
  sec_pos: {
    lead:
      "Your register is the heartbeat of your business — so openTILL SMPF built it to move at the speed of your busiest hour. A high-density, touch-first product grid lets cashiers find and ring items in a single tap, with departments, categories, and quick keys tuned to how your team actually works.",
    body:
      "Every checkout flows through a smart cart that handles quantities, open-priced items, barcode scans, and split tenders without leaving the screen. Counter, server, bar, and kitchen stations each get a layout that fits their role, so the right people see the right tools. It's a POS that feels fast on the first shift and faster on the thousandth.",
  },
  sec_dual: {
    lead:
      "Processing fees shouldn't quietly erode your margins. openTILL SMPF's dual pricing puts you in control with a compliant cash-vs-card pricing model that surfaces the true cost of every transaction — and lets you recover it.",
    body:
      "Choose cash-discount or surcharge mode, set a flat fee or percentage, and let the surcharge auto-sync to your actual openTILL Payments rate plus the platform fee. Region-aware rules keep you compliant across US and Canadian jurisdictions, and dual prices appear clearly on receipts and the customer display so there are never surprises at the counter.",
  },
  sec_payments: {
    lead:
      "openTILL Payments — powered by Stripe — brings enterprise-grade card processing to businesses of every size, under your own brand. Accept cards in person, online, and from mobile stations with one unified pipeline.",
    body:
      "Built-in Stripe Connect onboarding walks merchants through identity verification and payouts, while terminal connections and reader management let you pair hardware in minutes. Daily payouts, automatic reconciliation, and a dashboard link to your Stripe account mean the money side of your business runs itself.",
  },
  sec_solana: {
    lead:
      "Why pay card networks to move money that doesn't need them? Solana Pay lets your customers settle in SOL, USDC, or $DUC by scanning a QR code — with on-chain confirmation and zero chargebacks.",
    body:
      "openTILL SMPF generates the QR, detects the on-chain transaction, and confirms payment automatically. Support custom token mints, display accepted crypto on the customer terminal, and enjoy settlement that's final in seconds. It's the crypto rail your POS was always meant to have.",
  },
  sec_ebt: {
    lead:
      "Serve every customer in your community — including those paying with EBT/SNAP benefits. openTILL SMPF routes eligible items correctly and processes EBT transactions with the audit trail compliance demands.",
    body:
      "Item-level eligibility tagging means the system knows exactly what can be paid with benefits. Split an order between EBT and card, capture approval codes on the receipt, and pull audit-ready reports whenever you need them. It's inclusive commerce without the compliance headache.",
  },
  sec_displays: {
    lead:
      "Keep the front of house polished and the back of house synchronized with dual-screen experiences designed for real service. The customer display guides tipping and approvals; the kitchen display routes tickets exactly where they need to go.",
    body:
      "Idle screens double as advertising real estate with rotating promotions, while approval and declined feedback play back to the customer with configurable timeouts. The result is a smoother flow, shorter lines, and an experience that feels premium from both sides of the counter.",
  },
  sec_mobile: {
    lead:
      "Turn any phone or tablet into a full POS or a customer-facing display with a secure, tokenized link. Mobile Stations extend your register to the floor, the patio, the pop-up, and the delivery route — no app install required.",
    body:
      "Each station gets its own secure URL backed by a random token, PIN-protected cashier controls, connection limits, and live session management. Your staff gets the full product grid, cart, and checkout on a device they already carry in their pocket.",
  },
  sec_modifiers: {
    lead:
      "From a flat white to a fully-loaded build-your-own bowl, openTILL SMPF's modifier system handles any menu you can dream up. Single and multi-select groups enforce your rules — minimums, maximums, defaults, and price adjustments — automatically.",
    body:
      "Apply modifier groups globally, to a single product, or across an entire department. Sort options for the perfect presentation and let defaults pre-select the popular choices. Whether you run a coffee bar or a complex kitchen, the menu bends to your workflow instead of the other way around.",
  },
  sec_inventory: {
    lead:
      "You can't sell what you can't count. openTILL SMPF tracks stock levels, departments, and product metadata so your team always knows what's on the shelf and what's running low.",
    body:
      "Low-stock alerts and reorder suggestions keep surprises out of the supply chain, while EBT and age-restricted tags carry through to the register automatically. Inventory forms and restock dialogs make adjustments fast, and everything ties back to the products your customers actually buy.",
  },
  sec_customers: {
    lead:
      "Acquiring a new customer costs far more than bringing an existing one back. openTILL SMPF's customer tools turn one-time visitors into regulars with loyalty points and $DUC rewards — all managed through a branded portal your customers actually use.",
    body:
      "The customer portal uses secure PIN login to surface purchase history, visit counts, loyalty balances, and $DUC earned on spend. Track preferred payment methods and notes to personalize every interaction. It's relationship-building that scales from the corner cafe to the multi-location brand.",
  },
  sec_vault: {
    lead:
      "Your card volume should work for you, not just your processor. The $DUC Vault converts a slice of your processing volume into $DUC rewards you can stake, earn yield on, and claim on-chain.",
    body:
      "Rewards are calculated automatically from your card volume, with a configurable claim threshold and staking terms including lockup and APY. A referral bonus engine rewards you for bringing new merchants into the network. It's a loyalty program where the merchant — not just the processor — gets paid.",
  },
  sec_wallet: {
    lead:
      "The openTILL SMPF Wallet is a fully non-custodial Solana wallet living right inside your dashboard. Your private keys never leave your device, yet you get a polished interface for $DUC, SOL, and any token on Solana.",
    body:
      "Generate a vanity address ending in — or starting with — DUC, SMPF, or TILL, or spin up a standard keypair instantly. Send and receive, transfer NFTs, keep an encrypted on-device backup and address book, and connect external wallet-standard wallets. It's self-custody with none of the friction.",
  },
  sec_marketplace: {
    lead:
      "No POS ships with every feature every business needs — so openTILL SMPF ships with a marketplace. Install Chips (feature modules) to extend your system on demand, and toggle capabilities per merchant.",
    body:
      "Browse curated modules, read chip detail pages, and subscribe to the capabilities that fit your operation. Builders submit new Chips through a review workflow, so the catalog grows with the ecosystem. It's a POS that gets more powerful the longer you use it.",
  },
  sec_ambassador: {
    lead:
      "openTILL SMPF isn't just a product — it's a platform for partners. The Ambassador Network lets resellers run a white-label POS business with branded subdomains, custom logos, and their own merchant portals.",
    body:
      "Ambassadors get custom branding, a custom .opentill-pos.sol subdomain, commission and payout tracking via Stripe or $DUC, and merchant self-signup portals complete with lead management and appointment scheduling. It's a turnkey reseller business on day one.",
  },
  sec_builder: {
    lead:
      "Developers don't just use openTILL SMPF — they can build on it. The Builder Platform lets creators submit Chips to the marketplace and earn from every install and sale.",
    body:
      "A submission and review workflow keeps quality high, while Stripe Connect and $DUC payouts handle compensation. Builders get install tracking, sales analytics, and a splash page to showcase their work. It's an ecosystem where great code turns into recurring revenue.",
  },
  sec_subscriptions: {
    lead:
      "Monetize your platform cleanly with tiered subscription plans, invoicing, and billing — all controlled from the Super Admin dashboard. A super-admin toggle even controls whether plans are publicly visible on the landing page.",
    body:
      "Recurring billing, invoice checkout, and payment confirmation run end-to-end, with trial and active subscription management built in. Whether you offer a free tier or enterprise contracts, the subscription engine handles the money so you can focus on the product.",
  },
  sec_age: {
    lead:
      "Selling age-restricted products carries real legal risk. openTILL SMPF's age verification captures the check, the method, and the evidence — and logs it to the order for a clean audit trail.",
    body:
      "Verify via ID scan, manual entry, or visual check, with per-item minimum ages enforced at checkout. The verified age and the last four of the ID are recorded on the order, along with who verified and when. Compliance that doesn't slow down the line.",
  },
  sec_reports: {
    lead:
      "You can't improve what you can't see. openTILL SMPF turns every transaction into insight with sales reports, employee performance, and time tracking — plus AI-generated merchant insights.",
    body:
      "Start with preset reports and the sales overview, then layer in premium analytics dashboards, employee performance rankings, and time-clock exports. AI insights surface opportunities you'd otherwise miss. It's the kind of visibility that turns a busy shop into a well-run business.",
  },
  sec_online: {
    lead:
      "Your customers order from their phones — so meet them there. openTILL SMPF's online ordering serves a hosted menu site with modifiers, cart, pickup, and delivery.",
    body:
      "Configure minimum order amounts, delivery fees, and radius, and let customers choose pickup or delivery with special instructions and requested times. Every online order flows into the same POS your in-store staff use, so there's one source of truth for the whole operation.",
  },
  sec_deviceshop: {
    lead:
      "Need hardware? The openTILL Device Shop curates the card readers, receipt printers, and POS hardware that work best with the platform — and lets you buy them directly.",
    body:
      "Browse a vetted device catalog, place orders with tracking, and follow hardware pairing guides that walk you through setup. Supported readers include Verifone, Clover, Pax, Ellipal, and Square, so you're never locked into a single hardware vendor.",
  },
  sec_delivery: {
    lead:
      "Own your last mile. openTILL SMPF's delivery tools let you create delivery jobs, assign drivers, and track routes in real time with Google Maps integration.",
    body:
      "Drivers get a dedicated dashboard with route maps, job statuses, and completion tracking. Dispatchers see the whole fleet at a glance. It's in-house delivery without the third-party margins eating your profit.",
  },
  sec_marketplaces_int: {
    lead:
      "Third-party marketplaces bring volume — and chaos. openTILL SMPF pulls DoorDash, Grubhub, Uber Eats, and Takeout7 orders into one unified POS so every channel flows through a single queue.",
    body:
      "Configure per-marketplace store IDs, toggle auto-accept, and monitor last-synced status per gateway. Orders arrive where your staff already works, with no extra tablets to babysit. More revenue, fewer screens.",
  },
  sec_security: {
    lead:
      "Your data — and your customers' — is sacred. openTILL SMPF is built on row-level security (RLS) that ensures each merchant, ambassador, and user only ever sees what's theirs.",
    body:
      "An audit log captures every sensitive action with severity tagging and PCI-relevant flags, while 2FA, password reset tooling, and admin-only controls lock down the rest. Defense in depth, designed in from the first line of code.",
  },
  sec_ico: {
    lead:
      "$DUC isn't just a reward — it's the fuel of the openTILL economy. Participate in the $DUC presale at ico.opentill.io and stake your claim in the network you help build.",
    body:
      "Earn $DUC through merchant rewards, grow it through vault staking yield, and spend it across the openTILL ecosystem. As a Solana-based utility token, $DUC settles fast and costs fractions of a cent to move. The economy works because you're part of it.",
  },
  sec_whitelabel: {
    lead:
      "openTILL SMPF is built to disappear into your brand. Deploy the entire platform under your own logo, colors, and domain — and your customers never need to know we're here.",
    body:
      "Ambassador-branded login screens and dashboards, custom .opentill-pos.sol subdomains, per-ambassador pricing and plans, and a toggle to hide openTILL branding entirely. It's a full POS platform that looks like you built it — because, in every way that matters, you did.",
  },
};

const FALLBACK_IMG =
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6970e2871534100b4ebb8d45/8e45f76fe_DUC3.png';

export default function BrochureFeature() {
  const { id } = useParams();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    window.scrollTo(0, 0);
  }, [id]);

  async function load() {
    try {
      const records = await base44.entities.BrochureSettings.list().catch(() => []);
      const found = records && records[0];
      setSettings(found || {});
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

  const allSections =
    settings?.sections && settings.sections.length > 0 ? settings.sections : DEFAULT_SECTIONS;
  const section = allSections.find((s) => s.id === id) || allSections[Number(id)] || null;

  if (!section) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05060f] px-6 text-center relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[120px] opacity-40" style={{ background: '#7B2FD6' }} />
        <div className="relative">
          <h1 className="text-4xl font-black text-white tracking-tight">Section not found</h1>
          <Button asChild variant="outline" className="mt-6 rounded-full border-white/20 bg-white/5 backdrop-blur text-white hover:bg-white/10">
            <Link to="/Brochure"><ArrowLeft className="w-4 h-4 mr-2" /> Back to brochure</Link>
          </Button>
        </div>
      </div>
    );
  }

  const accent = settings?.accent_color || '#7B2FD6';
  const secondary = settings?.secondary_color || '#0FD17A';
  const Icon = ICONS[section.icon] || Sparkles;
  const img = SECTION_IMAGES[section.id] ? `${IMG_BASE}${SECTION_IMAGES[section.id]}` : FALLBACK_IMG;
  const pitch = PITCH[section.id] || { lead: section.description, body: '' };
  const related = allSections.filter((s) => s.id !== section.id && s.id).slice(0, 4);

  return (
    <div className="min-h-screen bg-[#05060f] text-white relative overflow-hidden">
      <style>{`
        @keyframes auroraFloat { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(40px,-30px) scale(1.1)} }
        @keyframes auroraFloat2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-30px,40px) scale(1.15)} }
        .aurora-1 { animation: auroraFloat 18s ease-in-out infinite; }
        .aurora-2 { animation: auroraFloat2 22s ease-in-out infinite; }
        .grid-overlay { background-image: linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px); background-size: 60px 60px; }
        .glass-card { background: rgba(255,255,255,0.04); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.08); transition: all .35s cubic-bezier(.2,.8,.2,1); }
        .glass-card:hover { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.18); transform: translateY(-4px); box-shadow: 0 20px 40px -20px ${accent}66; }
        .text-glow { text-shadow: 0 0 40px ${accent}88; }
      `}</style>

      {/* Ambient aurora orbs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="aurora-1 absolute top-[-10%] left-[-5%] w-[40rem] h-[40rem] rounded-full blur-[140px] opacity-25" style={{ background: accent }} />
        <div className="aurora-2 absolute bottom-[-15%] right-[-10%] w-[45rem] h-[45rem] rounded-full blur-[160px] opacity-20" style={{ background: secondary }} />
      </div>
      <div className="fixed inset-0 grid-overlay pointer-events-none z-0" style={{ maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)', WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)' }} />

      <div className="relative z-10">
        {/* Hero */}
        <header className="relative overflow-hidden">
          <div className="absolute inset-0">
            <img src={img} alt={section.title} className="w-full h-full object-cover opacity-60" />
          </div>
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${accent}33 0%, #05060fcc 50%, #05060f 100%)` }} />
          <div className="relative max-w-4xl mx-auto px-6 pt-16 pb-28">
            <Link to="/Brochure" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white mb-10 glass-card px-4 py-2 rounded-full">
              <ArrowLeft className="w-4 h-4" /> Back to brochure
            </Link>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ background: `linear-gradient(135deg, ${accent}, ${secondary})`, boxShadow: `0 12px 40px -10px ${accent}aa` }}>
              <Icon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl sm:text-6xl font-black leading-[1.05] tracking-tight text-glow">{section.title}</h1>
            <p className="text-lg sm:text-xl text-white/70 mt-5 max-w-2xl leading-relaxed">{section.description}</p>
          </div>
        </header>

        {/* Pitch */}
        <section className="max-w-3xl mx-auto px-6 py-16">
          <div className="h-1 w-16 rounded-full mb-8" style={{ background: `linear-gradient(90deg, ${accent}, ${secondary})` }} />
          <p className="text-xl sm:text-2xl font-semibold leading-relaxed text-white/95">{pitch.lead}</p>
          {pitch.body && <p className="text-white/60 mt-6 leading-relaxed text-lg">{pitch.body}</p>}

          {/* Benefits */}
          {section.bullets && section.bullets.length > 0 && (
            <div className="mt-12 rounded-2xl glass-card p-7">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white/50 mb-5">What you get</h2>
              <ul className="grid sm:grid-cols-2 gap-4">
                {section.bullets.map((b, bi) => (
                  <li key={bi} className="flex items-start gap-3 text-white/85">
                    <Check className="w-5 h-5 mt-0.5 shrink-0" style={{ color: secondary }} />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CTA */}
          <div className="mt-10 relative rounded-3xl glass-card p-10 text-center overflow-hidden">
            <div className="absolute -top-16 -left-16 w-56 h-56 rounded-full blur-[90px] opacity-30" style={{ background: accent }} />
            <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full blur-[90px] opacity-30" style={{ background: secondary }} />
            <div className="relative">
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight">Ready to put {section.title} to work?</h3>
              <p className="text-white/60 mt-3">Join the openTILL SMPF platform and run your whole business in one place.</p>
              <Button asChild className="mt-6 rounded-full px-7 py-5 text-base font-bold text-white border-0" style={{ background: `linear-gradient(135deg, ${accent}, ${secondary})`, boxShadow: `0 10px 40px -10px ${secondary}aa` }}>
                <a href={settings?.cta_url || '/'}>
                  {settings?.cta_text || 'Get Started'} <ArrowRight className="w-4 h-4 ml-1" />
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* Related */}
        {related.length > 0 && (
          <section className="max-w-5xl mx-auto px-6 pb-24">
            <h2 className="text-xl font-black mb-6 tracking-tight">Explore more of openTILL SMPF</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {related.map((rel) => {
                const RIcon = ICONS[rel.icon] || Sparkles;
                const rImg = SECTION_IMAGES[rel.id] ? `${IMG_BASE}${SECTION_IMAGES[rel.id]}` : FALLBACK_IMG;
                return (
                  <Link
                    key={rel.id}
                    to={`/Brochure/feature/${rel.id}`}
                    className="glass-card group rounded-2xl overflow-hidden"
                  >
                    <div className="h-28 overflow-hidden">
                      <img src={rImg} alt={rel.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <RIcon className="w-4 h-4 text-white/70" />
                        <h3 className="font-bold text-sm tracking-tight">{rel.title}</h3>
                      </div>
                      <p className="text-xs text-white/50 line-clamp-2">{rel.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <footer className="text-center text-xs text-white/30 py-8 border-t border-white/10 tracking-widest uppercase">
          © Isolex Corporation · openTILL SMPF · Powered by Solana
        </footer>
      </div>
    </div>
  );
}