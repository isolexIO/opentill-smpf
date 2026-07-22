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
  Calendar,
  CreditCard,
  Cpu,
  Wallet,
  Receipt
} from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function GlobalReports() {
  const [merchants, setMerchants] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [chipMints, setChipMints] = useState([]);
  const [chipSubscriptions, setChipSubscriptions] = useState([]);
  const [dealerPayouts, setDealerPayouts] = useState([]);
  const [builders, setBuilders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [merchantList, subList, orderList, platformOrderList, mintList, subChipList, payoutList, builderList] = await Promise.all([
        base44.entities.Merchant.list(),
        base44.entities.Subscription.list(),
        base44.entities.DeviceShopOrder.list('-created_date', 100),
        base44.entities.Order.list('-created_date', 5000),
        base44.entities.ChipMint.list('-minted_at', 5000),
        base44.entities.ChipSubscription.list(),
        base44.entities.DealerPayout.list('-created_date', 1000),
        base44.entities.Builder.list()
      ]);
      setMerchants(merchantList);
      setSubscriptions(subList);
      setOrders(orderList);
      setAllOrders(platformOrderList || []);
      setChipMints(mintList || []);
      setChipSubscriptions(subChipList || []);
      setDealerPayouts(payoutList || []);
      setBuilders(builderList || []);
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

  // ===== Platform-wide Financials =====
  const completedOrders = allOrders.filter(o => o.status === 'completed');
  const totalPlatformSales = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const PAYMENT_TYPES = ['cash', 'card', 'ebt', 'solana_pay', 'opentill', 'split', 'pending'];
  const salesByPaymentType = PAYMENT_TYPES.map(pm => {
    const filtered = completedOrders.filter(o => o.payment_method === pm);
    return {
      name: pm === 'solana_pay' ? 'Solana Pay' : pm.charAt(0).toUpperCase() + pm.slice(1),
      value: filtered.reduce((sum, o) => sum + (o.total || 0), 0),
      count: filtered.length
    };
  }).filter(x => x.value > 0 || x.count > 0);

  // Chip sales revenue (in $DUC)
  const chipOneTimeDuc = chipMints.reduce((sum, m) => sum + (m.price_paid_duc || 0), 0);
  const activeSubs = chipSubscriptions.filter(s => s.status === 'ACTIVE');
  const chipMrrDuc = activeSubs.reduce((sum, sub) => sum + (sub.recurring_price_duc || 0) * (sub.interval === 'YEARLY' ? 1 / 12 : 1), 0);
  const chipTotalDuc = chipOneTimeDuc + chipMrrDuc;

  // Builder payouts / earnings
  const builderEarnings = builders.reduce((sum, b) => sum + (b.total_earnings || 0), 0);
  const topBuilders = [...builders].sort((a, b) => (b.total_earnings || 0) - (a.total_earnings || 0)).slice(0, 8);

  // Dealer / merchant payouts
  const completedPayouts = dealerPayouts.filter(p => p.status === 'completed');
  const pendingPayouts = dealerPayouts.filter(p => ['pending', 'scheduled', 'processing', 'on_hold', 'manual_review'].includes(p.status));
  const dealerPayoutsPaid = completedPayouts.reduce((sum, p) => sum + (p.commission_amount || 0), 0);
  const dealerPayoutsPending = pendingPayouts.reduce((sum, p) => sum + (p.commission_amount || 0), 0);
  const platformNetRevenue = completedPayouts.reduce((sum, p) => sum + (p.root_share || 0), 0);
  const payoutStatusBreakdown = ['completed', 'pending', 'scheduled', 'processing', 'failed', 'on_hold'].map(st => ({
    name: st.charAt(0).toUpperCase() + st.slice(1),
    value: dealerPayouts.filter(p => p.status === st).reduce((sum, p) => sum + (p.commission_amount || 0), 0),
    count: dealerPayouts.filter(p => p.status === st).length
  })).filter(x => x.count > 0);

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
      deviceShop: deviceShopStats,
      financials: {
        totalPlatformSales,
        totalCompletedOrders: completedOrders.length,
        salesByPaymentType,
        chipSales: { oneTimeDuc: chipOneTimeDuc, mrrDuc: chipMrrDuc, totalDuc: chipTotalDuc, mints: chipMints.length, activeSubscriptions: activeSubs.length },
        builderPayouts: { totalEarnings: builderEarnings, builderCount: builders.length },
        dealerPayouts: { paid: dealerPayoutsPaid, pending: dealerPayoutsPending, platformNetRevenue, byStatus: payoutStatusBreakdown }
      }
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

      <Tabs defaultValue="financials" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="financials">Platform Financials</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="merchants">Merchants</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="shop">Device Shop</TabsTrigger>
        </TabsList>

        {/* Platform Financials Tab */}
        <TabsContent value="financials" className="space-y-6">
          {/* Main Financial KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Total Platform Sales', value: `$${totalPlatformSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, sub: `${completedOrders.length} orders`, icon: DollarSign, color: 'text-green-500' },
              { label: 'Chip Sales Revenue', value: `${chipTotalDuc.toLocaleString(undefined, { maximumFractionDigits: 1 })} $DUC`, sub: 'one-time + MRR', icon: Cpu, color: 'text-purple-500' },
              { label: 'Builder Payouts', value: `$${builderEarnings.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, sub: `${builders.length} builders`, icon: Wallet, color: 'text-blue-500' },
              { label: 'Dealer Payouts', value: `$${dealerPayoutsPaid.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, sub: 'paid out', icon: Receipt, color: 'text-indigo-500' },
              { label: 'Platform Net Revenue', value: `$${platformNetRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, sub: 'platform share', icon: TrendingUp, color: 'text-emerald-500' },
              { label: 'Pending Payouts', value: `$${dealerPayoutsPending.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, sub: 'to dealers', icon: Calendar, color: 'text-orange-500' }
            ].map((kpi) => {
              const Icon = kpi.icon;
              return (
                <Card key={kpi.label}>
                  <CardContent className="pt-5">
                    <Icon className={`w-7 h-7 mb-2 ${kpi.color}`} />
                    <p className="text-xl font-bold">{kpi.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{kpi.label}</p>
                    <p className="text-xs text-gray-400">{kpi.sub}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Sales by Payment Type */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" /> Platform Sales by Payment Type</CardTitle>
              </CardHeader>
              <CardContent>
                {salesByPaymentType.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-12">No completed sales recorded yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={salesByPaymentType}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(v) => `$${v}`} />
                      <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                      <Legend />
                      <Bar dataKey="value" name="Sales ($)">
                        {salesByPaymentType.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Type Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {salesByPaymentType.length === 0 && <p className="text-sm text-gray-500">No sales data.</p>}
                  {salesByPaymentType.map((pt, index) => (
                    <div key={pt.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="font-medium">{pt.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">${pt.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                        <div className="text-xs text-gray-500">{pt.count} orders</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chip Sales + Builder Payouts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Cpu className="w-5 h-5" /> Chip Sales Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">{chipOneTimeDuc.toLocaleString(undefined, { maximumFractionDigits: 1 })}</p>
                    <p className="text-xs text-gray-500">One-time sales ($DUC)</p>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{chipMrrDuc.toLocaleString(undefined, { maximumFractionDigits: 1 })}</p>
                    <p className="text-xs text-gray-500">Recurring MRR ($DUC)</p>
                  </div>
                </div>
                <div className="flex justify-between text-sm"><span>Total Chip Mints</span><span className="font-bold">{chipMints.length}</span></div>
                <div className="flex justify-between text-sm mt-1"><span>Active Subscriptions</span><span className="font-bold">{activeSubs.length}</span></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Wallet className="w-5 h-5" /> Builder Payouts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {topBuilders.length === 0 && <p className="text-sm text-gray-500">No builders yet.</p>}
                  {topBuilders.map(b => (
                    <div key={b.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <div className="font-medium">{b.full_name || b.company_name || 'Builder'}</div>
                        <div className="text-xs text-gray-500">{b.total_chips || 0} chips · {b.total_sales || 0} sales</div>
                      </div>
                      <div className="font-bold">${(b.total_earnings || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Dealer / Merchant Payouts by Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Receipt className="w-5 h-5" /> Dealer / Merchant Payouts by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {payoutStatusBreakdown.length === 0 && <p className="text-sm text-gray-500 col-span-full">No payouts recorded.</p>}
                {payoutStatusBreakdown.map((ps, index) => (
                  <div key={ps.name} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="w-3 h-3 rounded-full mb-2" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <p className="text-lg font-bold">${ps.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    <p className="text-xs text-gray-500">{ps.name} · {ps.count}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

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