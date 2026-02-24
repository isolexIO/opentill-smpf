import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createPageUrl } from '@/utils';
import {
  Store, DollarSign, TrendingUp, Settings, CreditCard, Sparkles, Users,
  LogOut, Bell, Globe, BarChart3, Wallet
} from 'lucide-react';
import StripeConnectSetup from '../components/dealer/StripeConnectSetup.jsx';
import CustomDomainSSL from '../components/dealer/CustomDomainSSL.jsx';
import PayoutDashboard from '../components/dealer/PayoutDashboard.jsx';
import AIMarketingTools from '../components/dealer/AIMarketingTools.jsx';
import MerchantManagement from '../components/dealer/MerchantManagement.jsx';
import StaffManagement from '../components/dealer/StaffManagement.jsx';
import MerchantAnalytics from '../components/dealer/MerchantAnalytics.jsx';
import DealerBrandingSettings from '../components/dealer/DealerBrandingSettings.jsx';

export default function DealerDashboardPage() {
  const [dealer, setDealer] = useState(null);
  const [merchants, setMerchants] = useState([]);
  const [stats, setStats] = useState({ totalMerchants: 0, activeMerchants: 0, monthlyRevenue: 0, pendingCommission: 0 });
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => { loadDealerData(); }, []);

  const loadDealerData = async () => {
    try {
      setLoading(true);
      const pinUserJSON = localStorage.getItem('pinLoggedInUser');
      let user = null;
      if (pinUserJSON) { try { user = JSON.parse(pinUserJSON); } catch { } }
      if (!user) {
        try { user = await base44.auth.me(); } catch {
          window.location.href = createPageUrl('EmailLogin'); return;
        }
      }
      if (!user || !['dealer_admin', 'ambassador', 'root_admin', 'admin'].includes(user.role)) {
        window.location.href = createPageUrl('EmailLogin'); return;
      }
      setCurrentUser(user);

      // Check if impersonating - load dealer from stored dealerData first
      const storedDealerData = localStorage.getItem('dealerData');
      let dealerData;

      if (storedDealerData) {
        try {
          const parsed = JSON.parse(storedDealerData);
          if (parsed.id) {
            const dealers = await base44.entities.Dealer.filter({ id: parsed.id });
            dealerData = dealers[0];
          }
        } catch { /* fall through */ }
      }

      if (!dealerData) {
        if (['root_admin', 'admin'].includes(user.role)) {
          const dealerId = new URLSearchParams(window.location.search).get('dealer_id');
          const dealers = dealerId
            ? await base44.entities.Dealer.filter({ id: dealerId })
            : await base44.entities.Dealer.list();
          dealerData = dealers[0];
        } else if (user.dealer_id) {
          const dealers = await base44.entities.Dealer.filter({ id: user.dealer_id });
          dealerData = dealers[0];
        }
      }

      if (!dealerData) throw new Error('No dealer found');
      setDealer(dealerData);

      const merchantList = await base44.entities.Merchant.filter({ dealer_id: dealerData.id });
      setMerchants(merchantList);
      const activeMerchants = merchantList.filter(m => m.status === 'active').length;
      const monthlyRevenue = merchantList.reduce((s, m) => s + (m.total_revenue || 0), 0);
      setStats({ totalMerchants: merchantList.length, activeMerchants, monthlyRevenue, pendingCommission: dealerData.commission_pending || 0 });
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('pinLoggedInUser');
    localStorage.removeItem('dealerToken');
    localStorage.removeItem('dealerData');
    window.location.href = createPageUrl('DealerLanding');
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/50 text-sm">Loading your dashboard...</p>
      </div>
    </div>
  );

  if (!dealer) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <Card className="max-w-md bg-white/5 border-white/10">
        <CardHeader><CardTitle className="text-white">No Ambassador Account Found</CardTitle></CardHeader>
        <CardContent>
          <p className="text-white/50 mb-4">Unable to load ambassador information.</p>
          <Button onClick={() => window.location.href = createPageUrl('DealerLanding')} className="w-full">
            Go to Landing Page
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const primaryColor = dealer.primary_color || '#10b981';
  const secondaryColor = dealer.secondary_color || '#7c3aed';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top Bar */}
      <div className="sticky top-0 z-40 border-b border-white/10 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {dealer.logo_url ? (
              <img src={dealer.logo_url} alt={dealer.name} className="h-9 object-contain" />
            ) : (
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6970e2871534100b4ebb8d45/8e45f76fe_DUC3.png" alt="openTILL" className="w-9 h-9" />
            )}
            <div>
              <div className="font-bold text-gray-900 dark:text-white text-sm leading-none">{dealer.name}</div>
              <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                Ambassador Dashboard
                {['root_admin', 'admin'].includes(currentUser?.role) && (
                  <Badge variant="destructive" className="text-xs py-0 px-1.5 h-4">Admin View</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dealer.domain && (
              <a href={`https://${dealer.domain}`} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm" className="text-gray-500 dark:text-gray-400 hidden md:flex">
                  <Globe className="w-4 h-4 mr-1" /> {dealer.domain}
                </Button>
              </a>
            )}
            <Button variant="ghost" size="icon" className="text-gray-500 dark:text-gray-400">
              <Bell className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-500 dark:text-gray-400">
              <LogOut className="w-4 h-4 mr-1" /> Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">
            Welcome back{currentUser?.full_name ? `, ${currentUser.full_name.split(' ')[0]}` : ''}! 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Here's what's happening with your ambassador network today.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Merchants', value: stats.totalMerchants, sub: `${stats.activeMerchants} active`, icon: Store, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
            { label: 'Network Revenue', value: `$${stats.monthlyRevenue.toLocaleString()}`, sub: 'All merchants', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
            { label: 'Pending Commission', value: `$${stats.pendingCommission.toFixed(2)}`, sub: 'Awaiting payout', icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
            { label: 'Commission Rate', value: `${dealer.commission_percent || 0}%`, sub: 'On merchant fees', icon: CreditCard, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
          ].map((s, i) => (
            <Card key={i} className="dark:bg-gray-900 dark:border-gray-800">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{s.label}</span>
                  <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                    <s.icon className={`w-4 h-4 ${s.color}`} />
                  </div>
                </div>
                <div className="text-2xl font-black text-gray-900 dark:text-white">{s.value}</div>
                <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="merchants" className="space-y-6">
          <TabsList className="bg-gray-100 dark:bg-gray-800/50 p-1 flex-wrap h-auto gap-1">
            {[
              { value: 'merchants', icon: Store, label: 'Merchants' },
              { value: 'analytics', icon: BarChart3, label: 'Analytics' },
              { value: 'marketing', icon: Sparkles, label: 'AI Marketing' },
              { value: 'payouts', icon: Wallet, label: 'Payouts' },
              { value: 'staff', icon: Users, label: 'Staff' },
              { value: 'settings', icon: Settings, label: 'Settings' },
            ].map(t => (
              <TabsTrigger key={t.value} value={t.value}
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 text-sm">
                <t.icon className="w-4 h-4 mr-1.5" />
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="merchants">
            <MerchantManagement dealerId={dealer.id} />
          </TabsContent>
          <TabsContent value="analytics">
            <MerchantAnalytics dealerId={dealer.id} />
          </TabsContent>
          <TabsContent value="marketing">
            <AIMarketingTools dealerId={dealer.id} />
          </TabsContent>
          <TabsContent value="payouts">
            <PayoutDashboard dealerId={dealer.id} />
          </TabsContent>
          <TabsContent value="staff">
            <StaffManagement dealerId={dealer.id} />
          </TabsContent>
          <TabsContent value="settings">
            <Tabs defaultValue="branding" className="space-y-4">
              <TabsList>
                <TabsTrigger value="branding">Branding</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
                <TabsTrigger value="domains">Domains</TabsTrigger>
              </TabsList>
              <TabsContent value="branding"><DealerBrandingSettings dealer={dealer} onUpdate={loadDealerData} /></TabsContent>
              <TabsContent value="payments"><StripeConnectSetup dealer={dealer} onUpdate={loadDealerData} /></TabsContent>
              <TabsContent value="domains"><CustomDomainSSL dealer={dealer} onUpdate={loadDealerData} /></TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}