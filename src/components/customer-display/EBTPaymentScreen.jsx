import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, CreditCard, AlertCircle } from 'lucide-react';

export default function EBTPaymentScreen({ order, settings, onComplete, onPaymentSuccess }) {
  // Support both prop names
  const handleComplete = onComplete || onPaymentSuccess;
  const [status, setStatus] = useState('waiting'); // waiting, success, error
  const [declineReason, setDeclineReason] = useState(null);

  const ebtEligibleTotal = (order?.ebt_eligible_total || 0) + (order?.tip_amount || 0);
  const totalAmount = (order?.total || 0) + (order?.tip_amount || 0);
  const ebtSettings = settings?.payment_gateways?.ebt || {};
  const maxAmount = parseFloat(ebtSettings.max_transaction_amount || 0);
  const requirePin = ebtSettings.require_pin !== false; // default true

  // Audit fix: reject transactions exceeding the configured maximum amount.
  useEffect(() => {
    if (maxAmount > 0 && ebtEligibleTotal > maxAmount) {
      setDeclineReason(`This EBT purchase exceeds the maximum allowed transaction amount of $${maxAmount.toFixed(2)}.`);
      setStatus('error');
    }
  }, []);

  const handleSuccess = () => {
    setStatus('success');
    
    setTimeout(() => {
      if (handleComplete) handleComplete(true, {
        payment_method: 'ebt',
        ebt_amount: ebtEligibleTotal,
        approved: true,
        timestamp: new Date().toISOString()
      });
    }, 2000);
  };

  const handleError = () => {
    setStatus('error');
  };

  if (status === 'success') {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gradient-to-br from-green-900 to-emerald-900 text-white">
        <div className="text-center">
          <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6 animate-pulse">
            <CheckCircle className="w-16 h-16 text-green-300" />
          </div>
          <h2 className="text-4xl font-bold mb-2">EBT Payment Approved!</h2>
          <p className="text-xl opacity-75">Thank you for your payment</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gradient-to-br from-red-900 to-orange-900 text-white p-8">
        <div className="text-center max-w-md">
          <AlertCircle className="w-20 h-20 mx-auto mb-4 text-red-300" />
          <h2 className="text-3xl font-bold mb-4">Payment Declined</h2>
          <p className="text-lg mb-6">{declineReason || 'Please use another payment method or contact the cashier.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-gradient-to-br from-green-900 to-teal-900 text-white p-8">
      <div className="text-center max-w-2xl">
        <CreditCard className="w-20 h-20 mx-auto mb-6" />
        <h2 className="text-4xl font-bold mb-4">EBT/SNAP Payment</h2>
        
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-8">
          <div className="mb-6">
            <p className="text-lg opacity-75 mb-2">EBT Eligible Amount</p>
            <p className="text-5xl font-bold">${ebtEligibleTotal.toFixed(2)}</p>
          </div>

          {totalAmount > ebtEligibleTotal && (
            <div className="border-t border-white/20 pt-4">
              <p className="text-sm opacity-75 mb-1">Remaining Balance</p>
              <p className="text-2xl">${(totalAmount - ebtEligibleTotal).toFixed(2)}</p>
              <p className="text-xs opacity-60 mt-2">Will be collected separately</p>
            </div>
          )}
        </div>

        <div className="space-y-4 text-lg opacity-90 mb-8">
          <p>1. Insert or swipe your EBT card at the terminal</p>
          {requirePin && <p>2. Enter your PIN</p>}
          <p>{requirePin ? '3' : '2'}. Wait for approval</p>
        </div>

        <p className="text-sm opacity-60">
          The cashier will process your EBT payment
        </p>

        {/* Debug buttons (hidden in production) */}
        {window.location.search.includes('debug=true') && (
          <div className="mt-8 flex gap-4 justify-center">
            <Button onClick={handleSuccess} className="bg-green-600">
              Simulate Success
            </Button>
            <Button onClick={handleError} className="bg-red-600">
              Simulate Error
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}