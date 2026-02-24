import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2, ArrowLeft, Settings as SettingsIcon, CreditCard, DollarSign, Monitor, Layers, ShoppingBag, Globe, Wallet, Shield, Printer, Trash2, Users } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import PermissionGate from '@/components/PermissionGate';

// Import tab components
import GeneralTab from '../components/settings/GeneralTab';
import PaymentGatewaysTab from '../components/settings/PaymentGatewaysTab';
import PricingTab from '../components/settings/PricingTab';
import DevicesTab from '../components/settings/DevicesTab';
import DepartmentsTab from '../components/settings/DepartmentsTab';
import CustomerDisplayTab from '../components/settings/CustomerDisplayTab';
import CustomDomainTab from '../components/settings/CustomDomainTab';
import WalletPaymentsTab from '../components/settings/WalletPaymentsTab';
import Web3IdentityTab from '../components/settings/Web3IdentityTab';
import StaffManagementTab from '../components/settings/StaffManagementTab';
import SecurityTab from '../components/settings/SecurityTab';
import TwoFactorTab from '../components/settings/TwoFactorTab';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [merchant, setMerchant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Settings: Starting data load...');
      
      const pinUserJSON = localStorage.getItem('pinLoggedInUser');
      let currentUser = null;
      
      if (pinUserJSON) {
        try {
          currentUser = JSON.parse(pinUserJSON);
          console.log('Settings: Loaded pinLoggedInUser:', {
            email: currentUser.email,
            merchant_id: currentUser.merchant_id,
            role: currentUser.role
          });
        } catch (e) {
          console.error('Settings: Error parsing pinLoggedInUser:', e);
        }
      }
      
      if (!currentUser) {
        try {
          currentUser = await base44.auth.me();
          console.log('Settings: Loaded from auth.me():', {
            email: currentUser?.email,
            merchant_id: currentUser?.merchant_id,
            role: currentUser?.role
          });
        } catch (e) {
          console.error('Settings: auth.me() failed:', e);
        }
      }

      if (!currentUser) {
        throw new Error('No authenticated user found. Please log in.');
      }

      setUser(currentUser);

      if (!currentUser.merchant_id) {
        throw new Error('User account is not associated with any merchant. Please contact support.');
      }

      console.log('Settings: Loading merchant ID:', currentUser.merchant_id);
      
      let merchantData = null;
      
      try {
        merchantData = await base44.entities.Merchant.get(currentUser.merchant_id);
        console.log('Settings: Loaded merchant via get():', merchantData?.business_name);
      } catch (getError) {
        console.warn('Settings: get() failed, trying filter...', getError.message);
        
        try {
          const merchants = await base44.entities.Merchant.filter({
            id: currentUser.merchant_id
          });
          
          if (merchants && merchants.length > 0) {
            merchantData = merchants[0];
            console.log('Settings: Loaded merchant via filter():', merchantData?.business_name);
          }
        } catch (filterError) {
          console.error('Settings: filter() also failed:', filterError);
        }
      }

      // Final fallback: look up by owner_email
      if (!merchantData && currentUser.email) {
        try {
          const byEmail = await base44.entities.Merchant.filter({ owner_email: currentUser.email });
          if (byEmail && byEmail.length > 0) {
            merchantData = byEmail[0];
            console.log('Settings: Loaded merchant via email fallback:', merchantData?.business_name);
            // Update localStorage with correct merchant_id
            const updated = { ...currentUser, merchant_id: merchantData.id };
            localStorage.setItem('pinLoggedInUser', JSON.stringify(updated));
            setUser(updated);
          }
        } catch (emailError) {
          console.error('Settings: email fallback failed:', emailError);
        }
      }

      if (!merchantData) {
        throw new Error(`Merchant not found (ID: ${currentUser.merchant_id}). The merchant may have been deleted or you may not have access.`);
      }

      if (!merchantData.settings) {
        console.warn('Settings: Merchant has no settings object, creating default...');
        merchantData.settings = {
          timezone: 'America/New_York',
          currency: 'USD',
          tax_rate: 0.08,
          pricing_and_surcharge: {},
          payment_gateways: {},
          customer_display: {},
          age_verification: { enabled: true },
          kitchen_display: { enabled: true },
          hardware: {},
          solana_pay: {}
        };
      } else {
        if (!merchantData.settings.solana_pay) {
          merchantData.settings.solana_pay = {};
        }
      }

      setMerchant(merchantData);
      console.log('Settings: All data loaded successfully');

    } catch (error) {
      console.error('Settings: Fatal error loading data:', error);
      setError(error.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updates) => {
    if (!merchant) {
      alert('Merchant not loaded. Cannot save settings.');
      return;
    }

    setSaving(true);
    try {
      console.log('Settings: Saving updates:', updates);

      const updatedSettings = {
        ...(merchant.settings || {}),
        ...(updates.settings || {})
      };

      const updatedMerchant = {
        ...merchant,
        ...updates,
        settings: updatedSettings
      };

      await base44.entities.Merchant.update(merchant.id, updatedMerchant);
      
      console.log('Settings: Saved successfully');
      
      const refreshedMerchant = await base44.entities.Merchant.get(merchant.id);
      setMerchant(refreshedMerchant);
      
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Settings: Save error:', error);
      alert('Failed to save settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUserUpdate = async (updates) => {
    if (!user) {
      alert('User not loaded. Cannot save.');
      return;
    }

    setSaving(true);
    try {
      console.log('Settings: Updating user:', updates);
      
      await base44.entities.User.update(user.id, updates);
      
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('pinLoggedInUser', JSON.stringify(updatedUser));
      
      alert('User settings saved successfully!');
    } catch (error) {
      console.error('Settings: User update error:', error);
      alert('Failed to save: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSettings = async (newSettings) => {
    await handleSave({ settings: newSettings });
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      alert('Please type DELETE to confirm.');
      return;
    }
    try {
      await base44.entities.Merchant.update(merchant.id, { status: 'cancelled' });
      localStorage.removeItem('pinLoggedInUser');
      base44.auth.logout(createPageUrl('Home'));
    } catch (err) {
      alert('Failed to delete account: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-6 h-6" />
              Error Loading Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-300 font-medium">{error}</p>
            </div>
            
            {user && (
              <div className="text-sm text-gray-600 dark:text-gray-400 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-1">
                <p><strong>User:</strong> {user.email}</p>
                <p><strong>Role:</strong> {user.role}</p>
                <p><strong>Merchant ID:</strong> {user.merchant_id || 'None'}</p>
                {user.is_impersonating && (
                  <Badge className="mt-2 bg-orange-500">Impersonating</Badge>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => window.location.href = createPageUrl('SystemMenu')}
                className="flex-1"
              >
                Back to Menu
              </Button>
              <Button
                onClick={loadData}
                className="flex-1"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertCircle className="w-6 h-6" />
              No Merchant Found
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Your account is not associated with a merchant. Please contact support.
            </p>
            
            <Button
              onClick={() => window.location.href = createPageUrl('SystemMenu')}
              className="w-full"
            >
              Back to Menu
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'wallet-payments', label: 'Wallet & Payments', icon: Wallet },
    { id: 'staff', label: 'Staff Management', icon: Users },
    { id: 'account', label: 'Account', icon: Trash2 },
    { id: '2fa', label: 'Two-Factor Auth', icon: Shield },
    { id: 'payments', label: 'Payment Gateways', icon: CreditCard },
    { id: 'pricing', label: 'Pricing & Surcharge', icon: DollarSign },
    { id: 'devices', label: 'Hardware Devices', icon: Printer },
    { id: 'departments', label: 'Departments', icon: Layers },
    { id: 'display', label: 'Customer Display', icon: Monitor },
    { id: 'domain', label: 'Custom Domain', icon: Globe },
    { id: 'security', label: 'Security', icon: Shield }
  ];

  return (
    <PermissionGate permission="manage_settings">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(createPageUrl('SystemMenu'))}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {merchant.business_name || merchant.display_name}
                </p>
                {user?.is_impersonating && (
                  <Badge className="mt-2 bg-orange-500">
                    Impersonating Merchant
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content with sidebar */}
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Left Sidebar */}
            <div className="w-full md:w-64 flex-shrink-0">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-2 space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {tab.customIcon ? (
                        <img src={tab.customIcon} alt="" className="w-5 h-5" />
                      ) : (
                        Icon && <Icon className="w-5 h-5" />
                      )}
                      <span className="text-sm">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Content Area */}
            <div className="flex-1">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                {activeTab === 'general' && (
                  <GeneralTab merchant={merchant} onSave={handleSave} saving={saving} />
                )}
                {activeTab === 'wallet-payments' && (
                  <WalletPaymentsTab merchant={merchant} onSave={handleSave} />
                )}
                {activeTab === 'staff' && (
                  <StaffManagementTab merchant={merchant} />
                )}
                {activeTab === '2fa' && (
                  <TwoFactorTab />
                )}
                {activeTab === 'payments' && (
                  <PaymentGatewaysTab 
                    gateways={merchant.settings?.payment_gateways || {}} 
                    onUpdateGateways={(gateways) => handleSave({ settings: { payment_gateways: gateways } })}
                  />
                )}
                {activeTab === 'pricing' && (
                  <PricingTab settings={merchant.settings} onSave={handleUpdateSettings} />
                )}
                {activeTab === 'devices' && (
                  <DevicesTab 
                    hardware={merchant.settings?.hardware || {}} 
                    onUpdateHardware={(hardware) => handleSave({ settings: { hardware } })}
                  />
                )}
                {activeTab === 'departments' && (
                  <DepartmentsTab merchant={merchant} />
                )}
                {activeTab === 'display' && (
                  <CustomerDisplayTab 
                    settings={merchant.settings?.customer_display || {}} 
                    onUpdate={(display) => handleSave({ settings: { customer_display: display } })}
                  />
                )}
                {activeTab === 'domain' && (
                  <CustomDomainTab merchant={merchant} />
                )}
                {activeTab === 'security' && (
                  <SecurityTab 
                    settings={merchant.settings || {}}
                    onSave={(securitySettings) => handleSave({ settings: securitySettings })}
                  />
                )}
                {activeTab === 'account' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Account</h2>
                      <p className="text-sm text-gray-500 mt-1">Manage your account settings</p>
                    </div>
                    <div className="border border-red-200 dark:border-red-800 rounded-lg p-6 bg-red-50 dark:bg-red-900/10 space-y-4">
                      <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                        <Trash2 className="w-5 h-5" />
                        <h3 className="font-semibold text-lg">Delete Account</h3>
                      </div>
                      <p className="text-sm text-red-700 dark:text-red-400">
                        This will mark your merchant account as cancelled. This action cannot be undone.
                        All your data will be retained for legal/audit purposes.
                      </p>
                      {!showDeleteConfirm ? (
                        <Button
                          variant="destructive"
                          onClick={() => setShowDeleteConfirm(true)}
                          className="min-h-[44px]"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete My Account
                        </Button>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-red-800 dark:text-red-300">
                            Type <strong>DELETE</strong> to confirm account deletion:
                          </p>
                          <Input
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder="Type DELETE here"
                            className="border-red-300 focus:border-red-500"
                          />
                          <div className="flex gap-2">
                            <Button
                              variant="destructive"
                              onClick={handleDeleteAccount}
                              disabled={deleteConfirmText !== 'DELETE'}
                              className="min-h-[44px]"
                            >
                              Confirm Delete
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                              className="min-h-[44px]"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PermissionGate>
  );
}