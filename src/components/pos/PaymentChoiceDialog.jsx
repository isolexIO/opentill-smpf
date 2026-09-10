import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, DollarSign, CreditCard, Banknote, CheckCircle, Wallet } from 'lucide-react';

export default function PaymentChoiceDialog({ 
  isOpen, 
  onClose, 
  onCashSelected,
  onEbtSelected,
  onCustomerTerminalSelected, 
  onWalletSelected,
  order,
  cart = [],
  totals,
  settings,
  waitingForCustomer,
  customerSelectedMethod
}) {
  
  // Check if EBT is enabled and there are EBT-eligible items
  const isEbtEnabled = settings?.payment_gateways?.ebt?.enabled;
  const hasEbtItems = cart.some(item => item?.ebt_eligible);
  const ebtEligibleTotal = parseFloat(totals?.ebtEligibleTotal || 0);
  const showEbtOption = isEbtEnabled && hasEbtItems && ebtEligibleTotal > 0;

  // Apple Pay / Google Pay via Stripe-hosted Checkout. Requires the merchant's
  // own Stripe Connect account to be connected + charges-enabled. The actual
  // charges_enabled check happens server-side; here we only gate the button on
  // the merchant having Stripe enabled with a connected account id.
  const showWalletOption = !!(settings?.payment_gateways?.stripe?.enabled && settings?.payment_gateways?.stripe?.account_id);

  console.log('PaymentChoiceDialog: Rendering', {
    isOpen,
    waitingForCustomer,
    customerSelectedMethod,
    orderId: order?.id,
    showEbtOption
  });

  if (waitingForCustomer) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md dark:bg-gray-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Waiting for Customer</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center space-y-4">
            <Loader2 className="w-16 h-16 mx-auto animate-spin text-blue-600" />
            <div>
              <p className="text-lg font-medium mb-2 dark:text-white">
                {customerSelectedMethod 
                  ? `Customer selected: ${customerSelectedMethod}`
                  : 'Customer is selecting payment method...'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {customerSelectedMethod
                  ? 'Proceeding with payment...'
                  : 'Please wait while the customer makes their selection on the customer display.'}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md dark:bg-gray-800 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="dark:text-white">Select Payment Method</DialogTitle>
        </DialogHeader>
        
        <div className="py-6 space-y-4">
          <p className="text-center text-gray-600 dark:text-gray-300 mb-4">
            How would you like to collect payment?
          </p>

          <div className="grid gap-3">
            {/* Cash Payment */}
            <Button
              onClick={onCashSelected}
              variant="outline"
              className="h-20 flex items-center justify-start gap-4 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-500 dark:border-gray-600 dark:text-white"
            >
              <DollarSign className="w-8 h-8 text-green-600 dark:text-green-400" />
              <div className="text-left">
                <div className="font-semibold text-lg">Cash</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Process cash payment at POS</div>
              </div>
            </Button>

            {/* EBT Payment */}
            {showEbtOption && (
              <Button
                onClick={onEbtSelected}
                variant="outline"
                className="h-20 flex items-center justify-start gap-4 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-500 dark:border-gray-600 dark:text-white"
              >
                <Banknote className="w-8 h-8 text-green-600 dark:text-green-400" />
                <div className="text-left">
                  <div className="font-semibold text-lg">EBT/SNAP</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Eligible: ${ebtEligibleTotal.toFixed(2)}
                  </div>
                </div>
              </Button>
            )}

            {/* Customer Terminal */}
            <Button
              onClick={onCustomerTerminalSelected}
              variant="outline"
              className="h-20 flex items-center justify-start gap-4 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-500 dark:border-gray-600 dark:text-white"
            >
              <CreditCard className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <div className="text-left">
                <div className="font-semibold text-lg">Customer Terminal</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Send to customer display for card/crypto payment
                </div>
              </div>
            </Button>

            {/* Apple Pay / Google Pay (Stripe-hosted Checkout) */}
            {showWalletOption && (
              <Button
                onClick={onWalletSelected}
                variant="outline"
                className="h-20 flex items-center justify-start gap-4 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-500 dark:border-gray-600 dark:text-white"
              >
                <Wallet className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                <div className="text-left">
                  <div className="font-semibold text-lg">Apple Pay / Google Pay</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Tap to pay on this device
                  </div>
                </div>
              </Button>
            )}
          </div>

          {showEbtOption && (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                <div className="text-sm text-green-800 dark:text-green-200">
                  <strong>EBT/SNAP eligible items detected</strong>
                  <p className="mt-1">
                    ${ebtEligibleTotal.toFixed(2)} can be paid with EBT benefits. 
                    {ebtEligibleTotal < parseFloat(totals?.cashTotal || 0) && 
                      ` Remaining balance can be paid with cash or card.`
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}