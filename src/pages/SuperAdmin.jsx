import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Shield,
  Users,
  Building2,
  CreditCard,
  Package,
  FileText,
  Settings,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Key,
  LogOut,
  Home,
  UserPlus,
  Cpu,
  Vault
} from 'lucide-react';
import { createPageUrl } from '@/utils';

import MerchantManagement from '../components/superadmin/MerchantManagement';
import ChipManager from '../components/superadmin/ChipManager';
import SubscriptionManagement from '../components/superadmin/SubscriptionManagement';
import DeviceShopManagement from '../components/superadmin/DeviceShopManagement';
import SystemLogs from '../components/superadmin/SystemLogs';
import GlobalReports from '../components/superadmin/GlobalReports';
import SubscriptionPlansManager from '../components/superadmin/SubscriptionPlansManager';
import PaymentSettingsManager from '../components/superadmin/PaymentSettingsManager';
import AdvertisementManager from '../components/superadmin/AdvertisementManager';
import LandingPageEditor from '../components/superadmin/LandingPageEditor';
import NotificationManager from '../components/superadmin/NotificationManager';
import DealerLandingEditor from '../components/superadmin/DealerLandingEditor';
import DemoMenuManager from '../components/superadmin/DemoMenuManager';
import DealerManagement from '../components/rootadmin/DealerManagement';
import PendingMerchants from '../components/superadmin/PendingMerchants';
import AmazonAffiliateManager from '../components/superadmin/AmazonAffiliateManager';
import VaultManager from '../components/superadmin/VaultManager';

export default function SuperAdminPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMerchants: 0,
    activeMerchants: 0,
    totalRevenue: 0,
    activeSubscriptions: 0
  });

  // PIN Reset Tool State
  const [resetEmail, setResetEmail] = useState('');
  const [resetPin, setResetPin] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');

  // Password Reset Tool State
  const [passwordResetEmail, setPasswordResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);
  const [passwordResetMessage, setPasswordResetMessage] = useState('');
  const [passwordResetError, setPasswordResetError] = useState('');

  useEffect(() => {
    loadUser();
    loadStats();
  }, []);

  const loadUser = async () => {
    try {
      const pinUserJSON = localStorage.getItem('pinLoggedInUser');
      let currentUser = null;

      if (pinUserJSON) {
        try {
          currentUser = JSON.parse(pinUserJSON);
        } catch (e) {
          console.error('Error parsing pinLoggedInUser from localStorage:', e);
          localStorage.removeItem('pinLoggedInUser');
        }
      }

      if (!currentUser) {
        currentUser = await base44.auth.me();
      }

      console.log('SuperAdmin user:', currentUser);

      if (!currentUser || (currentUser.role !== 'super_admin' && currentUser.role !== 'admin' && currentUser.role !== 'root_admin')) {
        alert('Access denied. Super admin privileges required.');
        window.location.href = createPageUrl('Home');
        return;
      }

      setUser(currentUser);
    } catch (error) {
      console.error('Error loading user:', error);
      alert('Authentication error. Please log in again.');
      window.location.href = createPageUrl('PinLogin');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const merchants = await base44.entities.Merchant.list();
      const subscriptions = await base44.entities.Subscription.filter({ status: 'active' });

      const totalRevenue = subscriptions.reduce((sum, sub) => sum + (sub.price || 0), 0);

      setStats({
        totalMerchants: merchants.length,
        activeMerchants: merchants.filter(m => m.status === 'active' || m.status === 'trial').length,
        totalRevenue: totalRevenue,
        activeSubscriptions: subscriptions.length
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleResetPin = async () => {
    if (!resetEmail) {
      setResetError('Please enter an email address');
      return;
    }

    setResetLoading(true);
    setResetError('');
    setResetMessage('');

    try {
      const { data } = await base44.functions.invoke('resetAdminPin', {
        email: resetEmail,
        new_pin: resetPin || undefined
      });

      if (data && data.success) {
        setResetMessage(`PIN updated successfully!\n\nEmail: ${data.email}\nNew PIN: ${data.new_pin}\nRole: ${data.role}\n\nPlease save this PIN securely.`);
        setResetEmail('');
        setResetPin('');
      } else {
        setResetError(data?.error || 'Failed to reset PIN. No data or success was returned.');
      }
    } catch (error) {
      console.error('PIN reset error:', error);
      setResetError(error.message || 'Failed to reset PIN due to an unexpected error.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!passwordResetEmail) {
      setPasswordResetError('Please enter an email address');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setPasswordResetError('Password must be at least 6 characters');
      return;
    }

    setPasswordResetLoading(true);
    setPasswordResetError('');
    setPasswordResetMessage('');

    try {
      const { data } = await base44.functions.invoke('resetUserPassword', {
        email: passwordResetEmail,
        new_password: newPassword
      });

      if (data && data.success) {
        setPasswordResetMessage(`Password updated successfully!\n\nEmail: ${data.email}\nRole: ${data.role}\n\nThe user can now login with their new password.`);
        setPasswordResetEmail('');
        setNewPassword('');
      } else {
        setPasswordResetError(data?.error || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      setPasswordResetError(error.message || 'Failed to reset password');
    } finally {
      setPasswordResetLoading(false);
    }
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      localStorage.removeItem('pinLoggedInUser');
      base44.auth.logout(createPageUrl('Home'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-red-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Super Admin Dashboard</h1>
                {user && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Logged in as: {user.email} ({user.role})
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = createPageUrl('Home')}
              >
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Merchants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalMerchants}</div>
              <p className="text-xs text-muted-foreground">{stats.activeMerchants} active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.activeSubscriptions}</div>
              <p className="text-xs text-muted-foreground">Currently active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue (Active Subs)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">From active subscriptions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">Online</div>
              <p className="text-xs text-muted-foreground">All services operational</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-12 gap-2 w-full">
            <TabsTrigger value="pending">
              <UserPlus className="w-4 h-4 mr-2" />
              Pending
            </TabsTrigger>
            <TabsTrigger value="merchants">
              <Users className="w-4 h-4 mr-2" />
              Merchants
            </TabsTrigger>
            <TabsTrigger value="dealers">
              <Building2 className="w-4 h-4 mr-2" />
              Dealers
            </TabsTrigger>
            <TabsTrigger value="subscriptions">
              <CreditCard className="w-4 h-4 mr-2" />
              Subscriptions
            </TabsTrigger>
            <TabsTrigger value="devices">
              <Package className="w-4 h-4 mr-2" />
              Device Shop
            </TabsTrigger>
            <TabsTrigger value="amazon">
              <Package className="w-4 h-4 mr-2" />
              Amazon
            </TabsTrigger>
            <TabsTrigger value="vault">
              <Vault className="w-4 h-4 mr-2" />
              Vault
            </TabsTrigger>
            <TabsTrigger value="chips">
              <Cpu className="w-4 h-4 mr-2" />
              Chips
            </TabsTrigger>
            <TabsTrigger value="logs">
              <FileText className="w-4 h-4 mr-2" />
              Logs
            </TabsTrigger>
            <TabsTrigger value="reports">
              <TrendingUp className="w-4 h-4 mr-2" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="ads">
              <Building2 className="w-4 h-4 mr-2" />
              Ads
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Building2 className="w-4 h-4 mr-2" />
              Notify
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <PendingMerchants />
          </TabsContent>

          <TabsContent value="merchants">
            <MerchantManagement />
          </TabsContent>

          <TabsContent value="dealers">
            <DealerManagement />
          </TabsContent>

          <TabsContent value="subscriptions">
            <SubscriptionManagement />
          </TabsContent>

          <TabsContent value="devices">
            <DeviceShopManagement />
          </TabsContent>

          <TabsContent value="amazon">
            <AmazonAffiliateManager />
          </TabsContent>

          <TabsContent value="vault">
            <VaultManager />
          </TabsContent>

          <TabsContent value="chips">
            <ChipManager />
          </TabsContent>

          <TabsContent value="logs">
            <SystemLogs />
          </TabsContent>

          <TabsContent value="reports">
            <GlobalReports />
          </TabsContent>

          <TabsContent value="ads">
            <AdvertisementManager />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationManager />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            {/* PIN Reset Tool */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  PIN Reset Tool
                </CardTitle>
                <CardDescription>
                  Reset PIN for any user account (including admin accounts)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {resetError && (
                  <Alert className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <AlertDescription className="text-red-800 dark:text-red-300">{resetError}</AlertDescription>
                  </Alert>
                )}

                {resetMessage && (
                  <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <AlertDescription className="text-green-800 dark:text-green-300 whitespace-pre-wrap">{resetMessage}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="reset-email">User Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="user@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    disabled={resetLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reset-pin">New PIN (optional - leave empty for random)</Label>
                  <Input
                    id="reset-pin"
                    type="text"
                    placeholder="1234"
                    maxLength={4}
                    value={resetPin}
                    onChange={(e) => setResetPin(e.target.value.replace(/\D/g, ''))}
                    disabled={resetLoading}
                  />
                  <p className="text-sm text-gray-500">Leave empty to generate a random 4-digit PIN</p>
                </div>

                <Button
                  onClick={handleResetPin}
                  disabled={resetLoading || !resetEmail}
                  className="w-full"
                >
                  {resetLoading ? 'Resetting PIN...' : 'Reset PIN'}
                </Button>
              </CardContent>
            </Card>

            {/* Password Reset Tool */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  Password Reset Tool
                </CardTitle>
                <CardDescription>
                  Reset password for any user account (for email/password login)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {passwordResetError && (
                  <Alert className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <AlertDescription className="text-red-800 dark:text-red-300">{passwordResetError}</AlertDescription>
                  </Alert>
                )}

                {passwordResetMessage && (
                  <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <AlertDescription className="text-green-800 dark:text-green-300 whitespace-pre-wrap">{passwordResetMessage}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password-reset-email">User Email</Label>
                  <Input
                    id="password-reset-email"
                    type="email"
                    placeholder="user@example.com"
                    value={passwordResetEmail}
                    onChange={(e) => setPasswordResetEmail(e.target.value)}
                    disabled={passwordResetLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Enter new password (min 6 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={passwordResetLoading}
                    minLength={6}
                  />
                  <p className="text-sm text-gray-500">Password must be at least 6 characters</p>
                </div>

                <Button
                  onClick={handleResetPassword}
                  disabled={passwordResetLoading || !passwordResetEmail || !newPassword}
                  className="w-full"
                >
                  {passwordResetLoading ? 'Resetting Password...' : 'Reset Password'}
                </Button>
              </CardContent>
            </Card>

            {/* Other Settings components */}
            <SubscriptionPlansManager />
            <PaymentSettingsManager />
            <LandingPageEditor />
            <DealerLandingEditor />
            <DemoMenuManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}