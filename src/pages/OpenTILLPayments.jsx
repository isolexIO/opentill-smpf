import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ExternalLink, LayoutDashboard, ArrowLeft, CheckCircle2, CreditCard } from 'lucide-react';
import OpenTILLPaymentsLogo from '@/components/payment/OpenTILLPaymentsLogo';
import StripeConnectOnboarding from '@/components/settings/StripeConnectOnboarding';
import StripeTerminalCard from '@/components/settings/StripeTerminalCard';

export default function OpenTILLPayments() {
  const [merchantId, setMerchantId] = useState(null);
  const [accountId, setAccountId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dashboardUrl, setDashboardUrl] = useState(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await base44.auth.me();
        if (me?.merchant_id) {
          setMerchantId(me.merchant_id);
          const merchants = await base44.entities.Merchant.filter({ id: me.merchant_id });
          if (mounted && merchants && merchants.length > 0) {
            setAccountId(merchants[0].settings?.payment_gateways?.stripe?.account_id || null);
          }
        } else {
          if (mounted) setError('No merchant account linked to your user.');
        }
      } catch (e) {
        if (mounted) setError('Sign in to manage your payment settings.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleOpenDashboard = async () => {
    if (!merchantId) return;
    setGeneratingLink(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('getStripeDashboardLink', { merchant_id: merchantId });
      if (res.data?.dashboard_url) {
        window.open(res.data.dashboard_url, '_blank');
      } else {
        setError(res.data?.error || 'Could not generate dashboard link.');
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed to generate dashboard link.');
    } finally {
      setGeneratingLink(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => window.location.href = createPageUrl('SystemMenu')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 flex justify-center">
            <OpenTILLPaymentsLogo height="h-auto" width="w-[350px]" scale={2.5} />
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="dashboard">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="connection">
              <CreditCard className="w-4 h-4 mr-2" />
              Connection
            </TabsTrigger>
            <TabsTrigger value="terminal">
              <ExternalLink className="w-4 h-4 mr-2" />
              Terminal
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LayoutDashboard className="w-5 h-5 text-indigo-600" />
                  Stripe Dashboard
                </CardTitle>
                <CardDescription>
                  Access your openTILL Payments powered by Stripe dashboard to view payments, payouts, and account details.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {accountId ? (
                  <>
                    <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                      <div className="flex-1 text-sm">
                        <p className="font-medium text-green-800">openTILL Payments account connected</p>
                        <p className="text-green-700 font-mono text-xs mt-1">{accountId}</p>
                        <p className="text-xs text-green-600 mt-2">
                          Click the button below to open your Stripe Express dashboard in a new tab. You can view transactions, payouts, and manage your account details there.
                        </p>
                      </div>
                    </div>
                    <Button onClick={handleOpenDashboard} disabled={generatingLink} className="w-full" size="lg">
                      {generatingLink ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ExternalLink className="w-4 h-4 mr-2" />}
                      Open Stripe Dashboard
                    </Button>
                  </>
                ) : (
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <CreditCard className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium">No openTILL Payments account connected</p>
                      <p className="text-gray-500 text-xs mt-1">
                        Go to the <strong>Connection</strong> tab to sign up and connect your Stripe account.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="connection">
            <StripeConnectOnboarding />
          </TabsContent>

          <TabsContent value="terminal">
            <StripeTerminalCard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}