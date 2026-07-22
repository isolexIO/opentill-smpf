import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CreditCard,
  DollarSign,
  Store,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

export default function PaymentSettingsManager() {
  const [settings, setSettings] = useState({
    subscription_payments: {
      stripe_enabled: false,
      stripe_publishable_key: '',
      stripe_secret_key: '',
      stripe_webhook_secret: '',
      paypal_enabled: false,
      paypal_client_id: '',
      paypal_client_secret: '',
      crypto_enabled: false,
      crypto_addresses: {
        btc: '',
        eth: '',
        sol: ''
      }
    },
    device_shop_payments: {
      stripe_enabled: false,
      stripe_publishable_key: '',
      stripe_secret_key: '',
      square_enabled: false,
      square_access_token: '',
      square_location_id: '',
      paypal_enabled: false,
      paypal_client_id: '',
      paypal_client_secret: ''
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);

      try {
        const me = await base44.auth.me();
        setCurrentUser(me);
      } catch (e) {
        setCurrentUser(null);
      }

      // Load subscription payment settings
      const subPaymentSettings = await base44.entities.PlatformSettings.filter({
        setting_key: 'subscription_payments'
      });
      
      // Load device shop payment settings
      const shopPaymentSettings = await base44.entities.PlatformSettings.filter({
        setting_key: 'device_shop_payments'
      });

      setSettings({
        subscription_payments: subPaymentSettings[0]?.setting_value || settings.subscription_payments,
        device_shop_payments: shopPaymentSettings[0]?.setting_value || settings.device_shop_payments
      });
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);

      // Save subscription payment settings
      const subPaymentSettings = await base44.entities.PlatformSettings.filter({
        setting_key: 'subscription_payments'
      });

      if (subPaymentSettings.length > 0) {
        await base44.entities.PlatformSettings.update(subPaymentSettings[0].id, {
          setting_value: settings.subscription_payments
        });
      } else {
        await base44.entities.PlatformSettings.create({
          setting_key: 'subscription_payments',
          setting_value: settings.subscription_payments,
          category: 'payment',
          description: 'Payment gateway settings for subscription billing',
          is_encrypted: true
        });
      }

      // Save device shop payment settings
      const shopPaymentSettings = await base44.entities.PlatformSettings.filter({
        setting_key: 'device_shop_payments'
      });

      if (shopPaymentSettings.length > 0) {
        await base44.entities.PlatformSettings.update(shopPaymentSettings[0].id, {
          setting_value: settings.device_shop_payments
        });
      } else {
        await base44.entities.PlatformSettings.create({
          setting_key: 'device_shop_payments',
          setting_value: settings.device_shop_payments,
          category: 'payment',
          description: 'Payment gateway settings for device shop orders',
          is_encrypted: true
        });
      }

      // Log the action
      await base44.entities.SystemLog.create({
        log_type: 'super_admin_action',
        action: 'Payment settings updated',
        description: 'Platform payment gateway settings were updated',
        user_email: (await base44.auth.me()).email,
        user_role: 'super_admin',
        severity: 'info'
      });

      setLastSaved(new Date());
      alert('Payment settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSubscriptionSetting = (key, value) => {
    setSettings({
      ...settings,
      subscription_payments: {
        ...settings.subscription_payments,
        [key]: value
      }
    });
  };

  const updateDeviceShopSetting = (key, value) => {
    setSettings({
      ...settings,
      device_shop_payments: {
        ...settings.device_shop_payments,
        [key]: value
      }
    });
  };

  const updateCryptoAddress = (crypto, address) => {
    setSettings({
      ...settings,
      subscription_payments: {
        ...settings.subscription_payments,
        crypto_addresses: {
          ...settings.subscription_payments.crypto_addresses,
          [crypto]: address
        }
      }
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Loading payment settings...</p>
        </CardContent>
      </Card>
    );
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-4 text-red-500" />
          <p className="text-gray-700 font-medium">Super Admins only</p>
          <p className="text-sm text-gray-500 mt-1">
            Platform payment configuration is restricted to Super Admin accounts.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Platform Payment Configuration
            </CardTitle>
            <div className="flex items-center gap-3">
              {lastSaved && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Last saved: {lastSaved.toLocaleTimeString()}
                </div>
              )}
              <Button onClick={saveSettings} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save All Settings'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          These settings control payment processing for subscription billing and device shop orders platform-wide. 
          API keys and credentials are encrypted at rest.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="subscriptions">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="subscriptions">
            <DollarSign className="w-4 h-4 mr-2" />
            Subscription Payments
          </TabsTrigger>
          <TabsTrigger value="device-shop">
            <Store className="w-4 h-4 mr-2" />
            Device Shop Payments
          </TabsTrigger>
        </TabsList>

        {/* Subscription Payments Tab */}
        <TabsContent value="subscriptions" className="space-y-6">
          {/* Stripe */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">openTILL Payments powered by Stripe (Subscription Billing)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <Label htmlFor="sub-stripe-enabled">Enable Stripe for Subscriptions</Label>
                <Switch
                  id="sub-stripe-enabled"
                  checked={settings.subscription_payments.stripe_enabled}
                  onCheckedChange={(checked) => updateSubscriptionSetting('stripe_enabled', checked)}
                />
              </div>

              {settings.subscription_payments.stripe_enabled && (
                <div className="space-y-3 pt-2">
                  <div>
                    <Label>Publishable Key</Label>
                    <Input
                      value={settings.subscription_payments.stripe_publishable_key}
                      onChange={(e) => updateSubscriptionSetting('stripe_publishable_key', e.target.value)}
                      placeholder="pk_test_... or pk_live_..."
                    />
                  </div>

                  <div>
                    <Label>Secret Key</Label>
                    <Input
                      type="password"
                      value={settings.subscription_payments.stripe_secret_key}
                      onChange={(e) => updateSubscriptionSetting('stripe_secret_key', e.target.value)}
                      placeholder="sk_test_... or sk_live_..."
                    />
                  </div>

                  <div>
                    <Label>Webhook Secret</Label>
                    <Input
                      type="password"
                      value={settings.subscription_payments.stripe_webhook_secret}
                      onChange={(e) => updateSubscriptionSetting('stripe_webhook_secret', e.target.value)}
                      placeholder="whsec_..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Used to verify webhook events from Stripe
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Crypto */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cryptocurrency (Subscription Billing)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <Label htmlFor="sub-crypto-enabled">Enable Crypto Payments for Subscriptions</Label>
                <Switch
                  id="sub-crypto-enabled"
                  checked={settings.subscription_payments.crypto_enabled}
                  onCheckedChange={(checked) => updateSubscriptionSetting('crypto_enabled', checked)}
                />
              </div>

              {settings.subscription_payments.crypto_enabled && (
                <div className="space-y-3 pt-2">
                  <div>
                    <Label>Bitcoin (BTC) Address</Label>
                    <Input
                      value={settings.subscription_payments.crypto_addresses.btc}
                      onChange={(e) => updateCryptoAddress('btc', e.target.value)}
                      placeholder="Platform Bitcoin wallet address"
                    />
                  </div>

                  <div>
                    <Label>Ethereum (ETH) Address</Label>
                    <Input
                      value={settings.subscription_payments.crypto_addresses.eth}
                      onChange={(e) => updateCryptoAddress('eth', e.target.value)}
                      placeholder="0x..."
                    />
                  </div>

                  <div>
                    <Label>Solana (SOL) Address</Label>
                    <Input
                      value={settings.subscription_payments.crypto_addresses.sol}
                      onChange={(e) => updateCryptoAddress('sol', e.target.value)}
                      placeholder="Platform Solana wallet address"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Device Shop Payments Tab */}
        <TabsContent value="device-shop" className="space-y-6">
          {/* Stripe */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">openTILL Payments powered by Stripe (Device Shop)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <Label htmlFor="shop-stripe-enabled">Enable Stripe for Device Shop</Label>
                <Switch
                  id="shop-stripe-enabled"
                  checked={settings.device_shop_payments.stripe_enabled}
                  onCheckedChange={(checked) => updateDeviceShopSetting('stripe_enabled', checked)}
                />
              </div>

              {settings.device_shop_payments.stripe_enabled && (
                <div className="space-y-3 pt-2">
                  <div>
                    <Label>Publishable Key</Label>
                    <Input
                      value={settings.device_shop_payments.stripe_publishable_key}
                      onChange={(e) => updateDeviceShopSetting('stripe_publishable_key', e.target.value)}
                      placeholder="pk_test_... or pk_live_..."
                    />
                  </div>

                  <div>
                    <Label>Secret Key</Label>
                    <Input
                      type="password"
                      value={settings.device_shop_payments.stripe_secret_key}
                      onChange={(e) => updateDeviceShopSetting('stripe_secret_key', e.target.value)}
                      placeholder="sk_test_... or sk_live_..."
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        </TabsContent>
      </Tabs>
    </div>
  );
}