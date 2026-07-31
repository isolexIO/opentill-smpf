import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CreditCard, CheckCircle2, ExternalLink, AlertCircle, Percent, DollarSign } from 'lucide-react';
import OpenTILLPaymentsLogo from '@/components/payment/OpenTILLPaymentsLogo';

// Standard openTILL Payments pricing — Stripe in-person (card-present) processing + openTILL platform fee
const STRIPE_PROCESSING_PERCENT = 2.7;
const STRIPE_FLAT_FEE = 0.05;
const PLATFORM_FEE_PERCENT = 0.80;
const EFFECTIVE_RATE_PERCENT = STRIPE_PROCESSING_PERCENT + PLATFORM_FEE_PERCENT; // 3.50%

// Lets a merchant sign up for / connect their Stripe Connect account directly
// from the Payment Gateways settings tab. Payments then route through Stripe Terminal.
export default function StripeConnectOnboarding() {
  const { toast } = useToast();
  const [merchantId, setMerchantId] = useState(null);
  const [accountId, setAccountId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
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
        if (mounted) setError('Sign in to set up card payments.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleStart = async () => {
    if (!merchantId) return;
    setStarting(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('createMerchantStripeConnect', {
        merchant_id: merchantId,
        return_url: window.location.href,
        refresh_url: window.location.href,
      });
      if (res.data?.onboarding_url) {
        window.location.href = res.data.onboarding_url;
      } else {
        setError(res.data?.error || 'Could not start Stripe onboarding.');
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed to start Stripe onboarding.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-3">
              <OpenTILLPaymentsLogo height="h-7" />
              <span className="text-xs text-slate-400 font-normal">powered by Stripe</span>
            </CardTitle>
            <CardDescription>
              Sign up for card payments through openTILL Payments powered by Stripe. Connect your account to accept credit and debit cards.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pricing Summary */}
        <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-900">openTILL Payments Pricing</p>
              <p className="text-xs text-blue-600">Transparent, all-inclusive per-transaction rate</p>
            </div>
            <OpenTILLPaymentsLogo height="h-6" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg bg-white/70 p-3 text-center">
              <Percent className="w-4 h-4 text-blue-600 mx-auto mb-1" />
              <p className="text-lg font-black text-blue-900">{EFFECTIVE_RATE_PERCENT.toFixed(2)}%</p>
              <p className="text-[11px] text-blue-600 leading-tight">Effective rate<br/>(Stripe + platform)</p>
            </div>
            <div className="rounded-lg bg-white/70 p-3 text-center">
              <DollarSign className="w-4 h-4 text-blue-600 mx-auto mb-1" />
              <p className="text-lg font-black text-blue-900">${STRIPE_FLAT_FEE.toFixed(2)}</p>
              <p className="text-[11px] text-blue-600 leading-tight">Flat fee<br/>per transaction</p>
            </div>
            <div className="rounded-lg bg-white/70 p-3 text-center">
              <p className="text-lg font-black text-blue-900">$0</p>
              <p className="text-[11px] text-blue-600 leading-tight">Monthly fees<br/>or hidden costs</p>
            </div>
          </div>

          <div className="rounded-lg bg-white/80 p-3 text-xs space-y-1.5">
            <div className="flex justify-between text-slate-600">
              <span>Stripe processing</span>
              <span className="font-medium">{STRIPE_PROCESSING_PERCENT.toFixed(2)}% + ${STRIPE_FLAT_FEE.toFixed(2)}/txn</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>openTILL platform fee</span>
              <span className="font-medium">{PLATFORM_FEE_PERCENT.toFixed(2)}%</span>
            </div>
            <div className="border-t border-slate-200 pt-1.5 flex justify-between text-blue-900 font-bold">
              <span>You pay per card transaction</span>
              <span>{EFFECTIVE_RATE_PERCENT.toFixed(2)}% + ${STRIPE_FLAT_FEE.toFixed(2)}</span>
            </div>
          </div>

          <p className="text-[11px] text-blue-500 leading-tight">
            Enable Dual Pricing in your settings to automatically pass this fee to card-paying customers, so you absorb zero processing cost.
          </p>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
          </div>
        )}

        {error && !loading && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loading && accountId && (
          <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-green-800">openTILL Payments account connected</p>
              <p className="text-green-700 font-mono text-xs">{accountId}</p>
              <p className="text-xs text-green-600 mt-1">
                Resume onboarding in openTILL Payments powered by Stripe to finish or update your details.
              </p>
            </div>
          </div>
        )}

        {!loading && !accountId && !error && (
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <CreditCard className="w-5 h-5 text-gray-500 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">No openTILL Payments account connected yet</p>
              <p className="text-gray-500 text-xs mt-1">
                Click below to sign up and connect your openTILL Payments account. You'll be redirected to Stripe to complete onboarding.
              </p>
            </div>
          </div>
        )}

        {!loading && (
          <Button onClick={handleStart} disabled={starting || !merchantId} className="w-full">
            {starting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ExternalLink className="w-4 h-4 mr-2" />}
            {accountId ? 'Resume openTILL Payments Onboarding' : 'Sign Up with openTILL Payments'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}