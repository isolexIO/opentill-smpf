import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, ShoppingCart, AlertCircle } from 'lucide-react';

export default function MerchantAnalytics({ dealerId }) {
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMerchantAnalytics();
  }, [dealerId]);

  const loadMerchantAnalytics = async () => {
    try {
      const data = await base44.entities.Merchant.filter({ dealer_id: dealerId });
      setMerchants(data || []);
    } catch (error) {
      console.error('Error loading merchant analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-8">Loading analytics...</div>;

  const totalRevenue = merchants.reduce((sum, m) => sum + (m.total_revenue || 0), 0);
  const activeCount = merchants.filter(m => m.status === 'active').length;
  const suspendedCount = merchants.filter(m => m.status === 'suspended').length;
  const avgRevenue = merchants.length ? (totalRevenue / merchants.length).toFixed(2) : 0;

  const chartData = merchants.map(m => ({
    name: m.business_name.substring(0, 12),
    revenue: m.total_revenue || 0,
    orders: m.total_orders || 0
  })).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">All merchants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">Active Merchants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-gray-500 mt-1">Processing transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">Avg Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgRevenue}</div>
            <p className="text-xs text-gray-500 mt-1">Per merchant</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">Suspended</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{suspendedCount}</div>
            <p className="text-xs text-gray-500 mt-1">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Top Merchants by Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Merchant Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="revenue" fill="#10b981" name="Revenue ($)" />
                  <Bar yAxisId="right" dataKey="orders" fill="#8b5cf6" name="Orders" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}