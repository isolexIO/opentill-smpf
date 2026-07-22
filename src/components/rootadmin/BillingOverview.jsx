import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DollarSign, 
  TrendingUp,
  Users,
  CreditCard
} from 'lucide-react';

export default function BillingOverview() {
  const [dealers, setDealers] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMRR: 0,
    dealerFees: 0,
    merchantSubscriptions: 0,
    netRevenue: 0
  });

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    try {
      const [dealerList, merchantList, subList] = await Promise.all([
        base44.entities.Ambassador.list(),
        base44.entities.Merchant.list(),
        base44.entities.Subscription.list()
      ]);

      setDealers(dealerList);
      setMerchants(merchantList);
      setSubscriptions(subList);

      // Calculate stats
      const dealerFees = dealerList.reduce((sum, d) => sum + (d.platform_fee_monthly || 0), 0);
      const merchantSubs = subList
        .filter(s => s.status === 'active')
        .reduce((sum, s) => sum + (s.price || 0), 0);
      const totalMRR = dealerFees + merchantSubs;

      setStats({
        totalMRR,
        dealerFees,
        merchantSubscriptions: merchantSubs,
        netRevenue: totalMRR
      });
    } catch (error) {
      console.error('Error loading billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading billing data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total MRR</p>
                <p className="text-2xl font-bold">${stats.totalMRR.toFixed(0)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Dealer Platform Fees</p>
                <p className="text-2xl font-bold">${stats.dealerFees.toFixed(0)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Merchant Subscriptions</p>
                <p className="text-2xl font-bold">${stats.merchantSubscriptions.toFixed(0)}</p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Net Revenue</p>
                <p className="text-2xl font-bold">${stats.netRevenue.toFixed(0)}</p>
              </div>
              <CreditCard className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Active Subscriptions by Dealer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dealers.map((dealer) => {
              const dealerMerchants = merchants.filter(m => m.dealer_id === (dealer.legacy_dealer_id || dealer.id));
              const dealerSubs = subscriptions.filter(s => 
                dealerMerchants.some(m => m.id === s.merchant_id) && s.status === 'active'
              );
              const dealerRevenue = dealerSubs.reduce((sum, s) => sum + (s.price || 0), 0);

              return (
                <div
                  key={dealer.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <h3 className="font-medium">{dealer.name}</h3>
                    <p className="text-sm text-gray-500">
                      {dealerMerchants.length} merchants • {dealerSubs.length} active subscriptions
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-bold">${dealerRevenue.toFixed(2)}/mo</p>
                    <p className="text-xs text-gray-500">
                      Platform Fee: ${dealer.platform_fee_monthly || 0}/mo
                    </p>
                  </div>
                </div>
              );
            })}

            {dealers.length === 0 && (
              <div className="text-center py-12">
                <DollarSign className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No active subscriptions</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}