import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, DollarSign, ShoppingCart, TrendingUp, Package } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function SalesReport({ orders, products, customers, dateRange, loading, selectedEmployee, selectedDepartment }) {
  // Only completed (paid) orders represent realized revenue.
  const revenueOrders = orders.filter(o => o.status === 'completed');

  const calculateMetrics = () => {
    const totalRevenue = revenueOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const totalOrders = revenueOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const totalItems = revenueOrders.reduce((sum, order) => 
      sum + (order.items?.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0) || 0), 0
    );

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      totalItems
    };
  };

  const getDailySales = () => {
    const salesByDate = {};
    revenueOrders.forEach(order => {
      const date = new Date(order.created_date).toLocaleDateString();
      if (!salesByDate[date]) {
        salesByDate[date] = { date, revenue: 0, orders: 0 };
      }
      salesByDate[date].revenue += order.total || 0;
      salesByDate[date].orders += 1;
    });
    return Object.values(salesByDate).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const getTopProducts = () => {
    const productSales = {};
    revenueOrders.forEach(order => {
      order.items?.forEach(item => {
        if (!productSales[item.product_id]) {
          productSales[item.product_id] = {
            name: item.product_name,
            quantity: 0,
            revenue: 0
          };
        }
        productSales[item.product_id].quantity += item.quantity || 0;
        productSales[item.product_id].revenue += item.item_total || 0;
      });
    });
    return Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  };

  const getPaymentMethodBreakdown = () => {
    const breakdown = {};
    revenueOrders.forEach(order => {
      const method = order.payment_method || 'unknown';
      if (!breakdown[method]) {
        breakdown[method] = { name: method, value: 0, count: 0 };
      }
      breakdown[method].value += order.total || 0;
      breakdown[method].count += 1;
    });
    return Object.values(breakdown);
  };

  const exportToCSV = () => {
    const metrics = calculateMetrics();
    const headers = ["Metric", "Value"];
    const metricRows = [
      ["Total Revenue", `$${metrics.totalRevenue.toFixed(2)}`],
      ["Total Orders", metrics.totalOrders],
      ["Average Order Value", `$${metrics.avgOrderValue.toFixed(2)}`],
      ["Total Items Sold", metrics.totalItems],
      ["", ""],
      ["Order Details", ""],
      ["Order #", "Date", "Customer", "Total", "Status", "Payment Method"]
    ];

    const orderRows = orders.map(order => [
      order.order_number,
      new Date(order.created_date).toLocaleString(),
      order.customer_name || 'Guest',
      `$${(order.total || 0).toFixed(2)}`,
      order.status,
      order.payment_method || 'N/A'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + 
      [...metricRows, ...orderRows].map(row => row.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sales_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const metrics = calculateMetrics();
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Sales Report', 14, 20);
    
    doc.setFontSize(12);
    doc.text(`Period: ${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`, 14, 30);
    
    doc.setFontSize(14);
    doc.text('Key Metrics', 14, 45);
    
    let y = 55;
    doc.setFontSize(10);
    doc.text(`Total Revenue: $${metrics.totalRevenue.toFixed(2)}`, 14, y);
    doc.text(`Total Orders: ${metrics.totalOrders}`, 14, y + 7);
    doc.text(`Average Order Value: $${metrics.avgOrderValue.toFixed(2)}`, 14, y + 14);
    doc.text(`Total Items Sold: ${metrics.totalItems}`, 14, y + 21);

    doc.save(`sales_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const metrics = calculateMetrics();
  const dailySales = getDailySales();
  const topProducts = getTopProducts();
  const paymentBreakdown = getPaymentMethodBreakdown();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading sales data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Export Buttons */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={exportToCSV} className="dark:border-gray-600 dark:text-white">
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
        <Button variant="outline" onClick={exportToPDF} className="dark:border-gray-600 dark:text-white">
          <Download className="w-4 h-4 mr-2" /> Export PDF
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium dark:text-gray-200">Total Revenue</CardTitle>
            <DollarSign className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold dark:text-white">${metrics.totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium dark:text-gray-200">Total Orders</CardTitle>
            <ShoppingCart className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold dark:text-white">{metrics.totalOrders}</div>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium dark:text-gray-200">Avg Order Value</CardTitle>
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold dark:text-white">${metrics.avgOrderValue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium dark:text-gray-200">Items Sold</CardTitle>
            <Package className="w-4 h-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold dark:text-white">{metrics.totalItems}</div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Sales Trend */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="dark:text-white">Daily Sales Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailySales}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#8884d8" name="Revenue ($)" />
              <Line type="monotone" dataKey="orders" stroke="#82ca9d" name="Orders" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="dark:text-white">Top 10 Products by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" fill="#8884d8" name="Revenue ($)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Method Breakdown */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="dark:text-white">Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={paymentBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={entry => `${entry.name}: $${entry.value.toFixed(0)}`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {paymentBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}