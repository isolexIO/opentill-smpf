import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Store, TrendingUp, Users, ArrowRight, LogIn } from 'lucide-react';

export default function DealerHomePage() {
  const [dealer, setDealer] = useState(null);
  const [merchants, setMerchants] = useState([]);
  const [stats, setStats] = useState({ totalMerchants: 0, activeMerchants: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDealerInfo();
  }, []);

  const loadDealerInfo = async () => {
    try {
      setLoading(true);
      const hostname = window.location.hostname;
      const subdomain = hostname.split('.')[0];

      let dealerData = null;
      if (subdomain && !['localhost', 'chainlinkpos', 'www', ''].includes(subdomain.toLowerCase())) {
        const dealers = await base44.entities.Dealer.filter({ slug: subdomain });
        dealerData = dealers[0];
      }

      if (dealerData) {
        setDealer(dealerData);
        
        const merchantList = await base44.entities.Merchant.filter({ dealer_id: dealerData.id });
        setMerchants(merchantList || []);
        
        const activeMerchants = merchantList.filter(m => m.status === 'active').length;
        const totalRevenue = merchantList.reduce((sum, m) => sum + (m.total_revenue || 0), 0);
        
        setStats({
          totalMerchants: merchantList.length,
          activeMerchants,
          totalRevenue
        });
      }
    } catch (error) {
      console.error('Error loading dealer info:', error);
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
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Dealer Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Unable to load dealer information.</p>
            <Button onClick={() => window.location.href = createPageUrl('Home')}>Back to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const primaryColor = dealer.primary_color || '#7B2FD6';
  const secondaryColor = dealer.secondary_color || '#0FD17A';

  return (
    <div className="min-h-screen" style={{ background: `linear-gradient(135deg, ${primaryColor}15 0%, ${secondaryColor}15 100%)` }}>
      {/* Hero */}
      <div className="relative overflow-hidden py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              {dealer.logo_url && (
                <img src={dealer.logo_url} alt={dealer.name} className="h-20 mb-6" />
              )}
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-4">
                {dealer.name}
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                Point of Sale Solutions & Merchant Management
              </p>
              <div className="flex gap-4">
                <Button
                  onClick={() => window.location.href = createPageUrl('DealerDashboard')}
                  className="gap-2 text-lg px-8"
                  style={{ backgroundColor: primaryColor }}
                >
                  <LogIn className="w-5 h-5" />
                  Dealer Dashboard
                </Button>
                <Button variant="outline" size="lg" className="gap-2">
                  Learn More <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: `${primaryColor}20`, color: primaryColor }}>
                      <Store className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Merchants</p>
                      <p className="text-3xl font-bold">{stats.totalMerchants}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: `${secondaryColor}20`, color: secondaryColor }}>
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
                      <p className="text-3xl font-bold">${(stats.totalRevenue / 1000).toFixed(0)}k</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: `${primaryColor}20`, color: primaryColor }}>
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Active Merchants</p>
                      <p className="text-3xl font-bold">{stats.activeMerchants}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Merchants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{stats.totalMerchants}</div>
              <p className="text-xs text-gray-500 mt-1">{stats.activeMerchants} currently active</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">${(stats.totalRevenue / 1000).toFixed(1)}k</div>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Commission Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{dealer.commission_percent || 0}%</div>
              <p className="text-xs text-gray-500 mt-1">On merchant fees</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Featured Merchants */}
      {merchants.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-3xl font-bold mb-8">Featured Merchants</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {merchants.slice(0, 6).map(merchant => (
              <Card key={merchant.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{merchant.business_name}</CardTitle>
                    </div>
                    <Badge variant={merchant.status === 'active' ? 'default' : 'secondary'}>
                      {merchant.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-gray-600">Revenue</p>
                      <p className="font-semibold">${(merchant.total_revenue || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Orders</p>
                      <p className="font-semibold">{merchant.total_orders || 0}</p>
                    </div>
                    <p className="text-xs text-gray-500">{merchant.owner_email}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* CTA Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Manage Your Business?</h2>
          <p className="text-lg mb-8 text-blue-100">Access your dealer dashboard to manage merchants, view analytics, and optimize performance.</p>
          <Button
            onClick={() => window.location.href = createPageUrl('DealerDashboard')}
            className="bg-white text-blue-600 hover:bg-gray-100 gap-2 text-lg px-8"
          >
            <LogIn className="w-5 h-5" />
            Go to Dashboard
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-white font-semibold mb-4">{dealer.name}</h3>
              <p className="text-sm">{dealer.contact_email}</p>
              {dealer.contact_phone && <p className="text-sm">{dealer.contact_phone}</p>}
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm">
                <li><a href={createPageUrl('Home')} className="hover:text-white">Platform</a></li>
                <li><a href={createPageUrl('DealerDashboard')} className="hover:text-white">Dashboard</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li><a href={createPageUrl('PrivacyPolicy')} className="hover:text-white">Privacy</a></li>
                <li><a href={createPageUrl('TermsOfService')} className="hover:text-white">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; 2026 {dealer.name}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}