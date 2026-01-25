import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createPageUrl } from '@/utils';
import { 
  Store, 
  DollarSign, 
  TrendingUp,
  Settings,
  CreditCard,
  Sparkles
} from 'lucide-react';
import StripeConnectSetup from '../components/dealer/StripeConnectSetup';
import CustomDomainSSL from '../components/dealer/CustomDomainSSL';
import PayoutDashboard from '../components/dealer/PayoutDashboard';
import AIMarketingTools from '../components/dealer/AIMarketingTools';

export default function DealerDashboardPage() {
  const [dealer, setDealer] = useState(null);
  const [merchants, setMerchants] = useState([]);
  const [stats, setStats] = useState({
    totalMerchants: 0,
    activeMerchants: 0,
    monthlyRevenue: 0,
    pendingCommission: 0
  });
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadDealerData();
  }, []);

  const loadDealerData = async () => {
    try {
      setLoading(true);
      
      // Get current user from localStorage or auth
      const pinUserJSON = localStorage.getItem('pinLoggedInUser');
      let user = null;
      
      if (pinUserJSON) {
        try {
          user = JSON.parse(pinUserJSON);
        } catch (e) {
          console.error('Error parsing pinLoggedInUser:', e);
        }
      }
      
      if (!user) {
        try {
          user = await base44.auth.me();
        } catch (e) {
          console.error('Error getting user:', e);
          window.location.href = createPageUrl('PinLogin');
          return;
        }
      }

      if (!user || (user.role !== 'dealer_admin' && user.role !== 'root_admin' && user.role !== 'admin')) {
        window.location.href = createPageUrl('PinLogin');
        return;
      }

      setCurrentUser(user);
      
      // Root admin can view all dealers, dealer_admin sees their dealer
      let dealerData;
      if (user.role === 'root_admin' || user.role === 'admin') {
        // For root admin, either get from URL param or show all dealers
        const urlParams = new URLSearchParams(window.location.search);
        const dealerId = urlParams.get('dealer_id');
        
        if (dealerId) {
          const dealers = await base44.entities.Dealer.filter({ id: dealerId });
          dealerData = dealers[0];
        } else {
          // Show first dealer or allow selection
          const allDealers = await base44.entities.Dealer.list();
          dealerData = allDealers[0];
        }
      } else if (user.dealer_id) {
        const dealers = await base44.entities.Dealer.filter({ id: user.dealer_id });
        dealerData = dealers[0];
      }
      
      if (!dealerData) {
        throw new Error('No dealer found');
      }
      
      setDealer(dealerData);
      
      // Load merchants for this dealer
      const merchantList = await base44.entities.Merchant.filter({ 
        dealer_id: dealerData.id 
      });
      setMerchants(merchantList);
      
      // Calculate stats
      const activeMerchants = merchantList.filter(m => m.status === 'active').length;
      const monthlyRevenue = merchantList.reduce((sum, m) => sum + (m.total_revenue || 0), 0);
      
      setStats({
        totalMerchants: merchantList.length,
        activeMerchants,
        monthlyRevenue,
        pendingCommission: dealerData.commission_pending || 0
      });
      
    } catch (error) {
      console.error('Error loading dealer data:', error);
      alert('Error loading dealer dashboard. Please contact support.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!dealer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Dealer Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Unable to load dealer information. Please contact support.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            {dealer.logo_url && (
              <img src={dealer.logo_url} alt={dealer.name} className="w-16 h-16 object-contain" />
            )}
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                {dealer.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Dealer Dashboard
                {currentUser?.role === 'root_admin' && (
                  <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                    Root Admin View
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Merchants
              </CardTitle>
              <Store className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalMerchants}</div>
              <p className="text-xs text-green-600 mt-1">
                {stats.activeMerchants} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Monthly Revenue
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ${stats.monthlyRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">From all merchants</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Pending Commission
              </CardTitle>
              <DollarSign className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ${stats.pendingCommission.toFixed(2)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Awaiting payout</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Commission Rate
              </CardTitle>
              <CreditCard className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {dealer.commission_percent || 0}%
              </div>
              <p className="text-xs text-gray-500 mt-1">On merchant fees</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="merchants" className="space-y-6">
          <TabsList>
            <TabsTrigger value="merchants">
              <Store className="w-4 h-4 mr-2" />
              Merchants
            </TabsTrigger>
            <TabsTrigger value="marketing">
              <Sparkles className="w-4 h-4 mr-2" />
              AI Marketing
            </TabsTrigger>
            <TabsTrigger value="payouts">
              <DollarSign className="w-4 h-4 mr-2" />
              Payouts
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="merchants">
            <Card>
              <CardHeader>
                <CardTitle>Your Merchants</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {merchants.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      No merchants yet. Invite merchants to get started.
                    </p>
                  ) : (
                    merchants.map((merchant) => (
                      <div
                        key={merchant.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div>
                          <h3 className="font-semibold">{merchant.business_name}</h3>
                          <p className="text-sm text-gray-500">
                            {merchant.owner_email} • {merchant.status}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            ${(merchant.total_revenue || 0).toLocaleString()}
                          </div>
                          <p className="text-sm text-gray-500">Total Revenue</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="marketing">
            <AIMarketingTools dealerId={dealer.id} />
          </TabsContent>

          <TabsContent value="payouts">
            <PayoutDashboard dealerId={dealer.id} />
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-6">
              <StripeConnectSetup dealer={dealer} onUpdate={loadDealerData} />
              <CustomDomainSSL dealer={dealer} onUpdate={loadDealerData} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}