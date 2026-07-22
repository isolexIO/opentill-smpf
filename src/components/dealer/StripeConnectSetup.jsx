import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink,
  Loader2,
  DollarSign
} from 'lucide-react';

export default function StripeConnectSetup({ dealer, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [connectUrl, setConnectUrl] = useState('');
  const [status, setStatus] = useState({
    connected: dealer?.stripe_connected || false,
    accountId: dealer?.stripe_account_id || '',
    chargesEnabled: false,
    payoutsEnabled: false
  });

  useEffect(() => {
    if (dealer?.stripe_account_id) {
      checkAccountStatus();
    }
  }, [dealer]);

  const checkAccountStatus = async () => {
    try {
      const response = await base44.functions.invoke('checkStripeConnectStatus', {
        dealer_id: dealer.id,
        account_id: dealer.stripe_account_id
      });

      if (response.data.success) {
        setStatus({
          connected: true,
          accountId: dealer.stripe_account_id,
          chargesEnabled: response.data.charges_enabled,
          payoutsEnabled: response.data.payouts_enabled
        });
      }
    } catch (error) {
      console.error('Error checking Stripe status:', error);
    }
  };

  const handleStartConnect = async () => {
    try {
      setLoading(true);
      
      const response = await base44.functions.invoke('createStripeConnectAccount', {
        dealer_id: dealer.id,
        business_name: dealer.name,
        business_email: dealer.contact_email,
        return_url: window.location.href,
        refresh_url: window.location.href
      });

      if (response.data.success) {
        window.location.href = response.data.onboarding_url;
      }
    } catch (error) {
      console.error('Error creating Stripe Connect account:', error);
      alert('Failed to start Stripe Connect setup');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshOnboarding = async () => {
    try {
      setLoading(true);
      
      const response = await base44.functions.invoke('refreshStripeConnectOnboarding', {
        dealer_id: dealer.id,
        account_id: dealer.stripe_account_id
      });

      if (response.data.success) {
        window.location.href = response.data.onboarding_url;
      }
    } catch (error) {
      console.error('Error refreshing onboarding:', error);
      alert('Failed to refresh Stripe Connect onboarding');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Stripe? This will stop automated payouts.')) {
      return;
    }

    try {
      setLoading(true);
      
      await base44.entities.Dealer.update(dealer.id, {
        stripe_connected: false,
        stripe_account_id: '',
        billing_mode: 'root_fallback'
      });

      setStatus({
        connected: false,
        accountId: '',
        chargesEnabled: false,
        payoutsEnabled: false
      });

      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error disconnecting Stripe:', error);
      alert('Failed to disconnect Stripe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          openTILL Payments powered by Stripe - Automated Payouts
        </CardTitle>
        <CardDescription>
          Connect your openTILL Payments account to receive automated commission payouts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!status.connected ? (
          <>
            <Alert>
              <DollarSign className="h-4 w-4" />
              <AlertDescription>
                By connecting openTILL Payments powered by Stripe, you'll receive automated commission payouts directly to your bank account. 
                Payouts are processed monthly based on your merchant billing cycles.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <h4 className="font-semibold">Benefits of openTILL Payments powered by Stripe:</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Automated monthly commission payouts
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Direct bank deposits (2-3 business days)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Real-time earnings tracking
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Detailed payout reports and tax documentation
                </li>
              </ul>
            </div>

            <Button 
              onClick={handleStartConnect}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Connect openTILL Payments Account
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900 dark:text-green-100">
                    openTILL Payments Connected
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Account ID: {status.accountId.substring(0, 20)}...
                  </p>
                </div>
              </div>
              <Badge variant={status.payoutsEnabled ? 'default' : 'secondary'}>
                {status.payoutsEnabled ? 'Payouts Active' : 'Setup Pending'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-lg">
                <p className="text-sm text-gray-500">Charges</p>
                <div className="flex items-center gap-2 mt-1">
                  {status.chargesEnabled ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                  )}
                  <span className="font-medium">
                    {status.chargesEnabled ? 'Enabled' : 'Pending'}
                  </span>
                </div>
              </div>

              <div className="p-3 border rounded-lg">
                <p className="text-sm text-gray-500">Payouts</p>
                <div className="flex items-center gap-2 mt-1">
                  {status.payoutsEnabled ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                  )}
                  <span className="font-medium">
                    {status.payoutsEnabled ? 'Enabled' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>

            {!status.payoutsEnabled && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Complete your Stripe onboarding to enable automated payouts
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              {!status.payoutsEnabled && (
                <Button 
                  onClick={handleRefreshOnboarding}
                  disabled={loading}
                  variant="outline"
                  className="flex-1"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Complete Setup
                </Button>
              )}
              <Button 
                onClick={handleDisconnect}
                disabled={loading}
                variant="destructive"
                className="flex-1"
              >
                Disconnect
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}