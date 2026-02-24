import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SelectContent, SelectItem } from '@/components/ui/select';
import SelectWrapper from '@/components/SelectWrapper';
import { Separator } from '@/components/ui/separator';
import { Save, Sun, Moon, Monitor, Trash2, AlertCircle } from 'lucide-react';

export default function GeneralTab({ merchant, onSave, saving }) {
  const [localSettings, setLocalSettings] = useState({
    business_name: '',
    display_name: '',
    defaultPosView: 'orders',
    autoLockMinutes: 0,
    enableOrderSounds: true,
    theme: 'system',
    kitchen_display: { enabled: false },
    enable_chainlink_payments: false,
    online_ordering: { // Initialize online_ordering with default values
      enabled: true,
      allow_cash_payment: true,
      allow_pickup: true,
      allow_delivery: true,
      min_order_amount: 0,
      delivery_fee: 0,
      delivery_radius_miles: 10
    },
    hardware: {
      card_readers: [],
      printers: [],
      barcode_scanners: [],
      barcodeScanner: {
        enabled: false,
        type: 'keyboard',
        prefix: '',
        playBeep: true,
        autoSearch: false,
        minLength: 4,
        scanTimeout: 150
      }
    }
  });

  useEffect(() => {
    if (merchant) {
      // Safely extract settings with defaults
      const settings = merchant.settings || {};
      
      setLocalSettings({
        business_name: merchant.business_name || '',
        display_name: merchant.display_name || '',
        defaultPosView: settings.defaultPosView || 'orders',
        autoLockMinutes: settings.autoLockMinutes || 0,
        enableOrderSounds: settings.enableOrderSounds !== undefined ? settings.enableOrderSounds : true,
        theme: settings.theme || 'system',
        kitchen_display: settings.kitchen_display || { enabled: false },
        enable_chainlink_payments: settings.enable_chainlink_payments || false,
        online_ordering: { // Apply defaults for online_ordering settings
          enabled: settings.online_ordering?.enabled !== undefined ? settings.online_ordering.enabled : true,
          allow_cash_payment: settings.online_ordering?.allow_cash_payment !== undefined ? settings.online_ordering.allow_cash_payment : true,
          allow_pickup: settings.online_ordering?.allow_pickup !== undefined ? settings.online_ordering.allow_pickup : true,
          allow_delivery: settings.online_ordering?.allow_delivery !== undefined ? settings.online_ordering.allow_delivery : true,
          min_order_amount: settings.online_ordering?.min_order_amount ?? 0,
          delivery_fee: settings.online_ordering?.delivery_fee ?? 0,
          delivery_radius_miles: settings.online_ordering?.delivery_radius_miles ?? 10,
        },
        hardware: {
          card_readers: settings.hardware?.card_readers || [],
          printers: settings.hardware?.printers || [],
          barcode_scanners: settings.hardware?.barcode_scanners || [],
          barcodeScanner: settings.hardware?.barcodeScanner || {
            enabled: false,
            type: 'keyboard',
            prefix: '',
            playBeep: true,
            autoSearch: false,
            minLength: 4,
            scanTimeout: 150
          }
        }
      });

      // Apply theme on mount
      const currentTheme = settings.theme || localStorage.getItem('theme') || 'system';
      applyTheme(currentTheme);
    }
  }, [merchant]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (localSettings.theme === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [localSettings.theme]);

  const applyTheme = (theme) => {
    const root = document.documentElement;
    
    // Save to localStorage
    localStorage.setItem('theme', theme);
    
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    } else if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  const handleChange = (field, value) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
    
    // Apply theme immediately when changed
    if (field === 'theme') {
      applyTheme(value);
    }
  };

  const handleNestedChange = (parent, field, value) => {
    setLocalSettings(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    // Make sure theme is saved
    const settingsToSave = {
      business_name: localSettings.business_name,
      display_name: localSettings.display_name,
      settings: {
        theme: localSettings.theme || 'system',
        defaultPosView: localSettings.defaultPosView,
        autoLockMinutes: localSettings.autoLockMinutes,
        enableOrderSounds: localSettings.enableOrderSounds,
        kitchen_display: localSettings.kitchen_display,
        enable_chainlink_payments: localSettings.enable_chainlink_payments,
        online_ordering: localSettings.online_ordering, // Include online_ordering settings
        hardware: localSettings.hardware
      }
    };
    
    await onSave(settingsToSave);
    
    // Reapply theme after save
    applyTheme(localSettings.theme);
  };

  return (
    <div className="space-y-6">
      {/* Business Information */}
      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
          <CardDescription>Basic information about your business</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="business-name">Business Name</Label>
            <Input
              id="business-name"
              value={localSettings.business_name}
              onChange={(e) => handleChange('business_name', e.target.value)}
              placeholder="Enter business name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="display-name">Display Name (Optional)</Label>
            <Input
              id="display-name"
              value={localSettings.display_name}
              onChange={(e) => handleChange('display_name', e.target.value)}
              placeholder="Name shown on receipts and customer displays"
            />
          </div>
        </CardContent>
      </Card>

      {/* Online Ordering Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Online Ordering Settings</CardTitle>
          <CardDescription>Configure options for your online store</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Online Ordering</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">Allow customers to order online</p>
            </div>
            <Switch
              checked={localSettings.online_ordering?.enabled ?? true}
              onCheckedChange={(checked) => handleChange('online_ordering', {
                ...localSettings.online_ordering,
                enabled: checked
              })}
            />
          </div>

          {localSettings.online_ordering?.enabled && (
            <>
              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Cash Payment</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Let customers pay with cash on pickup/delivery</p>
                </div>
                <Switch
                  checked={localSettings.online_ordering?.allow_cash_payment ?? true}
                  onCheckedChange={(checked) => handleChange('online_ordering', {
                    ...localSettings.online_ordering,
                    allow_cash_payment: checked
                  })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Pickup Orders</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Enable customer pickup option</p>
                </div>
                <Switch
                  checked={localSettings.online_ordering?.allow_pickup ?? true}
                  onCheckedChange={(checked) => handleChange('online_ordering', {
                    ...localSettings.online_ordering,
                    allow_pickup: checked
                  })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Delivery Orders</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Enable delivery option</p>
                </div>
                <Switch
                  checked={localSettings.online_ordering?.allow_delivery ?? true}
                  onCheckedChange={(checked) => handleChange('online_ordering', {
                    ...localSettings.online_ordering,
                    allow_delivery: checked
                  })}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="min-order-amount">Minimum Order Amount ($)</Label>
                <Input
                  id="min-order-amount"
                  type="number"
                  step="0.01"
                  value={localSettings.online_ordering?.min_order_amount ?? 0}
                  onChange={(e) => handleChange('online_ordering', {
                    ...localSettings.online_ordering,
                    min_order_amount: parseFloat(e.target.value) || 0
                  })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery-fee">Delivery Fee ($)</Label>
                <Input
                  id="delivery-fee"
                  type="number"
                  step="0.01"
                  value={localSettings.online_ordering?.delivery_fee ?? 0}
                  onChange={(e) => handleChange('online_ordering', {
                    ...localSettings.online_ordering,
                    delivery_fee: parseFloat(e.target.value) || 0
                  })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery-radius">Delivery Radius (miles)</Label>
                <Input
                  id="delivery-radius"
                  type="number"
                  step="1"
                  value={localSettings.online_ordering?.delivery_radius_miles ?? 10}
                  onChange={(e) => handleChange('online_ordering', {
                    ...localSettings.online_ordering,
                    delivery_radius_miles: parseInt(e.target.value) || 10
                  })}
                  placeholder="10"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize the look and feel of your POS</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label>Theme</Label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleChange('theme', 'light')}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  localSettings.theme === 'light'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                }`}
              >
                <Sun className="w-6 h-6 text-gray-900 dark:text-gray-100" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Light</span>
              </button>

              <button
                type="button"
                onClick={() => handleChange('theme', 'dark')}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  localSettings.theme === 'dark'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                }`}
              >
                <Moon className="w-6 h-6 text-gray-900 dark:text-gray-100" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Dark</span>
              </button>

              <button
                type="button"
                onClick={() => handleChange('theme', 'system')}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  localSettings.theme === 'system'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                }`}
              >
                <Monitor className="w-6 h-6 text-gray-900 dark:text-gray-100" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">System</span>
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {localSettings.theme === 'system' 
                ? 'Automatically switches between light and dark mode based on your system preferences'
                : `Always use ${localSettings.theme} mode`
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* POS Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>POS Preferences</CardTitle>
          <CardDescription>Configure how your POS system behaves</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="default-view">Default POS View</Label>
            <SelectWrapper
              value={localSettings.defaultPosView}
              onValueChange={(value) => handleChange('defaultPosView', value)}
              trigger="Select view"
            >
              <SelectItem value="orders">Orders</SelectItem>
              <SelectItem value="products">Products</SelectItem>
              <SelectItem value="quick_service">Quick Service</SelectItem>
            </SelectWrapper>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Kitchen Display System</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Send orders to kitchen display automatically
              </p>
            </div>
            <Switch
              checked={localSettings.kitchen_display?.enabled}
              onCheckedChange={(checked) => handleNestedChange('kitchen_display', 'enabled', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Order Sound Notifications</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Play sound when new orders arrive
              </p>
            </div>
            <Switch
              checked={localSettings.enableOrderSounds}
              onCheckedChange={(checked) => handleChange('enableOrderSounds', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="auto-lock">Auto-Lock (minutes)</Label>
            <Input
              id="auto-lock"
              type="number"
              min="0"
              value={localSettings.autoLockMinutes}
              onChange={(e) => handleChange('autoLockMinutes', parseInt(e.target.value) || 0)}
              placeholder="0 = disabled"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Automatically lock POS after inactivity (0 to disable)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Payment Features */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Features</CardTitle>
          <CardDescription>Enable advanced payment options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>ChainLINK Crypto Payments</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Accept Solana Pay and other crypto payments
              </p>
            </div>
            <Switch
              checked={localSettings.enable_chainlink_payments}
              onCheckedChange={(checked) => handleChange('enable_chainlink_payments', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Barcode Scanner Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Barcode Scanner</CardTitle>
          <CardDescription>Configure barcode scanning behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Barcode Scanner</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Allow barcode scanning for product lookup
              </p>
            </div>
            <Switch
              checked={localSettings.hardware?.barcodeScanner?.enabled}
              onCheckedChange={(checked) => {
                setLocalSettings(prev => ({
                  ...prev,
                  hardware: {
                    ...prev.hardware,
                    barcodeScanner: {
                      ...prev.hardware.barcodeScanner,
                      enabled: checked
                    }
                  }
                }));
              }}
            />
          </div>

          {localSettings.hardware?.barcodeScanner?.enabled && (
            <>
              <div className="space-y-2">
                 <Label htmlFor="scanner-type">Scanner Type</Label>
                 <SelectWrapper
                   value={localSettings.hardware?.barcodeScanner?.type}
                   onValueChange={(value) => {
                     setLocalSettings(prev => ({
                       ...prev,
                       hardware: {
                         ...prev.hardware,
                         barcodeScanner: {
                           ...prev.hardware.barcodeScanner,
                           type: value
                         }
                       }
                     }));
                   }}
                   trigger="Select scanner type"
                 >
                   <SelectItem value="keyboard">Keyboard Wedge</SelectItem>
                   <SelectItem value="camera">Camera Scanner</SelectItem>
                 </SelectWrapper>
               </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Play Beep on Scan</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Audio feedback when barcode is scanned
                  </p>
                </div>
                <Switch
                  checked={localSettings.hardware?.barcodeScanner?.playBeep}
                  onCheckedChange={(checked) => {
                    setLocalSettings(prev => ({
                      ...prev,
                      hardware: {
                        ...prev.hardware,
                        barcodeScanner: {
                          ...prev.hardware.barcodeScanner,
                          playBeep: checked
                        }
                      }
                    }));
                  }}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg" disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}