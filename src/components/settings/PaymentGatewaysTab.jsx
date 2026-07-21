import { useState, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Save, AlertTriangle, CreditCard, ShieldCheck, AlertCircle, Terminal } from 'lucide-react';
import StripeTerminalCard from '@/components/settings/StripeTerminalCard';

export default function PaymentGatewaysTab({ gateways, onUpdateGateways }) {
  const { toast } = useToast();

  const [localGateways, setLocalGateways] = useState(() => ({
    stripe: { enabled: false, test_mode: true, secret_key: '', publishable_key: '', manual_entry_mode: false, ...gateways?.stripe },
    shift4: { enabled: false, test_mode: true, access_token: '', api_key: '', company_name: '', merchant_id: '', ...gateways?.shift4 },
    non_integrated: { 
      enabled: false, 
      terminal_type: '', 
      require_approval_code: true, 
      require_last_4: true, 
      allow_notes: true, 
      ...gateways?.non_integrated 
    },
    ebt: {
      enabled: false,
      provider: 'manual',
      test_mode: true,
      require_pin: true,
      max_transaction_amount: 0,
      merchant_id: '',
      terminal_id: '',
      store_number: '',
      manual_entry_mode: false,
      ...gateways?.ebt
    }
  }));

  useEffect(() => {
    setLocalGateways({
      stripe: { enabled: false, test_mode: true, secret_key: '', publishable_key: '', manual_entry_mode: false, ...gateways?.stripe },
      shift4: { enabled: false, test_mode: true, access_token: '', api_key: '', company_name: '', merchant_id: '', ...gateways?.shift4 },
      non_integrated: { 
        enabled: false, 
        terminal_type: '', 
        require_approval_code: true, 
        require_last_4: true, 
        allow_notes: true, 
        ...gateways?.non_integrated 
      },
      ebt: {
        enabled: false,
        provider: 'manual',
        test_mode: true,
        require_pin: true,
        max_transaction_amount: 0,
        merchant_id: '',
        terminal_id: '',
        store_number: '',
        manual_entry_mode: false,
        ...gateways?.ebt
      }
    });
  }, [gateways]);

  const handleStripeChange = (field, value) => {
    setLocalGateways(prev => ({
      ...prev,
      stripe: { ...prev.stripe, [field]: value }
    }));
  };

  const handleShift4Change = (field, value) => {
    setLocalGateways(prev => ({
      ...prev,
      shift4: { ...prev.shift4, [field]: value }
    }));
  };

  const handleNonIntegratedChange = (field, value) => {
    setLocalGateways(prev => ({
      ...prev,
      non_integrated: { ...prev.non_integrated, [field]: value }
    }));
  };

  const handleSave = () => {
    onUpdateGateways(localGateways);
    toast({
      title: "Success",
      description: "Payment gateway settings saved.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Non-Integrated Terminal Card - Show first for simplicity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-purple-600" />
                Non-Integrated Card Terminal
              </CardTitle>
              <CardDescription>
                Use a standalone card terminal with manual confirmation (e.g., Verifone, Ingenico, Clover)
              </CardDescription>
            </div>
            <Switch
              checked={localGateways.non_integrated?.enabled}
              onCheckedChange={(checked) => handleNonIntegratedChange('enabled', checked)}
            />
          </div>
        </CardHeader>
        {localGateways.non_integrated?.enabled && (
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>How it works:</strong> Cashiers will process payments on your standalone terminal, 
                then manually confirm the transaction in the POS by entering approval codes and card details.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="terminal-type">Terminal Type/Model (Optional)</Label>
              <Input
                id="terminal-type"
                value={localGateways.non_integrated?.terminal_type || ''}
                onChange={(e) => handleNonIntegratedChange('terminal_type', e.target.value)}
                placeholder="e.g., Verifone VX520, Ingenico iCT250"
              />
              <p className="text-xs text-gray-500">For reference only - helps staff know which device to use</p>
            </div>

            <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-semibold text-sm">Required Information from Cashier:</h4>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="require-approval">Approval/Authorization Code</Label>
                  <p className="text-xs text-gray-500">Transaction approval code from terminal</p>
                </div>
                <Switch
                  id="require-approval"
                  checked={localGateways.non_integrated?.require_approval_code}
                  onCheckedChange={(checked) => handleNonIntegratedChange('require_approval_code', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="require-last4">Last 4 Digits of Card</Label>
                  <p className="text-xs text-gray-500">For receipt and audit purposes</p>
                </div>
                <Switch
                  id="require-last4"
                  checked={localGateways.non_integrated?.require_last_4}
                  onCheckedChange={(checked) => handleNonIntegratedChange('require_last_4', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="allow-notes">Allow Transaction Notes</Label>
                  <p className="text-xs text-gray-500">Optional notes field for cashiers</p>
                </div>
                <Switch
                  id="allow-notes"
                  checked={localGateways.non_integrated?.allow_notes}
                  onCheckedChange={(checked) => handleNonIntegratedChange('allow_notes', checked)}
                />
              </div>
            </div>

            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> Ensure your staff is trained to accurately enter transaction details. 
                Incorrect information may cause reconciliation issues.
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* Stripe Configuration Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Stripe Payment Gateway
              </CardTitle>
              <CardDescription>
                Process credit card payments securely with Stripe (Integrated).
              </CardDescription>
            </div>
            <Switch
              checked={localGateways.stripe?.enabled}
              onCheckedChange={(checked) => handleStripeChange('enabled', checked)}
            />
          </div>
        </CardHeader>
        {localGateways.stripe?.enabled && (
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="stripe-test-mode"
                checked={localGateways.stripe?.test_mode}
                onCheckedChange={(checked) => handleStripeChange('test_mode', checked)}
              />
              <Label htmlFor="stripe-test-mode">Enable Test Mode</Label>
            </div>
            {localGateways.stripe?.test_mode && (
              <div className="flex items-start p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3" />
                <p className="text-sm text-yellow-800">
                  Test mode is active. Only test card numbers will work. Use your Stripe test keys.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="stripe-pk">Publishable Key</Label>
              <Input
                id="stripe-pk"
                value={localGateways.stripe?.publishable_key || ''}
                onChange={(e) => handleStripeChange('publishable_key', e.target.value)}
                placeholder="pk_test_..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stripe-sk">Secret Key</Label>
              <Input
                id="stripe-sk"
                type="password"
                value={localGateways.stripe?.secret_key || ''}
                onChange={(e) => handleStripeChange('secret_key', e.target.value)}
                placeholder="sk_test_..."
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Stripe Terminal Provisioning - only relevant when Stripe is enabled */}
      {localGateways.stripe?.enabled && <StripeTerminalCard />}

      {/* Shift4 Configuration Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                Shift4 Payment Gateway
              </CardTitle>
              <CardDescription>
                Process payments through Shift4 Payments (Integrated).
              </CardDescription>
            </div>
            <Switch
              checked={localGateways.shift4?.enabled}
              onCheckedChange={(checked) => handleShift4Change('enabled', checked)}
            />
          </div>
        </CardHeader>
        {localGateways.shift4?.enabled && (
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="shift4-test-mode"
                checked={localGateways.shift4?.test_mode}
                onCheckedChange={(checked) => handleShift4Change('test_mode', checked)}
              />
              <Label htmlFor="shift4-test-mode">Enable Test Mode</Label>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="shift4-company">Company Name</Label>
              <Input
                id="shift4-company"
                value={localGateways.shift4?.company_name || ''}
                onChange={(e) => handleShift4Change('company_name', e.target.value)}
                placeholder="Your company name in Shift4"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shift4-merchant">Merchant ID</Label>
              <Input
                id="shift4-merchant"
                value={localGateways.shift4?.merchant_id || ''}
                onChange={(e) => handleShift4Change('merchant_id', e.target.value)}
                placeholder="Your Shift4 merchant ID"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shift4-api-key">API Key</Label>
              <Input
                id="shift4-api-key"
                type="password"
                value={localGateways.shift4?.api_key || ''}
                onChange={(e) => handleShift4Change('api_key', e.target.value)}
                placeholder="Your Shift4 API key"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shift4-token">Access Token</Label>
              <Input
                id="shift4-token"
                type="password"
                value={localGateways.shift4?.access_token || ''}
                onChange={(e) => handleShift4Change('access_token', e.target.value)}
                placeholder="Your Shift4 access token"
              />
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Get your Shift4 credentials from the Shift4 Merchant Portal at <strong>shift4.com</strong>
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* EBT/SNAP Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-green-600" />
                EBT/SNAP Payment Processing
              </CardTitle>
              <CardDescription>
                Electronic Benefit Transfer & Supplemental Nutrition Assistance Program
              </CardDescription>
            </div>
            <Switch
              checked={localGateways.ebt.enabled}
              onCheckedChange={(checked) =>
                setLocalGateways(prev => ({
                  ...prev,
                  ebt: { ...prev.ebt, enabled: checked }
                }))
              }
            />
          </div>
        </CardHeader>

        {localGateways.ebt.enabled && (
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="ebt-provider">EBT Provider</Label>
              <Select
                value={localGateways.ebt.provider}
                onValueChange={(value) =>
                  setLocalGateways(prev => ({
                    ...prev,
                    ebt: { ...prev.ebt, provider: value }
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Entry</SelectItem>
                  <SelectItem value="fis">FIS</SelectItem>
                  <SelectItem value="first_data">First Data</SelectItem>
                  <SelectItem value="worldpay">Worldpay</SelectItem>
                  <SelectItem value="clover">Clover</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="ebt-merchant-id">Merchant ID</Label>
              <Input
                id="ebt-merchant-id"
                placeholder="Enter EBT merchant ID"
                value={localGateways.ebt.merchant_id || ''}
                onChange={(e) =>
                  setLocalGateways(prev => ({
                    ...prev,
                    ebt: { ...prev.ebt, merchant_id: e.target.value }
                  }))
                }
              />
            </div>

            <div>
              <Label htmlFor="ebt-terminal-id">Terminal ID</Label>
              <Input
                id="ebt-terminal-id"
                placeholder="Enter terminal ID"
                value={localGateways.ebt.terminal_id || ''}
                onChange={(e) =>
                  setLocalGateways(prev => ({
                    ...prev,
                    ebt: { ...prev.ebt, terminal_id: e.target.value }
                  }))
                }
              />
            </div>

            <div>
              <Label htmlFor="ebt-store-number">Store Number</Label>
              <Input
                id="ebt-store-number"
                placeholder="Store number for reporting"
                value={localGateways.ebt.store_number || ''}
                onChange={(e) =>
                  setLocalGateways(prev => ({
                    ...prev,
                    ebt: { ...prev.ebt, store_number: e.target.value }
                  }))
                }
              />
            </div>

            <div>
              <Label htmlFor="ebt-max-amount">Maximum Transaction Amount</Label>
              <Input
                id="ebt-max-amount"
                type="number"
                step="0.01"
                placeholder="0 = no limit"
                value={localGateways.ebt.max_transaction_amount || 0}
                onChange={(e) =>
                  setLocalGateways(prev => ({
                    ...prev,
                    ebt: { ...prev.ebt, max_transaction_amount: parseFloat(e.target.value) || 0 }
                  }))
                }
              />
              <p className="text-xs text-gray-500 mt-1">
                Set to 0 for no limit, or specify maximum amount
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="ebt-require-pin">Require PIN Entry</Label>
              <Switch
                id="ebt-require-pin"
                checked={localGateways.ebt.require_pin}
                onCheckedChange={(checked) =>
                  setLocalGateways(prev => ({
                    ...prev,
                    ebt: { ...prev.ebt, require_pin: checked }
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="ebt-test-mode">Test Mode</Label>
              <Switch
                id="ebt-test-mode"
                checked={localGateways.ebt.test_mode}
                onCheckedChange={(checked) =>
                  setLocalGateways(prev => ({
                    ...prev,
                    ebt: { ...prev.ebt, test_mode: checked }
                  }))
                }
              />
            </div>

            {/* Manual Entry Mode for EBT */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="font-medium">Manual Entry Mode</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Enable if using a standalone EBT terminal (non-integrated)
                </p>
              </div>
              <Switch
                checked={localGateways.ebt.manual_entry_mode}
                onCheckedChange={(checked) =>
                  setLocalGateways(prev => ({ ...prev, ebt: { ...prev.ebt, manual_entry_mode: checked } }))
                }
              />
            </div>

            {localGateways.ebt.manual_entry_mode && (
              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  In manual entry mode, cashiers will process payments on your standalone terminal
                  and then confirm the transaction in the POS system.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        )}
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Save Gateway Settings
        </Button>
      </div>
    </div>
  );
}