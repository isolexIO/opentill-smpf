import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export default function CommissionBreakdown({ dealer }) {
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [merchants, setMerchants] = useState([]);

  useEffect(() => {
    loadCommissionData();
  }, [dealer.id]);

  const loadCommissionData = async () => {
    try {
      setLoading(true);

      // Load merchant list to calculate contributions
      const merchantList = await base44.entities.Merchant.filter(
        { dealer_id: dealer.legacy_dealer_id || dealer.id },
        '-total_revenue',
        100
      );

      setMerchants(merchantList);

      // Commission is earned on merchant subscription fees (not POS sales) and
      // is recorded on DealerPayout records. Aggregate from payouts for accuracy.
      const payoutList = await base44.entities.DealerPayout.filter(
        { dealer_id: dealer.legacy_dealer_id || dealer.id },
        '-created_date',
        200
      );
      const totalCommissionPaid = payoutList
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + (p.commission_amount || 0), 0);
      const totalCommissionPending = payoutList
        .filter(p => ['pending', 'scheduled', 'on_hold', 'processing'].includes(p.status))
        .reduce((sum, p) => sum + (p.commission_amount || 0), 0);

      const totalRevenue = merchantList.reduce((sum, m) => sum + (m.total_revenue || 0), 0);
      const commissionRate = dealer.commission_percent || 0;

      const chartData = merchantList
        .filter(m => m.total_revenue > 0)
        .sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0))
        .slice(0, 10)
        .map(m => ({
          name: m.business_name,
          revenue: m.total_revenue || 0
        }));

      const statusBreakdown = [
        {
          name: 'Active',
          value: merchantList.filter(m => m.status === 'active').length,
          fill: '#10b981'
        },
        {
          name: 'Inactive',
          value: merchantList.filter(m => m.status === 'inactive').length,
          fill: '#ef4444'
        },
        {
          name: 'Trial',
          value: merchantList.filter(m => m.status === 'trial').length,
          fill: '#3b82f6'
        },
        {
          name: 'Suspended',
          value: merchantList.filter(m => m.status === 'suspended').length,
          fill: '#f97316'
        }
      ];

      setBreakdown({
        totalRevenue,
        totalCommissionPaid,
        totalCommissionPending,
        commissionRate,
        totalMerchants: merchantList.length,
        activeMerchants: merchantList.filter(m => m.status === 'active').length,
        chartData,
        statusBreakdown
      });
    } catch (error) {
      console.error('Error loading commission data:', error);
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

  if (!breakdown) {
    return <div className="text-center text-gray-500 py-12">No data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-500">Total Merchant Sales</p>
              <p className="text-2xl font-bold">${breakdown.totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
              <p className="text-xs text-gray-400 mt-1">POS sales across network</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-500">Total Commission Paid</p>
              <p className="text-2xl font-bold text-green-600">${breakdown.totalCommissionPaid.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
              <p className="text-xs text-gray-400 mt-1">{breakdown.commissionRate}% of subscription revenue</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-500">Total Merchants</p>
              <p className="text-2xl font-bold">{breakdown.totalMerchants}</p>
              <p className="text-xs text-gray-400 mt-1">{breakdown.activeMerchants} active</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-500">Avg Revenue/Merchant</p>
              <p className="text-2xl font-bold">
                ${(breakdown.totalRevenue / breakdown.totalMerchants || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-gray-400 mt-1">Per merchant</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Top Merchants */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Merchants by Revenue</CardTitle>
          <CardDescription>Top revenue-contributing merchants (commission is earned on subscription fees)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={breakdown.chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} interval={0} />
              <YAxis label={{ value: 'Sales ($)', angle: -90, position: 'insideLeft' }} />
              <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
              <Legend />
              <Bar dataKey="revenue" fill="#3b82f6" name="Merchant Sales" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Merchant Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Merchant Status Distribution</CardTitle>
          <CardDescription>How many merchants in each status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={breakdown.statusBreakdown.filter(s => s.value > 0)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {breakdown.statusBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              {breakdown.statusBreakdown.map((status) => (
                <div key={status.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.fill }} />
                    <span className="text-sm font-medium">{status.name}</span>
                  </div>
                  <Badge variant="outline">{status.value}</Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}