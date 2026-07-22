import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Loader2, AlertCircle, CreditCard } from 'lucide-react';

export default function PayInvoice() {
  const [params] = useSearchParams();
  const invoiceId = params.get('invoice');
  const token = params.get('token');
  const paid = params.get('paid') === '1';
  const canceled = params.get('canceled') === '1';
  const sessionId = params.get('session_id');

  const [invoice, setInvoice] = useState(null);
  const [merchantName, setMerchantName] = useState('');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmedPaid, setConfirmedPaid] = useState(false);

  const fmtMoney = (n, c) => new Intl.NumberFormat('en-US', { style: 'currency', currency: c || 'USD' }).format(n || 0);

  useEffect(() => {
    (async () => {
      if (!invoiceId || !token) {
        setError('Invalid payment link.');
        setLoading(false);
        return;
      }
      try {
        const res = await base44.functions.invoke('getInvoicePublic', { invoice_id: invoiceId, token });
        setInvoice(res.data.invoice);
        setMerchantName(res.data.merchant_name);

        if (paid && sessionId) {
          setConfirming(true);
          try {
            const r = await base44.functions.invoke('confirmInvoicePayment', { invoice_id: invoiceId, token, session_id: sessionId });
            if (r.data?.status === 'paid') setConfirmedPaid(true);
          } catch (_) {
            // leave as not confirmed
          } finally {
            setConfirming(false);
          }
        }
      } catch (e) {
        setError(e.response?.data?.error || e.message || 'Unable to load invoice');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pay = async () => {
    try {
      setPaying(true);
      const res = await base44.functions.invoke('createInvoiceCheckoutSession', { invoice_id: invoiceId, token });
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        setError('Unable to start checkout.');
        setPaying(false);
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Checkout failed');
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error && !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-10 text-center">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <p className="font-semibold text-gray-800">Payment link unavailable</p>
            <p className="text-sm text-gray-500 mt-1">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPaid = invoice?.status === 'paid' || confirmedPaid;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-6 space-y-5">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, #42A5F5 0%, #C6EF50 100%)' }}>
              <CreditCard className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Pay {merchantName}</h1>
            <p className="text-sm text-gray-500">Invoice {invoice?.invoice_number}</p>
          </div>

          {isPaid ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="font-semibold text-gray-800">Payment complete</p>
              <p className="text-sm text-gray-500 mt-1">Thank you! Your invoice has been paid.</p>
            </div>
          ) : confirming ? (
            <div className="text-center py-6">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Confirming your payment…</p>
            </div>
          ) : canceled ? (
            <div className="text-center py-4">
              <AlertCircle className="w-10 h-10 text-orange-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Checkout was canceled. You can try again below.</p>
            </div>
          ) : null}

          {!isPaid && !confirming && (
            <>
              <div className="space-y-2 border-t border-b py-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Billed to</span>
                  <span className="font-medium text-gray-800">{invoice?.customer_name || '—'}</span>
                </div>
                {invoice?.due_date && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Due date</span>
                    <span className="font-medium text-gray-800">{new Date(invoice.due_date).toLocaleDateString()}</span>
                  </div>
                )}
                {invoice?.notes && (
                  <div className="text-sm text-gray-600 pt-2 border-t">{invoice.notes}</div>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Amount due</span>
                <span className="text-2xl font-bold text-gray-900">{fmtMoney(invoice?.amount, invoice?.currency)}</span>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button className="w-full" size="lg" onClick={pay} disabled={paying}>
                {paying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redirecting…</> : 'Pay Now'}
              </Button>
              <p className="text-xs text-gray-400 text-center">Secure checkout powered by Stripe</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}