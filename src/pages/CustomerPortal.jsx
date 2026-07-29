import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import PortalProfile from '@/components/portal/PortalProfile';
import PortalBilling from '@/components/portal/PortalBilling';
import PortalSupport from '@/components/portal/PortalSupport';
import PortalRecentOrders from '@/components/portal/PortalRecentOrders';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import {
  LayoutDashboard,
  Settings,
  Monitor,
  Package,
  BarChart3,
  ShoppingCart,
  DollarSign,
  Clock,
} from 'lucide-react';

export default function CustomerPortal() {
  const [pinUser, setPinUser] = useState(null);
  const [stats, setStats] = useState({ revenue: 0, orders: 0, outstanding: 0, loading: true });
  const { toast } = useToast();

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('pinLoggedInUser') || 'null');
      setPinUser(u);
      if (!u || !u.merchant_id) {
        window.location.href = createPageUrl('Login');
      }
    } catch {
      window.location.href = createPageUrl('Login');
    }
  }, []);

  const merchantId = pinUser?.merchant_id;
  const merchantName = pinUser?.merchant_name || 'Your Business';

  useEffect(() => {
    if (!merchantId) return;
    (async () => {
      try {
        const [orders, invoices] = await Promise.all([
          base44.entities.Order.filter({ merchant_id: merchantId }, '-created_date', 50),
          base44.entities.Invoice.filter({ merchant_id: merchantId }, '-created_date', 50),
        ]);
        const revenue = (orders || []).reduce((s, o) => s + (o.total || 0), 0);
        const outstanding = (invoices || [])
          .filter((i) => i.status === 'sent' || i.status === 'overdue')
          .reduce((s, i) => s + (i.amount || 0), 0);
        setStats({ revenue, orders: orders?.length || 0, outstanding, loading: false });
      } catch (e) {
        setStats((s) => ({ ...s, loading: false }));
      }
    })();
  }, [merchantId]);

  if (!merchantId) return null;

  const quickLinks = [
    { label: 'POS Terminal', icon: Monitor, page: 'POS' },
    { label: 'Inventory', icon: Package, page: 'Inventory' },
    { label: 'Reports', icon: BarChart3, page: 'Reports' },
    { label: 'Settings', icon: Settings, page: 'Settings' },
  ];

  const statCards = [
    {
      label: 'Total Revenue',
      value: stats.loading ? '…' : `$${stats.revenue.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-green-600 bg-green-50',
    },
    {
      label: 'Total Orders',
      value: stats.loading ? '…' : stats.orders.toLocaleString(),
      icon: ShoppingCart,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Outstanding Balance',
      value: stats.loading ? '…' : `$${stats.outstanding.toFixed(2)}`,
      icon: Clock,
      color: stats.outstanding > 0 ? 'text-red-600 bg-red-50' : 'text-gray-600 bg-gray-50',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-blue-600" /> Customer Portal
          </h1>
          <p className="text-gray-500 text-sm">{merchantName}</p>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-3 rounded-lg ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">{label}</p>
                <p className="text-xl font-bold text-gray-900">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickLinks.map(({ label, icon: Icon, page }) => (
          <Link key={page} to={createPageUrl(page)}>
            <Button variant="outline" className="w-full justify-start">
              <Icon className="w-4 h-4 mr-2" /> {label}
            </Button>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PortalProfile merchantId={merchantId} />
        <PortalBilling merchantId={merchantId} />
        <PortalRecentOrders merchantId={merchantId} />
        <PortalSupport merchantId={merchantId} />
      </div>
    </div>
  );
}