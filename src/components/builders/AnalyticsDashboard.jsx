import React from 'react';
import { CardContent } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

export default function AnalyticsDashboard({ submissions, builder }) {
  // Prepare data for charts
  const categoryData = submissions
    .filter((s) => s.status === 'published')
    .reduce((acc, chip) => {
      const existing = acc.find((item) => item.category === chip.category);
      if (existing) {
        existing.sales += chip.total_sales || 0;
        existing.revenue += chip.total_revenue || 0;
      } else {
        acc.push({
          category: chip.category,
          sales: chip.total_sales || 0,
          revenue: chip.total_revenue || 0,
        });
      }
      return acc;
    }, []);

  const topChips = submissions
    .filter((s) => s.status === 'published')
    .sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0))
    .slice(0, 5)
    .map((chip) => ({
      name: chip.name.substring(0, 20),
      sales: chip.total_sales || 0,
      revenue: chip.total_revenue || 0,
    }));

  const pieData = submissions
    .filter((s) => s.status === 'published')
    .map((chip) => ({
      name: chip.name.substring(0, 15),
      value: chip.total_sales || 0,
    }));

  return (
    <CardContent className="p-6 space-y-8">
      {submissions.filter((s) => s.status === 'published').length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No published Chips yet. Publish your first Chip to see analytics.</p>
        </div>
      ) : (
        <>
          {/* Revenue by Category */}
          {categoryData.length > 0 && (
            <div>
              <h3 className="font-bold text-gray-900 mb-4">Revenue by Category</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#3b82f6" name="Revenue ($)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top Chips */}
          {topChips.length > 0 && (
            <div>
              <h3 className="font-bold text-gray-900 mb-4">Top Performing Chips</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topChips} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" />
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#8b5cf6" name="Revenue ($)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Sales Distribution */}
          {pieData.length > 0 && (
            <div>
              <h3 className="font-bold text-gray-900 mb-4">Sales Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </CardContent>
  );
}