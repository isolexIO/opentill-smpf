import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Gift, CreditCard, CheckCircle2, AlertCircle, Package, ExternalLink } from 'lucide-react';

export default function ReaderOfferCard({ merchantId, stripeConnected }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [readerProgram, setReaderProgram] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (merchantId) loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantId]);

  // Check for return from Stripe Checkout (setup mode)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const depositStatus = params.get('reader_deposit');
    const sessionId = params.get('session_id');
    if (depositStatus === 'success' && sessionId && merchantId) {
      confirmDeposit(sessionId);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (depositStatus === 'cancelled') {
      setError('Card setup was cancelled. You can try again anytime.');
      window.history.replaceState({}, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantId]);

  const loadStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await base44.auth.me();
      if (!me?.merchant_id) { setLoading(false); return; }
      const merchants = await base44.entities.Merchant.filter({ id: me.merchant_id });
      if (merchants?.length > 0) {
        setReaderProgram(merchants[0].settings?.reader_program || null);
      }
    } catch (e) {
      setError('Could not load reader program status.');
    } finally {
      setLoading(false);
    }
  };

  const confirmDeposit = async (sessionId) => {
    setConfirming(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('confirmReaderDeposit', {
        session_id: sessionId,
        merchant_id: merchantId,
      });
      if (res.data?.success) {
        toast({
          title: 'Card saved successfully!',
          description: `Your card ending in ${res.data.card_last4 || '****'} is on file for the free reader program.`,
        });
        await loadStatus();
      } else {
        setError(res.data?.error || 'Could not confirm card setup.');
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed to confirm card setup.');
    } finally {
      setConfirming(false);
    }
  };

  const handleGetReader = async () => {
    if (!merchantId) return;
    setStarting(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('setupReaderDeposit', {
        merchant_id: merchantId,
        return_url: window.location.href,
      });
      if (res.data?.checkout_url) {
        window.location.href = res.data.checkout_url;
      } else {
        setError(res.data?.error || 'Could not start card setup.');
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed to start card setup.');
    } finally {
      setStarting(false);
    }
  };

  if (!stripeConnected) return null;

  return (
    <Card className="border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-blue-600" />
          Free Stripe Reader M2
        </CardTitle>
        <CardDescription>
          Get a free Stripe Reader M2 (contactless + chip) with your new openTILL Payments account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
          </div>
        )}

        {confirming && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <Loader2 className="w-4 h-4 animate-spin" /> Confirming your card setup...
          </div>
        )}

        {error && !loading && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loading && !readerProgram?.payment_method_id && (
          <>
            <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Package className="w-10 h-10 text-blue-600" />
                <div>
                  <p className="font-bold text-blue-900">FREE Stripe Reader M2</p>
                  <p className="text-xs text-blue-600">Contactless + chip card reader</p>
                </div>
              </div>
              <ul className="text-sm text-slate-700 space-y-1.5 pl-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                  Free reader shipped with your new account
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                  No charge at enrollment — just keep a card on file
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  Return within 30 days of cancellation or pay $100 non-return fee
                </li>
              </ul>
            </div>

            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 space-y-1">
              <p className="font-semibold">Terms Summary:</p>
              <p>• You must return the reader in good working order within 30 days of cancellation.</p>
              <p>• "Good working order" means: no physical/liquid damage, powers on, connects to network, reads cards, and includes all original accessories.</p>
              <p>• If not returned or not in good working order, your card on file will be charged $100 automatically after the 30-day period.</p>
              <p className="text-amber-600 mt-1">See the full Terms of Service for complete details.</p>
            </div>

            <Button onClick={handleGetReader} disabled={starting} className="w-full" size="lg">
              {starting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
              {starting ? 'Redirecting to Stripe...' : 'Get Your Free Reader'}
            </Button>
            <p className="text-[11px] text-gray-400 text-center">
              You'll be redirected to Stripe to securely enter your card. By clicking, you agree to the reader program terms.
            </p>
          </>
        )}

        {!loading && readerProgram?.payment_method_id && (
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-medium text-green-800">Card on file for reader program</p>
                <p className="text-green-700 text-xs mt-1">
                  {readerProgram.card_brand ? readerProgram.card_brand.charAt(0).toUpperCase() + readerProgram.card_brand.slice(1) : 'Card'} ending in {readerProgram.card_last4 || '****'}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Enrolled on {new Date(readerProgram.agreed_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3 text-center">
                <Package className={`w-5 h-5 mx-auto mb-1 ${readerProgram.reader_shipped ? 'text-green-600' : 'text-gray-400'}`} />
                <p className="text-xs font-medium">{readerProgram.reader_shipped ? 'Reader Shipped' : 'Reader Pending'}</p>
                <p className="text-[11px] text-gray-500">{readerProgram.reader_shipped ? 'On its way to you' : 'Will ship shortly'}</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <AlertCircle className={`w-5 h-5 mx-auto mb-1 ${readerProgram.fee_charged ? 'text-red-500' : 'text-gray-400'}`} />
                <p className="text-xs font-medium">{readerProgram.fee_charged ? 'Fee Charged' : 'No Fee Charged'}</p>
                <p className="text-[11px] text-gray-500">{readerProgram.fee_charged ? '$100 non-return fee' : 'Return reader if canceling'}</p>
              </div>
            </div>

            <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-700">
              <p className="font-medium mb-1">Return Instructions:</p>
              <p>If you cancel your openTILL Payments account, return the reader within 30 days to avoid the $100 non-return fee. Contact support for the return shipping address.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}