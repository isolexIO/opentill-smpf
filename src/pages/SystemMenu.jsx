import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  ShoppingCart,
  Package,
  Users,
  Settings,
  BarChart3,
  CreditCard,
  Smartphone,
  Globe,
  Store,
  HelpCircle,
  ShoppingBag,
  LifeBuoy,
  AlertCircle,
  Crown,
  Clock,
  DollarSign,
  Zap,
  Layers,
  Link2,
  Monitor,
  Receipt,
  FileText,
  UserCircle,
  LayoutGrid,
  Box,
  Shield,
  MessageCircle,
  Building2,
  Gift,
  Sparkles,
  Cpu,
  Vault,
  Lightbulb
} from 'lucide-react';
import AdvertisingTile from '../components/system-menu/AdvertisingTile';
import CommunityLinks from '../components/shared/CommunityLinks';

export default function SystemMenu() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPinUserLoggedIn, setIsPinUserLoggedIn] = useState(false);
  const [stats, setStats] = useState({
    pendingOrders: 0,
    lowStockItems: 0,
    openTickets: 0,
    todaySales: 0
  });
  const [hasWebsite, setHasWebsite] = useState(false);

  useEffect(() => {
    loadUser();
    loadStats();
  }, []);

  const loadUser = async () => {
    try {
      const pinUserJSON = localStorage.getItem('pinLoggedInUser');
      let userData = null;

      if (pinUserJSON) {
        try {
          userData = JSON.parse(pinUserJSON);
          setIsPinUserLoggedIn(true);
        } catch (e) {
          console.error('Error parsing pinLoggedInUser:', e);
          localStorage.removeItem('pinLoggedInUser');
        }
      }

      if (!userData) {
        userData = await base44.auth.me();
        setIsPinUserLoggedIn(false);
      }

      setUser(userData);
    } catch (error) {
      console.error('Error loading user:', error);
      setIsPinUserLoggedIn(false);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const pinUserJSON = localStorage.getItem('pinLoggedInUser');
      let currentUser = null;

      if (pinUserJSON) {
        try {
          currentUser = JSON.parse(pinUserJSON);
        } catch (e) {
          console.error('Error parsing user:', e);
        }
      }

      if (!currentUser) {
        currentUser = await base44.auth.me();
      }

      if (!currentUser?.merchant_id) return;

      // Check if merchant has generated any websites
      try {
        const websites = await base44.entities.GeneratedWebsite.filter({
          merchant_id: currentUser.merchant_id
        });
        setHasWebsite(websites.length > 0);
      } catch (error) {
        console.log('No generated website found');
      }

      const orders = await base44.entities.Order.filter({
        merchant_id: currentUser.merchant_id,
        status: { $in: ['pending', 'processing'] }
      });

      const products = await base44.entities.Product.filter({
        merchant_id: currentUser.merchant_id,
        is_active: true
      });
      const lowStock = products.filter(p => p.stock_quantity <= p.low_stock_alert);

      const tickets = await base44.entities.SupportTicket.filter({
        merchant_id: currentUser.merchant_id,
        status: { $in: ['open', 'in_progress'] }
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayOrders = await base44.entities.Order.filter({
        merchant_id: currentUser.merchant_id,
        status: 'completed',
        created_date: { $gte: today.toISOString() }
      });
      const todaySales = todayOrders.reduce((sum, order) => sum + (order.total || 0), 0);

      setStats({
        pendingOrders: orders.length,
        lowStockItems: lowStock.length,
        openTickets: tickets.length,
        todaySales: todaySales.toFixed(2)
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const hasPermission = (permission) => {
    if (permission === null) return true;
    if (!user) return false;
    // Super admin, root admin, dealer admin, and merchant admin have all permissions
    if (user.role === 'super_admin' || user.role === 'admin' || user.role === 'root_admin' || user.role === 'dealer_admin' || user.role === 'merchant_admin') return true;
    return user.permissions?.includes(permission);
  };

  const isSuperAdmin = () => {
    return user && (user.role === 'super_admin' || user.role === 'admin' || user.role === 'root_admin');
  };

  const isDealerAdmin = () => {
    return user && user.role === 'dealer_admin';
  };

  const handleClockOut = () => {
    if (confirm('Are you sure you want to clock out?')) {
      localStorage.removeItem('pinLoggedInUser');
      window.location.href = createPageUrl('Home');
    }
  };

  const handleMerchantLogout = async () => {
    if (confirm('Are you sure you want to log out of your merchant account?')) {
      try {
        localStorage.removeItem('pinLoggedInUser');
        await base44.auth.logout(createPageUrl('Home'));
      } catch (error) {
        console.error('Merchant Logout error:', error);
        localStorage.removeItem('pinLoggedInUser');
        window.location.href = createPageUrl('Home');
      }
    }
  };

  const getDealerTile = () => {
    if (isDealerAdmin()) {
      return {
        id: 'dealer_dashboard',
        icon: <Building2 className="w-6 h-6" />,
        title: 'Dealer Dashboard',
        description: 'Manage merchants and commissions',
        path: 'DealerDashboard',
        color: 'from-purple-500 to-pink-500',
        permission: null
      };
    }
    return null;
  };

  const getSuperAdminTile = () => {
    if (isSuperAdmin()) {
      return {
        id: 'super_admin',
        icon: <Shield className="w-6 h-6" />,
        title: 'Super Admin',
        description: 'Platform management',
        path: 'SuperAdmin',
        color: 'from-red-600 to-red-700',
        permission: 'super_admin_only'
      };
    }
    return null;
  };

  const baseMenuItems = [
    {
      id: 'pos',
      icon: <CreditCard className="w-6 h-6" />,
      title: 'Point of Sale',
      description: 'Process orders and payments',
      path: 'POS',
      color: 'from-blue-500 to-blue-600',
      permission: 'process_orders'
    },
    {
      id: 'products',
      icon: <Package className="w-6 h-6" />,
      title: 'Products',
      description: 'Manage product catalog',
      path: 'Products',
      color: 'from-purple-500 to-purple-600',
      permission: 'manage_inventory'
    },
    {
      id: 'customers',
      icon: <Users className="w-6 h-6" />,
      title: 'Customers',
      description: 'Customer management',
      path: 'Customers',
      color: 'from-green-500 to-green-600',
      permission: 'manage_customers'
    },
    {
      id: 'loyalty',
      icon: <Gift className="w-6 h-6" />,
      title: 'Loyalty Program',
      description: 'Rewards and points',
      path: 'LoyaltyProgram',
      color: 'from-pink-500 to-rose-600',
      permission: 'manage_settings'
    },
    {
      id: 'orders',
      icon: <FileText className="w-6 h-6" />,
      title: 'Orders',
      description: 'View order history',
      path: 'Orders',
      color: 'from-orange-500 to-orange-600',
      permission: 'process_orders'
    },
    {
      id: 'reports',
      icon: <BarChart3 className="w-6 h-6" />,
      title: 'Reports',
      description: 'Sales analytics',
      path: 'Reports',
      color: 'from-pink-500 to-pink-600',
      permission: 'view_reports'
    },
    {
      id: 'online_menu',
      icon: <Globe className="w-6 h-6" />,
      title: 'Online Menu',
      description: 'Public ordering page',
      path: 'OnlineMenu',
      color: 'from-indigo-500 to-indigo-600',
      permission: 'process_orders'
    },
    {
      id: 'online_orders',
      icon: <ShoppingBag className="w-6 h-6" />,
      title: 'Online Orders',
      description: 'Manage online orders',
      path: 'OnlineOrders',
      color: 'from-teal-500 to-teal-600',
      permission: 'process_orders'
    },

    {
      id: 'settings',
      icon: <Settings className="w-6 h-6" />,
      title: 'Settings',
      description: 'System configuration',
      path: 'Settings',
      color: 'from-gray-500 to-gray-600',
      permission: 'admin_settings'
    },
    {
      id: 'ai_website',
      icon: <Sparkles className="w-6 h-6" />,
      title: hasWebsite ? 'Manage Website' : 'AI Website Generator',
      description: hasWebsite ? 'View analytics & manage your site' : 'Generate a website with AI',
      path: 'AIWebsiteGenerator',
      color: 'from-indigo-500 via-purple-500 to-pink-500',
      permission: 'admin_settings'
    },
    {
      id: 'users',
      icon: <UserCircle className="w-6 h-6" />,
      title: 'Employees',
      description: 'Staff management',
      path: 'Users',
      color: 'from-red-500 to-red-600',
      permission: 'manage_users'
    },
    {
      id: 'departments',
      icon: <LayoutGrid className="w-6 h-6" />,
      title: 'Departments',
      description: 'Organize products',
      path: 'Departments',
      color: 'from-cyan-500 to-cyan-600',
      permission: 'manage_inventory'
    },
    {
      id: 'inventory',
      icon: <Box className="w-6 h-6" />,
      title: 'Inventory',
      description: 'Stock management',
      path: 'Inventory',
      color: 'from-lime-500 to-lime-600',
      permission: 'manage_inventory'
    },
    {
      id: 'device_monitor',
      icon: <Monitor className="w-6 h-6" />,
      title: 'Device Monitor',
      description: 'Track active sessions',
      path: 'DeviceMonitor',
      color: 'from-violet-500 to-violet-600',
      permission: 'admin_settings'
    },
    {
      id: 'marketplace',
      icon: <Sparkles className="w-6 h-6" />,
      title: 'Marketplace',
      description: 'Browse and purchase chips',
      path: 'Marketplace',
      color: 'from-purple-600 to-pink-600',
      permission: null
      },
      {
      id: 'motherboard',
      icon: <Cpu className="w-6 h-6" />,
      title: 'Motherboard',
      description: 'Install and manage chips',
      path: 'Motherboard',
      color: 'from-blue-600 to-purple-600',
      permission: 'admin_settings'
      },
    {
      id: 'duc_vault',
      icon: <Vault className="w-6 h-6" />,
      title: '$DUC Vault',
      description: 'Rewards, staking & swaps',
      path: 'DUCVault',
      color: 'from-yellow-500 to-orange-600',
      permission: 'admin_settings'
    },
    {
      id: 'referral_program',
      icon: <Gift className="w-6 h-6" />,
      title: 'Referral Program',
      description: 'Refer merchants and earn rewards',
      path: 'ReferralDashboard',
      color: 'from-purple-500 to-pink-500',
      permission: null
    },
    {
      id: 'ai_assistant',
      icon: <Lightbulb className="w-6 h-6" />,
      title: 'AI Assistant',
      description: 'Business insights & analysis',
      path: 'AIAssistant',
      color: 'from-green-400 to-teal-500',
      permission: 'view_reports'
    },
  ];

  const menuItems = [
    getDealerTile(),
    getSuperAdminTile(),
    ...baseMenuItems
  ].filter(Boolean);

  const getVisibleItems = () => {
    return menuItems.filter(item => {
      if (item.id === 'super_admin' && item.permission === 'super_admin_only') {
        return isSuperAdmin();
      }
      if (item.id === 'dealer_dashboard' && item.permission === null) {
        return isDealerAdmin();
      }
      return hasPermission(item.permission);
    });
  };

  const handleNavigate = (path) => {
    window.location.href = createPageUrl(path);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  const visibleItems = getVisibleItems();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 rounded-2xl flex items-center justify-center shadow-2xl"
                 style={{background: 'linear-gradient(135deg, #42A5F5 0%, #C6EF50 100%)'}}>
              <Link2 className="w-14 h-14 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-2">
            openTILL
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">
            Next-Generation Point of Sale System
          </p>
          <CommunityLinks />
        </motion.div>

        {user?.merchant_id && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="bg-white dark:bg-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Pending Orders</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingOrders}</p>
                  </div>
                  <Clock className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Low Stock Items</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.lowStockItems}</p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Open Tickets</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.openTickets}</p>
                  </div>
                  <HelpCircle className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Today's Sales</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">${stats.todaySales}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="mb-8">
          <AdvertisingTile />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {visibleItems.map((item) => {
            return (
              <Card
                key={item.id}
                className={`group hover:shadow-xl hover:scale-105 transition-all cursor-pointer dark:bg-gray-800 bg-white`}
                onClick={() => handleNavigate(item.path)}
              >
                <CardHeader className="p-6">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${item.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    {item.icon}
                  </div>
                  <CardTitle className="font-semibold text-lg text-gray-900 dark:text-white mb-1">
                    {item.title}
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-500 dark:text-gray-400">
                    {item.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}

          <Card
            className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 hover:border-purple-400 dark:bg-gray-800 bg-white"
            onClick={() => window.open('https://071be2.c.myucm.cloud/liveChat?liveChatAccess=MF83MDA2N2YzNDg5OTQ0OWI0OTdiMzhlMWQyNDhkNTg5Ml8wMDBiODIwNzFiZTImNmI3ODBlYzM4ZThmMWQyYjNiNDcwMTliMWM1OWM2MzA=', '_blank')}
          >
            <CardHeader className="p-6">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="font-semibold text-lg text-gray-900 dark:text-white mb-1 group-hover:text-purple-600 transition-colors">
                Live Support
              </CardTitle>
              <CardDescription className="text-sm text-gray-500 dark:text-gray-400">
                Chat with our support team
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => handleNavigate('Support')}
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <HelpCircle className="w-5 h-5" />
            <span>Need help? View User Guide & Support</span>
          </button>
        </div>

        <div className="mt-10 border-t dark:border-gray-700 pt-8">
          <CommunityLinks variant="compact" />
        </div>

        <div className="mt-8 text-center flex flex-col items-center gap-4">
          {isPinUserLoggedIn ? (
            <button
              onClick={handleClockOut}
              className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              <Clock className="w-5 h-5" />
              <span>Clock Out</span>
            </button>
          ) : (
            <button
              onClick={handleMerchantLogout}
              className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              <AlertCircle className="w-5 h-5" />
              <span>Merchant Logout</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}