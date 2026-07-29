import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import PortalProfile from '@/components/portal/PortalProfile';
import PortalBilling from '@/components/portal/PortalBilling';
import PortalSupport from '@/components/portal/PortalSupport';
import PortalRecentOrders from '@/components/portal/PortalRecentOrders';
import { LayoutDashboard, Settings, Monitor, Package, BarChart3 } from 'lucide-react';

export default function CustomerPortal() {
  const [pinUser, setPinUser] = useState(null);

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

  if (!merchantId) return null;

  const quickLinks = [
    { label: 'POS Terminal', icon: Monitor, page: 'POS' },
    { label: 'Inventory', icon: Package, page: 'Inventory' },
    { label: 'Reports', icon: BarChart3, page: 'Reports' },
    { label: 'Settings', icon: Settings, page: 'Settings' },
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