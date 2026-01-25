import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, Users, ShoppingCart } from 'lucide-react';

export default function DealerAnalytics({ dealerId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMerchants: 0,
    activeMerchants: 0,
    totalRevenue: 0,
    totalOrders: 0
  });

  useEffect(() => {
    loadAnalytics();
  }, [dealerId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const merchants = await base44.entities.Merchant.filter({ dealer_id: dealerId });

      const stats = {
        totalMerchants: merchants.length,
        activeMerchants: merchants.filter(m => m.status === 'active').length,
        totalRevenue: merchants.reduce((sum, m) => sum + (m.total_revenue || 0), 0),
        totalOrders: merchants.reduce((sum, m) => sum + (m.total_orders || 0), 0)
      };

      setStats(stats);

      // Generate chart data
      const chartData = merchants.map(m => ({
        name: m.business_name.substring(0, 15),
        revenue: m.total_revenue || 0,
        orders: m.total_orders || 0
      }));

      setData(chartData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-8">Loading analytics...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Merchants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMerchants}</div>
            <p className="text-xs text-gray-500 mt-1">{stats.activeMerchants} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg per Merchant</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.totalMerchants > 0 ? (stats.totalRevenue / stats.totalMerchants).toLocaleString() : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {data && data.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Merchant</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Orders by Merchant</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="orders" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}