import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, DollarSign, Info, Zap } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function PricingTab({ settings, onSave }) {
  const [pricingSettings, setPricingSettings] = useState({
    enable_dual_pricing: settings?.pricing_and_surcharge?.enable_dual_pricing || false,
    cc_surcharge_percent: settings?.pricing_and_surcharge?.cc_surcharge_percent || 3.5,
    flat_fee_amount: settings?.pricing_and_surcharge?.flat_fee_amount || 0,
    apply_flat_fee_to_all: settings?.pricing_and_surcharge?.apply_flat_fee_to_all || false,
    show_dual_prices: settings?.pricing_and_surcharge?.show_dual_prices || true,
    region: settings?.pricing_and_surcharge?.region || 'US',
    pricing_mode: settings?.pricing_and_surcharge?.pricing_mode || 'surcharge',
    sync_with_payments: settings?.pricing_and_surcharge?.sync_with_payments || false,
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleToggleDualPricing = (enabled) => {
    setPricingSettings({ ...pricingSettings, enable_dual_pricing: enabled });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Enforce regional caps
      let finalPercent = parseFloat(pricingSettings.cc_surcharge_percent);
      if (pricingSettings.region === 'US' && finalPercent > 4.0) {
        finalPercent = 4.0;
      } else if (pricingSettings.region === 'CA' && finalPercent > 2.4) {
        finalPercent = 2.4;
      }

      const updatedSettings = {
        ...settings,
        pricing_and_surcharge: {
          ...pricingSettings,
          cc_surcharge_percent: finalPercent
        }
      };

      await onSave(updatedSettings);
      alert('Pricing settings saved successfully!');
    } catch (error) {
      console.error('Error saving pricing settings:', error);
      alert('Failed to save pricing settings: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const getMaxPercent = () => {
    if (pricingSettings.region === 'US') return 4.0;
    if (pricingSettings.region === 'CA') return 2.4;
    return 10.0; // Other regions
  };

  const getRegionalInfo = () => {
    if (pricingSettings.region === 'US') {
      return 'U.S. law caps credit card surcharges at 4%. This is enforced automatically.';
    }
    if (pricingSettings.region === 'CA') {
      return 'Canadian law caps credit card surcharges at 2.4%. This is enforced automatically.';
    }
    return 'No regional restrictions apply.';
  };

  const calculateExample = () => {
    const subtotal = 100.0;
    const tax = subtotal * 0.08; // 8% tax example
    const cashTotal = subtotal + tax;
    
    let surcharge = 0;
    if (pricingSettings.enable_dual_pricing) {
      const effectivePercent = pricingSettings.sync_with_payments
        ? ((settings?.payment_gateways?.stripe?.processing_rate_percent ?? 2.9) + (settings?.payment_gateways?.stripe?.platform_fee_percent ?? 0))
        : pricingSettings.cc_surcharge_percent;
      const effectiveFlat = pricingSettings.sync_with_payments
        ? (settings?.payment_gateways?.stripe?.processing_flat_fee ?? 0.3)
        : pricingSettings.flat_fee_amount;
      if (effectiveFlat > 0) {
        surcharge += effectiveFlat;
      }
      surcharge += (subtotal * (effectivePercent / 100));
    }
    
    const cardTotal = cashTotal + surcharge;

    return { subtotal, tax, cashTotal, cardTotal, surcharge };
  };

  const example = calculateExample();

  return (
    <div className="space-y-6">
      {/* openTILL Branding Header */}
      <Card className="border-2 border-purple-500 bg-gradient-to-r from-purple-50 to-green-50 dark:from-purple-900/20 dark:to-green-900/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-purple-600 to-green-500 rounded-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl">openTILL Dual Pricing</CardTitle>
              <CardDescription>
                Show different prices for cash vs. card payments - fully compliant with U.S. and Canadian regulations
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Enable Dual Pricing Toggle */}
      <Card>
        <CardHeader>
          <CardTitle>Enable Dual Pricing</CardTitle>
          <CardDescription>
            Display both cash and card prices to customers, with automatic surcharge for card payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Switch
                checked={pricingSettings.enable_dual_pricing}
                onCheckedChange={handleToggleDualPricing}
              />
              <Label className="text-lg">
                {pricingSettings.enable_dual_pricing ? 'Enabled' : 'Disabled'}
              </Label>
            </div>
            {pricingSettings.enable_dual_pricing && (
              <Badge className="bg-green-500">Active</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {pricingSettings.enable_dual_pricing && (
        <>
          {/* Region Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Region & Compliance</CardTitle>
              <CardDescription>Select your region for automatic regulatory compliance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Operating Region</Label>
                <Select
                  value={pricingSettings.region}
                  onValueChange={(value) => setPricingSettings({ ...pricingSettings, region: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">United States (4% max)</SelectItem>
                    <SelectItem value="CA">Canada (2.4% max)</SelectItem>
                    <SelectItem value="Other">Other Region</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Alert>
                <Info className="w-4 h-4" />
                <AlertDescription>{getRegionalInfo()}</AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Pricing Mode */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing Mode</CardTitle>
              <CardDescription>Choose how to label the price difference</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={pricingSettings.pricing_mode}
                onValueChange={(value) => setPricingSettings({ ...pricingSettings, pricing_mode: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="surcharge">Credit Card Surcharge (default)</SelectItem>
                  <SelectItem value="cash_discount">Cash Discount</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500 mt-2">
                {pricingSettings.pricing_mode === 'surcharge' 
                  ? 'Card payments show as "Credit Card Surcharge"' 
                  : 'Cash payments show as "Cash Discount"'}
              </p>
            </CardContent>
          </Card>

          {/* Sync with openTILL Payments */}
          <Card className="border-2 border-blue-300 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-600" />
                Sync with openTILL Payments
              </CardTitle>
              <CardDescription>
                Automatically match the surcharge to the actual processing fee charged by openTILL Payments (Stripe)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={pricingSettings.sync_with_payments}
                    onCheckedChange={(checked) => setPricingSettings({ ...pricingSettings, sync_with_payments: checked })}
                  />
                  <Label>{pricingSettings.sync_with_payments ? 'Synced' : 'Manual'}</Label>
                </div>
                {pricingSettings.sync_with_payments && (
                  <Badge className="bg-blue-500">Auto-synced</Badge>
                )}
              </div>
              <Alert>
                <Info className="w-4 h-4" />
                <AlertDescription>
                  {pricingSettings.sync_with_payments
                    ? 'The surcharge on each card transaction will automatically match your openTILL Payments processing rate (set in Payment Gateways). This ensures you never absorb processing fees.'
                    : 'Enable this to automatically sync the surcharge with your openTILL Payments (Stripe) processing rate. The manual percentage and flat fee below will be ignored.'}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Surcharge Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Surcharge Configuration</CardTitle>
              <CardDescription>
                {pricingSettings.sync_with_payments
                  ? 'Synced with openTILL Payments — manual values are overridden'
                  : 'Set your card processing fees'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Percentage Surcharge (%)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max={getMaxPercent()}
                    value={pricingSettings.cc_surcharge_percent}
                    onChange={(e) => setPricingSettings({ 
                      ...pricingSettings, 
                      cc_surcharge_percent: Math.min(parseFloat(e.target.value), getMaxPercent()) 
                    })}
                    disabled={pricingSettings.sync_with_payments}
                  />
                  <span className="text-sm text-gray-500">Max: {getMaxPercent()}%</span>
                </div>
              </div>

              <div>
                <Label>Flat Fee (Optional)</Label>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-gray-400" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={pricingSettings.flat_fee_amount}
                    onChange={(e) => setPricingSettings({ ...pricingSettings, flat_fee_amount: parseFloat(e.target.value) })}
                    disabled={pricingSettings.sync_with_payments}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Add a fixed fee per transaction</p>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={pricingSettings.show_dual_prices}
                  onCheckedChange={(checked) => setPricingSettings({ ...pricingSettings, show_dual_prices: checked })}
                />
                <Label>Show both prices on customer display</Label>
              </div>
            </CardContent>
          </Card>

          {/* Example Calculation */}
          <Card className="bg-blue-50 dark:bg-blue-900/20">
            <CardHeader>
              <CardTitle>Example Calculation</CardTitle>
              <CardDescription>How dual pricing will appear to customers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 font-mono text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${example.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (8%):</span>
                  <span>${example.tax.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-300 dark:border-gray-600 my-2"></div>
                <div className="flex justify-between text-green-600 dark:text-green-400 font-bold">
                  <span>💵 Cash Total:</span>
                  <span>${example.cashTotal.toFixed(2)}</span>
                </div>
                {example.surcharge > 0 && (
                  <>
                    <div className="flex justify-between text-blue-600 dark:text-blue-400">
                      <span>+ Card Processing Fee:</span>
                      <span>${example.surcharge.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-blue-600 dark:text-blue-400 font-bold">
                      <span>💳 Card Total:</span>
                      <span>${example.cardTotal.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Compliance Warning */}
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              <strong>Compliance Notice:</strong> You must clearly disclose surcharges to customers before payment. 
              openTILL automatically displays pricing on the customer display terminal. Ensure you post visible 
              signage at your store entrance as required by law.
            </AlertDescription>
          </Alert>
        </>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          {isSaving ? 'Saving...' : 'Save Pricing Settings'}
        </Button>
      </div>
    </div>
  );
}