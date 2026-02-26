import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

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
import ChipManagement from '../components/superadmin/ChipManagement';
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
import BuilderManagement from '../components/superadmin/BuilderManagement';

export default function SuperAdminPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
      let currentUser = null;

      // For SuperAdmin, ALWAYS require proper base44 auth (not just PIN)
      // PIN login alone is insufficient for admin access
      try {
        currentUser = await base44.auth.me();
      } catch (authError) {
        console.log('Not authenticated via base44:', authError);
        alert('You must be properly authenticated to access SuperAdmin. Please log in with your credentials.');
        window.location.href = createPageUrl('PinLogin');
        return;
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
        activeMerchants: merchants.filter(m => (m.status === 'active' || m.status === 'trial') && !m.is_demo).length,
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

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-shrink-0 fixed h-full overflow-y-auto z-40 transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-red-600" />
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">Super Admin</h1>
              {user && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {user.email}
                </p>
              )}
            </div>
          </div>
        </div>

        <nav className="p-2">
          <button
            onClick={() => handleTabChange('pending')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left mb-1 ${
              activeTab === 'pending'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span className="text-sm font-medium">Pending</span>
          </button>
          <button
            onClick={() => handleTabChange('merchants')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left mb-1 ${
              activeTab === 'merchants'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">Merchants</span>
          </button>
          <button
            onClick={() => handleTabChange('dealers')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left mb-1 ${
              activeTab === 'dealers'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span className="text-sm font-medium">Ambassadors</span>
          </button>
          <button
            onClick={() => handleTabChange('subscriptions')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left mb-1 ${
              activeTab === 'subscriptions'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span className="text-sm font-medium">Subscriptions</span>
          </button>
          <button
            onClick={() => handleTabChange('devices')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left mb-1 ${
              activeTab === 'devices'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Package className="w-4 h-4" />
            <span className="text-sm font-medium">Device Shop</span>
          </button>
          <button
            onClick={() => handleTabChange('amazon')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left mb-1 ${
              activeTab === 'amazon'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Package className="w-4 h-4" />
            <span className="text-sm font-medium">Amazon</span>
          </button>
          <button
            onClick={() => handleTabChange('vault')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left mb-1 ${
              activeTab === 'vault'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Vault className="w-4 h-4" />
            <span className="text-sm font-medium">Vault</span>
          </button>
          <button
            onClick={() => handleTabChange('chips')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left mb-1 ${
              activeTab === 'chips'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span className="text-sm font-medium">Chips</span>
          </button>
          <button
            onClick={() => handleTabChange('builders')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left mb-1 ${
              activeTab === 'builders'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">Builders</span>
          </button>
          <button
            onClick={() => handleTabChange('logs')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left mb-1 ${
              activeTab === 'logs'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium">Logs</span>
          </button>
          <button
            onClick={() => handleTabChange('reports')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left mb-1 ${
              activeTab === 'reports'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium">Reports</span>
          </button>
          <button
            onClick={() => handleTabChange('ads')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left mb-1 ${
              activeTab === 'ads'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span className="text-sm font-medium">Ads</span>
          </button>
          <button
            onClick={() => handleTabChange('notifications')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left mb-1 ${
              activeTab === 'notifications'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Notifications</span>
          </button>
          <button
            onClick={() => handleTabChange('settings')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left mb-1 ${
              activeTab === 'settings'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm font-medium">Settings</span>
          </button>

          <div className="border-t border-gray-200 dark:border-gray-700 my-2 pt-2">
            <button
              onClick={() => window.location.href = createPageUrl('Home')}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left mb-1 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Home className="w-4 h-4" />
              <span className="text-sm font-medium">Home</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 md:ml-64">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 shadow-sm">
          <div className="px-4 md:px-6 py-4 flex items-center gap-3">
            <button
              className="md:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
              onClick={() => setSidebarOpen(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {activeTab === 'pending' && 'Pending Merchants'}
              {activeTab === 'merchants' && 'Merchant Management'}
              {activeTab === 'dealers' && 'Ambassador Management'}
              {activeTab === 'subscriptions' && 'Subscription Management'}
              {activeTab === 'devices' && 'Device Shop'}
              {activeTab === 'amazon' && 'Amazon Affiliate'}
              {activeTab === 'vault' && '$DUC Vault'}
              {activeTab === 'chips' && 'Chip Manager'}
              {activeTab === 'builders' && 'Builder Management'}
              {activeTab === 'logs' && 'System Logs'}
              {activeTab === 'reports' && 'Global Reports'}
              {activeTab === 'ads' && 'Advertising'}
              {activeTab === 'notifications' && 'Notifications'}
              {activeTab === 'settings' && 'Settings'}
            </h2>
          </div>
        </div>

        <div className="p-4 md:p-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Merchants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalMerchants}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{stats.activeMerchants} active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 dark:text-green-500">{stats.activeSubscriptions}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Currently active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue (Active Subs)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">${stats.totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400">From active subscriptions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 dark:text-green-500">Online</div>
              <p className="text-xs text-gray-500 dark:text-gray-400">All services operational</p>
            </CardContent>
          </Card>
        </div>

          {/* Tab Content */}
          {activeTab === 'pending' && (
            <PendingMerchants />
          )}

          {activeTab === 'merchants' && (
            <MerchantManagement />
          )}

          {activeTab === 'dealers' && (
            <DealerManagement />
          )}

          {activeTab === 'subscriptions' && (
            <SubscriptionManagement />
          )}

          {activeTab === 'devices' && (
            <DeviceShopManagement />
          )}

          {activeTab === 'amazon' && (
            <AmazonAffiliateManager />
          )}

          {activeTab === 'vault' && (
            <VaultManager />
          )}

          {activeTab === 'chips' && (
            <ChipManagement />
          )}

          {activeTab === 'builders' && (
            <BuilderManagement />
          )}

          {activeTab === 'logs' && (
            <SystemLogs />
          )}

          {activeTab === 'reports' && (
            <GlobalReports />
          )}

          {activeTab === 'ads' && (
            <AdvertisementManager />
          )}

          {activeTab === 'notifications' && (
            <NotificationManager />
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}