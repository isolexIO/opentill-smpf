import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import {
  CreditCard,
  Lock,
  CheckCircle,
  ArrowRight,
  Star,
  DollarSign,
  Wallet,
  BarChart3,
  Loader2,
  MessageCircle,
  Package,
  Cpu,
  Shield,
  Store,
  Users,
  Activity
} from 'lucide-react';
import { motion } from 'framer-motion';
import PriceTicker from '@/components/vault/PriceTicker';
import CommunityLinks from '@/components/shared/CommunityLinks';

function FeaturedChipsSection() {
  const [chips, setChips] = useState([]);

  useEffect(() => {
    loadFeaturedChips();
  }, []);

  const loadFeaturedChips = async () => {
    try {
      const allChips = await base44.entities.Chip.filter({ 
        featured: true,
        status: 'PUBLISHED',
        is_active: true 
      });
      
      const now = new Date();
      const validChips = allChips.filter(chip => {
        const inSchedule = (!chip.start_time || new Date(chip.start_time) <= now) &&
                          (!chip.end_time || new Date(chip.end_time) >= now);
        return inSchedule;
      }).slice(0, 6);
      
      setChips(validChips);
    } catch (error) {
      console.error('Error loading featured chips:', error);
    }
  };

  if (chips.length === 0) return null;

  return (
    <section className="py-20 bg-gradient-to-br from-cyan-50 to-blue-100 dark:from-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-full text-sm font-bold mb-4">
            <Cpu className="w-4 h-4" />
            FEATURED CHIPS
          </div>
          <h2 className="text-4xl font-black mb-4 text-gray-900 dark:text-white">Unlock Premium Features</h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Purchase Chips with $DUC to enhance your POS capabilities
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {chips.map(chip => (
            <Card key={chip.id} className="hover:shadow-xl transition-all border-2 hover:border-cyan-400 bg-white dark:bg-gray-800">
              <CardHeader>
                <img 
                  src={chip.image_url || '/api/placeholder/80/80'}
                  alt={chip.name}
                  className="w-[90%] mx-auto aspect-square rounded-lg object-cover mb-4"
                />
                <CardTitle className="text-gray-900 dark:text-white">{chip.name}</CardTitle>
                <CardDescription>{chip.short_description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-500">Price</span>
                  <span className="font-bold text-cyan-600">
                    {chip.billing_type === 'ONE_TIME' 
                      ? `${chip.price_duc} $DUC` 
                      : `${chip.recurring_price_duc} $DUC/mo`}
                  </span>
                </div>
                <Button 
                  className="w-full bg-cyan-600 hover:bg-cyan-700"
                  onClick={() => window.location.href = createPageUrl(`ChipDetail?id=${chip.id}`)}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button
            size="lg"
            className="bg-cyan-600 hover:bg-cyan-700"
            onClick={() => window.location.href = createPageUrl('Marketplace')}
          >
            View Marketplace
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeMerchants: 0,
    activeAmbassadors: 0,
    loading: true
  });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    loadSubscriptionPlans();
    loadSettings();
    loadStats();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const settingsList = await base44.entities.LandingPageSettings.list();

      if (settingsList && settingsList.length > 0) {
        setSettings(settingsList[0]);
      }
    } catch (error) {
      console.error('Error loading landing page settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await base44.functions.invoke('getPublicStats');
      
      if (response.data.success && response.data.stats) {
        setStats({
          activeMerchants: response.data.stats.activeMerchants,
          activeAmbassadors: response.data.stats.activeDealers,
          loading: false
        });
      } else {
        setStats({
          activeMerchants: 0,
          activeAmbassadors: 0,
          loading: false
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats({
        activeMerchants: 0,
        activeAmbassadors: 0,
        loading: false
      });
    }
  };

  const formatCurrency = (amount) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount.toFixed(0)}`;
  };

  const loadSubscriptionPlans = async () => {
    try {
      setIsLoadingPlans(true);
      const plans = await base44.entities.SubscriptionPlan.filter(
        { is_active: true },
        'sort_order'
      );

      setSubscriptionPlans(plans);
    } catch (error) {
      console.error('Error loading subscription plans:', error);
      setSubscriptionPlans([
        {
          plan_id: 'starter',
          name: 'Starter',
          price_monthly: 49,
          features: [
            { text: '1 POS Terminal', included: true },
            { text: '500 Orders/month', included: true },
            { text: 'Basic Reporting', included: true },
            { text: 'Email Support', included: true },
            { text: 'Dual Pricing', included: true }
          ],
          is_featured: false
        },
        {
          plan_id: 'professional',
          name: 'Professional',
          price_monthly: 149,
          features: [
            { text: '5 POS Terminals', included: true },
            { text: 'Unlimited Orders', included: true },
            { text: 'Advanced Analytics', included: true },
            { text: 'Priority Support', included: true },
            { text: 'Solana Pay', included: true },
            { text: 'Custom Branding', included: true },
            { text: 'API Access', included: true }
          ],
          is_featured: true
        },
        {
          plan_id: 'enterprise',
          name: 'Enterprise',
          price_monthly: 0,
          features: [
            { text: 'Unlimited Terminals', included: true },
            { text: 'Unlimited Orders', included: true },
            { text: 'Custom Branding', included: true },
            { text: '24/7 Phone Support', included: true },
            { text: 'All Payment Methods', included: true },
            { text: 'Custom Integrations', included: true },
            { text: 'Dedicated Account Manager', included: true }
          ],
          is_featured: false
        }
      ]);
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const heroSettings = settings?.hero || {};
  const statsData = settings?.stats || [];

  const displayStats = [
    {
      icon: Store,
      value: stats.loading ? '...' : stats.activeMerchants.toLocaleString(),
      label: 'Active Merchants'
    },
    {
      icon: Users,
      value: stats.loading ? '...' : (stats.activeAmbassadors || 0).toLocaleString(),
      label: 'Active Ambassadors'
    },
    {
      icon: Activity,
      value: statsData[1]?.value || '99.9%',
      label: statsData[1]?.label || 'Uptime'
    }
  ];

  const getBadgeText = () => {
    if (settings?.hero?.badge_text) {
      return settings.hero.badge_text;
    }
    return settings?.hero?.badge_status === 'coming_soon' ? 'Coming Soon' : 'Now Available';
  };

  const getBadgeColor = () => {
    return settings?.hero?.badge_status === 'coming_soon'
      ? 'bg-orange-500/10 text-orange-600 border-orange-500/20'
      : 'bg-green-500/10 text-green-600 border-green-500/20';
  };

  if (loading && settings === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-800 to-cyan-900">
        <Loader2 className="w-16 h-16 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-800 to-cyan-900">
      {/* Navbar */}
      <nav className="bg-black/30 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.href = createPageUrl('Home')}>
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6970e2871534100b4ebb8d45/8e45f76fe_DUC3.png" alt="openTILL" className="w-8 h-8" />
              <span className="text-2xl font-bold text-white">openTILL</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href={createPageUrl('Home')} className="text-green-300 font-semibold">
                Home
              </a>
              <a href={createPageUrl('Marketplace')} className="text-white hover:text-green-300 transition-colors">
                Marketplace
              </a>
              <a href="#features" className="text-white hover:text-green-300 transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-white hover:text-green-300 transition-colors">
                Pricing
              </a>
              <a href={createPageUrl('About')} className="text-white hover:text-green-300 transition-colors">
                About
              </a>
              <a href={createPageUrl('Contact')} className="text-white hover:text-green-300 transition-colors">
                Contact
              </a>
              <a href={createPageUrl('DeviceShop')} className="text-white hover:text-green-300 transition-colors">
                Device Shop
              </a>
              <Button
                onClick={() => window.location.href = createPageUrl('EmailLogin')}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                Sign In
              </Button>
            </div>
            <div className="md:hidden flex items-center gap-2">
              <Button onClick={() => window.location.href = createPageUrl('EmailLogin')} size="sm" className="bg-green-500 hover:bg-green-600 text-white text-xs px-3">
                Sign In
              </Button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-white p-2 rounded-md hover:bg-white/10 transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-black/80 backdrop-blur-md border-b border-white/10 px-6 py-4 space-y-3">
          <a href={createPageUrl('Home')} className="block text-green-300 font-semibold py-2">Home</a>
          <a href={createPageUrl('Marketplace')} className="block text-white hover:text-green-300 py-2">Marketplace</a>
          <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block text-white hover:text-green-300 py-2">Features</a>
          <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block text-white hover:text-green-300 py-2">Pricing</a>
          <a href={createPageUrl('About')} className="block text-white hover:text-green-300 py-2">About</a>
          <a href={createPageUrl('Contact')} className="block text-white hover:text-green-300 py-2">Contact</a>
          <a href={createPageUrl('DeviceShop')} className="block text-white hover:text-green-300 py-2">Device Shop</a>
          <Button onClick={() => window.location.href = createPageUrl('MerchantOnboarding')} className="w-full bg-white text-purple-700 hover:bg-gray-100 font-semibold mt-2">
            Get Started Free
          </Button>
        </div>
      )}

      {/* Hero Section */}
      <section
        className="relative py-20 px-4 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${settings?.hero?.background_gradient_start || '#42A5F5'} 0%, ${settings?.hero?.background_gradient_end || '#C6EF50'} 100%)`
        }}
      >
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute inset-0 z-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse delay-700"></div>
        </div>

        <div className="max-w-6xl mx-auto relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-6 ${getBadgeColor()}`}>
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                  settings?.hero?.badge_status === 'coming_soon' ? 'bg-orange-400' : 'bg-green-400'
                } opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  settings?.hero?.badge_status === 'coming_soon' ? 'bg-orange-500' : 'bg-green-500'
                }`}></span>
              </span>
              <span className="text-sm font-semibold">
                {getBadgeText()}
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-white">
              {heroSettings.headline || 'The Future of Point of Sale'}
            </h1>

            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto">
              {heroSettings.subheadline || 'Accept cash, card, crypto, and EBT with openTILL\'s dual-pricing compliant POS system'}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="text-lg px-8 py-6 bg-white text-purple-600 hover:bg-gray-100 font-semibold shadow-2xl"
                onClick={() => window.location.href = createPageUrl('MerchantOnboarding')}
              >
                {heroSettings.cta_primary_text || 'Start Free Trial'}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6 bg-white/20 backdrop-blur-sm border-2 border-white text-white hover:bg-white hover:text-purple-600 font-semibold transition-all"
                onClick={() => window.location.href = createPageUrl('EmailLogin')}
              >
                {heroSettings.cta_secondary_text || 'Merchant Login'}
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {displayStats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center">
                  <div className="flex justify-center mb-3">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <div className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-2">
                    {stat.value}
                  </div>
                  <div className="text-gray-600 dark:text-gray-300 font-medium">
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Featured Chips Section */}
      <FeaturedChipsSection />

      {/* Features Section */}
      <section id="features" className="py-24 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              {settings?.features_section?.headline || 'Everything You Need to Run Your Business'}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              {settings?.features_section?.subheadline || 'Powerful features built for modern commerce'}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Dual Pricing Feature */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center mb-4">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Dual Pricing Compliant
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Legally compliant surcharging and cash discount programs. Save on processing fees.
              </p>
            </motion.div>

            {/* Solana Pay Feature */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-purple-50 to-green-50 dark:from-purple-900/20 dark:to-green-900/20 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border-2 border-purple-200 dark:border-purple-700"
            >
              <div className="flex items-center gap-3 mb-4">
                <img
                  src="https://solana.com/src/img/branding/solanaLogoMark.svg"
                  alt="Solana Pay"
                  className="w-12 h-12"
                />
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Solana Pay
                  </h3>
                  <p className="text-xs text-purple-600 dark:text-purple-400">
                    Powered by Solana
                  </p>
                </div>
              </div>
              <p className="text-gray-700 dark:text-gray-200">
                Accept USDC and other crypto payments instantly with near-zero fees and sub-second settlement.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full font-medium">
                  ⚡ Instant
                </span>
                <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full font-medium">
                  💰 Near-Zero Fees
                </span>
              </div>
            </motion.div>

            {/* EBT/SNAP Feature */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center mb-4">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                EBT/SNAP Accepted
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Accept food assistance benefits with integrated EBT processing and automatic eligibility tracking.
              </p>
            </motion.div>

            {/* Multi-Payment Feature */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-lg flex items-center justify-center mb-4">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Multiple Payment Methods
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Cash, credit/debit cards, crypto, EBT, and split payments all in one system.
              </p>
            </motion.div>

            {/* Inventory Feature */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center mb-4">
                <Package className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Smart Inventory
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Real-time stock tracking, low stock alerts, and automated reordering.
              </p>
            </motion.div>

            {/* Reports Feature */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Advanced Analytics
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Comprehensive sales reports, trends analysis, and performance insights.
              </p>
            </motion.div>

            {/* NFT-Gated Features */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
              className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border-2 border-blue-200 dark:border-blue-700"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mb-4">
                <Cpu className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                NFT-Gated Features
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Unlock premium features by connecting your wallet and holding specific NFTs. True Web3 integration.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full font-medium">
                  🔓 Motherboard
                </span>
                <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full font-medium">
                  💎 NFT Verified
                </span>
              </div>
            </motion.div>

            {/* Wallet Authentication */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.7 }}
              className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-pink-600 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Two-Factor Authentication
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Enhanced security with 2FA. Secure email and Google authentication for your account.
              </p>
            </motion.div>

            {/* Modular Feature System */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.8 }}
              className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center mb-4">
                <Package className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Chip-Based Features
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Modular system where each "chip" represents a feature. Unlock what you need when you need it.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 bg-white dark:bg-gray-900">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Free to Start, Pay for What You Need
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Core POS system is completely free. Add premium features as needed.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Core System */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <Card className="h-full border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Core System
                  </h3>
                  <div className="mb-6">
                    <span className="text-5xl font-bold text-green-600">
                      FREE
                    </span>
                    <span className="text-gray-600 dark:text-gray-400"> forever</span>
                  </div>
                  <Button
                    className="w-full mb-6 bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100"
                    size="lg"
                    onClick={() => window.location.href = createPageUrl('MerchantOnboarding')}
                  >
                    Get Started Free
                  </Button>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 dark:text-gray-300">Full POS System</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 dark:text-gray-300">Inventory Management</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 dark:text-gray-300">Customer Management</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 dark:text-gray-300">Basic Reports</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 dark:text-gray-300">Multi-Payment Support</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 dark:text-gray-300">Email Support</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            {/* Premium Features via Chips */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="h-full border-4 border-purple-500 shadow-2xl bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-purple-600 to-green-500 text-white px-4 py-1 text-sm font-semibold">
                    <Cpu className="w-3 h-3 mr-1" />
                    MODULAR
                  </Badge>
                </div>
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Premium Features
                  </h3>
                  <div className="mb-6">
                    <span className="text-3xl font-bold text-purple-600">
                      Chip-Based
                    </span>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      Pay only for features you need
                    </p>
                  </div>
                  <Button
                    className="w-full mb-6 bg-gradient-to-r from-purple-600 to-green-500 hover:from-purple-700 hover:to-green-600 text-white"
                    size="lg"
                    onClick={() => window.location.href = createPageUrl('MerchantOnboarding')}
                  >
                    Explore Features
                  </Button>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2">
                      <Cpu className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 dark:text-gray-300">Advanced Analytics</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Cpu className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 dark:text-gray-300">AI Assistant</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Cpu className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 dark:text-gray-300">Website Generator</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Cpu className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 dark:text-gray-300">Custom Integrations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Cpu className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 dark:text-gray-300">NFT-Gated Features</span>
                    </li>
                    <li className="text-sm text-purple-600 dark:text-purple-400 mt-4">
                      One-time or recurring fees per chip
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              All merchants start with the free core system. Unlock advanced features through the Motherboard.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold mb-6">
              {settings?.cta_section?.headline || 'Ready to Transform Your Business?'}
            </h2>
            <p className="text-xl mb-8 text-blue-100">
              {settings?.cta_section?.subheadline || 'Start accepting payments with openTILL'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-white text-blue-600 hover:bg-gray-100"
                onClick={() => window.location.href = createPageUrl('MerchantOnboarding')}
              >
                {settings?.cta_section?.cta_text || 'Get Started Today'}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                size="lg"
                className="bg-white/20 text-white border-2 border-white hover:bg-white hover:text-blue-600 transition-all"
                onClick={() => window.open('https://071be2.c.myucm.cloud/liveChat?liveChatAccess=MF83MDA2N2YzNDg5OTQ0OWI0OTdiMzhlMWQyNDhkNTg5Ml8wMDBiODIwNzFiZTImNmI3ODBlYzM4ZThmMWQyYjNiNDcwMTliMWM1OWM2MzA=', '_blank')}
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Chat with Sales
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Price Ticker */}
      <PriceTicker />

      {/* Footer */}
      <footer className="bg-black/30 backdrop-blur-md border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6970e2871534100b4ebb8d45/8e45f76fe_DUC3.png" alt="openTILL" className="w-6 h-6" />
                <span className="text-xl font-bold text-white">openTILL</span>
              </div>
              <p className="text-gray-300 text-sm mb-4">
                {settings?.company_info?.tagline || 'The next-generation point of sale system for modern businesses.'}
              </p>
              <p className="text-gray-300 text-sm">
                📞 +1 (419) 729-3889
              </p>
              <p className="text-gray-300 text-sm">
                ✉️ info@isolex.io
              </p>
            </div>

            {/* Product */}
            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="text-gray-300 hover:text-white text-sm transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-gray-300 hover:text-white text-sm transition-colors">Pricing</a></li>
                <li><a href={createPageUrl('DeviceShop')} className="text-gray-300 hover:text-white text-sm transition-colors">Device Shop</a></li>
                <li>
                  <a href={createPageUrl('DealerLanding')} className="text-gray-300 hover:text-white text-sm transition-colors">
                    Become an Ambassador
                  </a>
                </li>
                <li>
                  <a href={createPageUrl('Builders')} className="text-gray-300 hover:text-white text-sm transition-colors">
                    Build with Us
                  </a>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><a href={createPageUrl('About')} className="text-gray-300 hover:text-white text-sm transition-colors">About</a></li>
                <li><a href={createPageUrl('Contact')} className="text-gray-300 hover:text-white text-sm transition-colors">Contact</a></li>
                <li>
                  <a href={createPageUrl('DealerLanding')} className="text-gray-300 hover:text-white text-sm transition-colors">
                    Ambassador Portal
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
             <div>
               <h3 className="text-white font-semibold mb-4">Legal</h3>
               <ul className="space-y-2">
                 <li><a href={createPageUrl('PrivacyPolicy')} className="text-gray-300 hover:text-white text-sm transition-colors">Privacy Policy</a></li>
                 <li><a href={createPageUrl('TermsOfService')} className="text-gray-300 hover:text-white text-sm transition-colors">Terms of Service</a></li>
                 <li><a href={createPageUrl('License')} className="text-gray-300 hover:text-white text-sm transition-colors">License</a></li>
                 <li><a href={createPageUrl('Copyright')} className="text-gray-300 hover:text-white text-sm transition-colors">Copyright</a></li>
               </ul>
             </div>
          </div>

          <div className="border-t border-white/10 mt-8 pt-8">
            <div className="flex justify-center mb-4">
              <a 
                href={createPageUrl('DealerLogin')} 
                className="text-gray-400 hover:text-white text-sm transition-colors"
              >
                Ambassador Login
              </a>
            </div>
            <p className="text-gray-400 text-sm text-center">
              {settings?.company_info?.copyright_text || '© 2026 Isolex Corporation. All rights reserved.'}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}