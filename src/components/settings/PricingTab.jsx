import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Info, Zap } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { buildPricing, FUNDING } from '@/lib/pricing';

export default function PricingTab({ settings, onSave }) {
  const [pricingSettings, setPricingSettings] = useState({
    enable_dual_pricing: settings?.pricing_and_surcharge?.enable_dual_pricing || false,
    cc_surcharge_percent: settings?.pricing_and_surcharge?.cc_surcharge_percent || 3.5,
    flat_fee_amount: settings?.pricing_and_surcharge?.flat_fee_amount || 0,
    apply_flat_fee_to_all: settings?.pricing_and_surcharge?.apply_flat_fee_to_all || false,
    show_dual_prices: settings?.pricing_and_surcharge?.show_dual_prices || true,
    region: settings?.pricing_and_surcharge?.region || 'US',
    pricing_mode: settings?.pricing_and_surcharge?.pricing_mode || 'surcharge',
    sync_with_payments: true,
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
          sync_with_payments: true,
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
    const taxRate = settings?.tax_rate ?? 0.08;
    const tax = subtotal * taxRate;
    // Illustrative approved rule so the preview shows the grossed-up card price.
    // Real enforcement uses the merchant's loaded ComplianceRule (fail closed otherwise).
    const exampleRule = {
      status: 'active',
      legal_review_status: 'approved',
      dual_pricing_status: 'allowed',
      surcharge_status: 'allowed',
    };
    const pricing = buildPricing({
      settings,
      rule: exampleRule,
      cardFundingType: FUNDING.UNKNOWN,
      subtotalDollars: subtotal,
      taxDollars: tax,
      tipDollars: 0,
    });
    const surcharge = parseFloat(pricing.surchargeAmount) || 0;
    const cashTotal = subtotal + tax;
    const cardTotal = cashTotal + surcharge;
    return {
      subtotal, tax, cashTotal, cardTotal, surcharge,
      program: pricing.program,
      allowed: pricing.allowed,
      absorbed: pricing.merchantAbsorbed,
      calcVersion: pricing.calcVersion,
    };
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

          {/* Synced Surcharge — locked to openTILL Payments costs */}
          <Card className="border-2 border-blue-300 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-600" />
                Surcharge Rate (Auto-Synced)
              </CardTitle>
              <CardDescription>
                The surcharge is automatically synced to your openTILL Payments (Stripe) processing costs. This is not adjustable.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border">
                  <p className="text-xs text-gray-500 mb-1">Processing Rate</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {(settings?.payment_gateways?.stripe?.processing_rate_percent ?? 2.9).toFixed(2)}%
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border">
                  <p className="text-xs text-gray-500 mb-1">Platform Fee</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {(settings?.payment_gateways?.stripe?.platform_fee_percent ?? 0.5).toFixed(2)}%
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border">
                  <p className="text-xs text-gray-500 mb-1">Flat Fee / Transaction</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ${(settings?.payment_gateways?.stripe?.processing_flat_fee ?? 0.3).toFixed(2)}
                  </p>
                </div>
              </div>
              <Alert>
                <Info className="w-4 h-4" />
                <AlertDescription>
                  The surcharge on each card transaction automatically matches the combined openTILL Payments processing rate, flat fee, and platform fee. This ensures you never absorb processing fees and stays fully compliant with dual-pricing regulations.
                </AlertDescription>
              </Alert>
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
                      <span>+ Card Price Adjustment:</span>
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