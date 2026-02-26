import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  TrendingUp,
  DollarSign,
  Users,
  Package,
  Download,
  Calendar
} from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function GlobalReports() {
  const [merchants, setMerchants] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [merchantList, subList, orderList] = await Promise.all([
        base44.entities.Merchant.list(),
        base44.entities.Subscription.list(),
        base44.entities.DeviceShopOrder.list('-created_date', 100)
      ]);
      setMerchants(merchantList);
      setSubscriptions(subList);
      setOrders(orderList);
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Revenue by Plan
  const revenueByPlan = ['free', 'basic', 'pro', 'enterprise'].map(plan => ({
    name: plan.charAt(0).toUpperCase() + plan.slice(1),
    value: subscriptions
      .filter(s => s.plan_name === plan && s.status === 'active')
      .reduce((sum, s) => sum + (s.price || 0), 0),
    count: subscriptions.filter(s => s.plan_name === plan && s.status === 'active').length
  }));

  // Merchant Status Distribution
  const merchantStatus = ['active', 'trial', 'suspended', 'cancelled'].map(status => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: merchants.filter(m => m.status === status && !m.is_demo).length
  }));

  // Monthly Revenue Trend (last 6 months)
  const monthlyRevenue = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    const revenue = subscriptions
      .filter(s => {
        const paymentDate = s.last_payment_date ? new Date(s.last_payment_date) : null;
        return paymentDate && paymentDate >= monthStart && paymentDate <= monthEnd;
      })
      .reduce((sum, s) => sum + (s.last_payment_amount || 0), 0);

    return {
      month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      revenue: revenue
    };
  });

  // Device Shop Sales
  const deviceShopStats = {
    totalOrders: orders.length,
    totalRevenue: orders.reduce((sum, o) => sum + (o.total || 0), 0),
    pendingOrders: orders.filter(o => o.status === 'pending').length,
    shippedOrders: orders.filter(o => o.status === 'shipped').length
  };

  const exportReport = () => {
    const report = {
      generated: new Date().toISOString(),
      merchants: {
        total: merchants.length,
        active: merchants.filter(m => m.status === 'active' && !m.is_demo).length,
        trial: merchants.filter(m => m.status === 'trial' && !m.is_demo).length,
        suspended: merchants.filter(m => m.status === 'suspended' && !m.is_demo).length
      },
      subscriptions: {
        total: subscriptions.length,
        active: subscriptions.filter(s => s.status === 'active').length,
        revenue: subscriptions.reduce((sum, s) => sum + (s.price || 0), 0)
      },
      deviceShop: deviceShopStats
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `global-report-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading reports...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Global Reports & Analytics
            </CardTitle>
            <Button onClick={exportReport}>
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="revenue" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="merchants">Merchants</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="shop">Device Shop</TabsTrigger>
        </TabsList>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Revenue" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue by Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={revenueByPlan}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => `${entry.name}: $${entry.value}`}
                    >
                      {revenueByPlan.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Merchants Tab */}
        <TabsContent value="merchants" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Merchant Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={merchantStatus}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#3b82f6" name="Count" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Users className="w-12 h-12 mx-auto text-blue-500 mb-2" />
                  <p className="text-3xl font-bold">{merchants.length}</p>
                  <p className="text-sm text-gray-500">Total Merchants</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 mx-auto text-green-500 mb-2" />
                  <p className="text-3xl font-bold">
                    ${merchants.reduce((sum, m) => sum + (m.total_revenue || 0), 0).toFixed(0)}
                  </p>
                  <p className="text-sm text-gray-500">Total Revenue Generated</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Package className="w-12 h-12 mx-auto text-purple-500 mb-2" />
                  <p className="text-3xl font-bold">
                    {merchants.reduce((sum, m) => sum + (m.total_orders || 0), 0)}
                  </p>
                  <p className="text-sm text-gray-500">Total Orders Processed</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {revenueByPlan.map((plan, index) => (
              <Card key={plan.name}>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold" style={{ color: COLORS[index] }}>
                      {plan.count}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">{plan.name} Plan</div>
                    <div className="text-lg font-semibold mt-2">
                      ${plan.value.toFixed(0)}/mo
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Subscription Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {revenueByPlan.map((plan, index) => (
                  <div key={plan.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: COLORS[index] }}
                      />
                      <span className="font-medium">{plan.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{plan.count} subscribers</div>
                      <div className="text-sm text-gray-500">${plan.value.toFixed(2)}/month</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Device Shop Tab */}
        <TabsContent value="shop" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Orders</p>
                    <p className="text-2xl font-bold">{deviceShopStats.totalOrders}</p>
                  </div>
                  <Package className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Revenue</p>
                    <p className="text-2xl font-bold">${deviceShopStats.totalRevenue.toFixed(0)}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Pending Orders</p>
                    <p className="text-2xl font-bold">{deviceShopStats.pendingOrders}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Shipped Orders</p>
                    <p className="text-2xl font-bold">{deviceShopStats.shippedOrders}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {orders.slice(0, 10).map(order => (
                  <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{order.order_number}</div>
                      <div className="text-sm text-gray-500">{order.merchant_name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">${order.total.toFixed(2)}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(order.created_date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}