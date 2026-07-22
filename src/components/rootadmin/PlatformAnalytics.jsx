import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUp, 
  Users, 
  DollarSign,
  Building2,
  Loader2
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export default function PlatformAnalytics() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    overview: {
      totalDealers: 0,
      totalMerchants: 0,
      totalRevenue: 0,
      monthlyGrowth: 0
    },
    dealerRevenue: [],
    merchantsByDealer: [],
    revenueByMonth: []
  });

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      // Load dealers
      const dealers = await base44.entities.Ambassador.list();
      
      // Load all merchants
      const merchants = await base44.entities.Merchant.list();
      
      // Load all orders from last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const orders = await base44.entities.Order.filter({
        status: 'completed',
        created_date: { $gte: sixMonthsAgo.toISOString() }
      });

      // Calculate dealer revenue
      const dealerRevenueMap = {};
      dealers.forEach(dealer => {
        dealerRevenueMap[dealer.legacy_dealer_id || dealer.id] = {
          name: dealer.name,
          revenue: dealer.total_revenue_generated || 0,
          commission: dealer.commission_earned || 0,
          merchants: 0
        };
      });

      // Count merchants per dealer
      merchants.forEach(merchant => {
        if (merchant.dealer_id && dealerRevenueMap[merchant.dealer_id]) {
          dealerRevenueMap[merchant.dealer_id].merchants++;
        }
      });

      const dealerRevenue = Object.values(dealerRevenueMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Calculate monthly revenue
      const monthlyRevenue = {};
      orders.forEach(order => {
        const month = new Date(order.created_date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short' 
        });
        
        if (!monthlyRevenue[month]) {
          monthlyRevenue[month] = 0;
        }
        monthlyRevenue[month] += order.total || 0;
      });

      const revenueByMonth = Object.entries(monthlyRevenue).map(([month, revenue]) => ({
        month,
        revenue
      }));

      // Calculate totals
      const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
      
      setAnalytics({
        overview: {
          totalDealers: dealers.length,
          totalMerchants: merchants.length,
          totalRevenue,
          monthlyGrowth: 12.5 // Calculate actual growth
        },
        dealerRevenue,
        merchantsByDealer: dealerRevenue.map(d => ({
          name: d.name,
          value: d.merchants
        })),
        revenueByMonth
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  const COLORS = ['#7B2FD6', '#0FD17A', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Dealers</p>
                <p className="text-2xl font-bold">{analytics.overview.totalDealers}</p>
              </div>
              <Building2 className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Merchants</p>
                <p className="text-2xl font-bold">{analytics.overview.totalMerchants}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold">${analytics.overview.totalRevenue.toFixed(0)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Monthly Growth</p>
                <p className="text-2xl font-bold">+{analytics.overview.monthlyGrowth}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Month */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#7B2FD6" 
                  strokeWidth={2}
                  name="Revenue"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Dealers by Revenue */}
        <Card>
          <CardHeader>
            <CardTitle>Top Dealers by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.dealerRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" fill="#7B2FD6" name="Revenue" />
                <Bar dataKey="commission" fill="#0FD17A" name="Commission Paid" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Merchants by Dealer */}
        <Card>
          <CardHeader>
            <CardTitle>Merchants Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.merchantsByDealer}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.merchantsByDealer.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Dealer Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle>Dealer Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.dealerRevenue.slice(0, 5).map((dealer, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{dealer.name}</p>
                    <p className="text-sm text-gray-500">{dealer.merchants} merchants</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${dealer.revenue.toFixed(0)}</p>
                    <p className="text-sm text-green-600">${dealer.commission.toFixed(0)} commission</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}