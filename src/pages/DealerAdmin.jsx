import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createPageUrl } from '@/utils';
import {
  Store,
  Users,
  BarChart3,
  Settings,
  Bell,
  TrendingUp
} from 'lucide-react';
import DealerMerchantManagement from '../components/dealer-admin/DealerMerchantManagement';
import DealerAnalytics from '../components/dealer-admin/DealerAnalytics';
import DealerNotifications from '../components/dealer-admin/DealerNotifications';
import DealerPaymentSettings from '../components/dealer-admin/DealerPaymentSettings';
import DealerStaffManagement from '../components/dealer-admin/DealerStaffManagement';

export default function DealerAdminPage() {
  const [dealer, setDealer] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDealerData();
  }, []);

  const loadDealerData = async () => {
    try {
      setLoading(true);
      const user = await base44.auth.me();

      // Restrict to dealer_admin role
      if (!user || (user.role !== 'dealer_admin' && user.role !== 'admin')) {
        window.location.href = createPageUrl('Home');
        return;
      }

      setCurrentUser(user);

      // Load dealer data
      const dealers = await base44.entities.Dealer.filter({ id: user.dealer_id });
      if (dealers.length === 0) throw new Error('Dealer not found');
      
      setDealer(dealers[0]);
    } catch (error) {
      console.error('Error loading dealer data:', error);
      window.location.href = createPageUrl('Home');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!dealer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Unable to load dealer information.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {dealer.name} Administration
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage merchants, staff, and settings
          </p>
        </div>

        <Tabs defaultValue="merchants" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
            <TabsTrigger value="merchants">
              <Store className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Merchants</span>
            </TabsTrigger>
            <TabsTrigger value="staff">
              <Users className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Staff</span>
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="payments">
              <TrendingUp className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Payments</span>
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="merchants">
            <DealerMerchantManagement dealerId={dealer.id} />
          </TabsContent>

          <TabsContent value="staff">
            <DealerStaffManagement dealerId={dealer.id} />
          </TabsContent>

          <TabsContent value="analytics">
            <DealerAnalytics dealerId={dealer.id} />
          </TabsContent>

          <TabsContent value="notifications">
            <DealerNotifications dealerId={dealer.id} />
          </TabsContent>

          <TabsContent value="payments">
            <DealerPaymentSettings dealerId={dealer.id} />
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Dealer Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Dealer Name</label>
                      <p className="text-gray-600">{dealer.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Commission Rate</label>
                      <p className="text-gray-600">{dealer.commission_percent}%</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Status</label>
                      <p className="text-gray-600 capitalize">{dealer.status}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}