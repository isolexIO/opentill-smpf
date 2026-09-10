import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Coins, CreditCard as CreditCardIcon, Banknote, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useLanguage } from "@/lib/i18n/useLanguage";

export default function PaymentModal({
  isOpen,
  onClose,
  totals,
  onProcessPayment,
  onStartInteractivePayment,
  settings,
  cart,
  order,
}) {
  const { t } = useLanguage();
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [cashReceived, setCashReceived] = useState("");
  const [change, setChange] = useState(0);
  
  // EBT-specific state
  const [ebtAmount, setEbtAmount] = useState("");
  const [ebtApprovalCode, setEbtApprovalCode] = useState("");
  const [ebtLast4, setEbtLast4] = useState("");
  const [otherPaymentMethod, setOtherPaymentMethod] = useState(null);

  // Manual confirmation state (for non-integrated terminals)
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactionNotes, setTransactionNotes] = useState("");
  const [manualApprovalCode, setManualApprovalCode] = useState("");
  const [manualLast4, setManualLast4] = useState("");

  const isDualPricingActive = settings?.pricing_and_surcharge?.enable_dual_pricing;
  const isEbtEnabled = settings?.payment_gateways?.ebt?.enabled;
  const isEbtManual = settings?.payment_gateways?.ebt?.manual_entry_mode;
  const isNonIntegratedEnabled = settings?.payment_gateways?.non_integrated?.enabled;
  const isCardManual = settings?.payment_gateways?.stripe?.manual_entry_mode;
  
  const finalTipAmount = order?.tip_amount || 0;
  const finalCardTotal = parseFloat(totals.cardTotal) + finalTipAmount;
  const finalCashTotal = parseFloat(totals.cashTotal) + finalTipAmount;
  const ebtEligibleTotal = parseFloat(totals.ebtEligibleTotal || 0);
  const hasEbtItems = ebtEligibleTotal > 0;

  useEffect(() => {
    if (cashReceived) {
      const received = parseFloat(cashReceived);
      if (!isNaN(received)) {
        const newChange = received - finalCashTotal;
        setChange(newChange > 0 ? newChange : 0);
      }
    } else {
      setChange(0);
    }
  }, [cashReceived, finalCashTotal]);
  
  useEffect(() => {
    if (isOpen) {
      // Check if we should auto-select EBT
      if (window.posShowEbtPayment && isEbtEnabled && hasEbtItems) {
        setSelectedMethod('ebt');
        delete window.posShowEbtPayment;
      } else if (order?.status === 'payment_in_progress' && order?.payment_method === 'card') {
        setSelectedMethod('card_processing');
      } else {
        setSelectedMethod(null);
      }
      setCashReceived("");
      setChange(0);
      setEbtAmount("");
      setEbtApprovalCode("");
      setEbtLast4("");
      setOtherPaymentMethod(null);
      setIsProcessing(false);
      setTransactionNotes("");
      setManualApprovalCode("");
      setManualLast4("");
    }
  }, [isOpen, order, isEbtEnabled, hasEbtItems]);

  const handlePayment = (method) => {
    const paymentData = {
      method: method,
      tipAmount: finalTipAmount,
      total: (method === 'cash' || method === 'ebt') ? finalCashTotal : finalCardTotal,
    };

    if (method === 'cash') {
      paymentData.cashReceived = parseFloat(cashReceived);
      paymentData.change = change;
    } else if (method === 'ebt') {
      const ebtPaid = parseFloat(ebtAmount);
      const remaining = finalCashTotal - ebtPaid;
      
      paymentData.ebtAmount = ebtPaid;
      paymentData.details = {
        ebt_approval_code: ebtApprovalCode,
        ebt_card_last_4: ebtLast4,
        ebt_eligible_amount: ebtEligibleTotal,
        manual_entry: isEbtManual
      };

      if (remaining > 0) {
        paymentData.method = 'split';
        paymentData.otherAmount = remaining;
        paymentData.otherMethod = otherPaymentMethod;
        paymentData.details.split_payment = {
          ebt: ebtPaid,
          [otherPaymentMethod]: remaining
        };
      }
    } else if (method === 'card' && (selectedMethod === 'card_manual' || selectedMethod === 'non_integrated')) {
      paymentData.details = {
        approval_code: manualApprovalCode,
        card_last_4: manualLast4,
        manual_entry: true,
        transaction_notes: transactionNotes,
        gateway: selectedMethod === 'non_integrated' ? 'non_integrated' : 'stripe'
      };
    }

    onProcessPayment(paymentData);
  };

  const handleManualConfirmation = async (success) => {
    if (success) {
      handlePayment(selectedMethod === 'card_manual' || selectedMethod === 'non_integrated' ? 'card' : selectedMethod);
    } else {
      // Payment failed
      alert('Payment was declined. Please try another payment method.');
      setSelectedMethod(null);
      setIsProcessing(false);
    }
  };

  const renderInitialSelection = () => (
    <>
      <DialogHeader>
        <DialogTitle>{t('pos.selectPaymentMethod')}</DialogTitle>
        <DialogDescription>
          {isDualPricingActive ? (
            <div className="mt-2 text-center space-y-2">
              <div className="p-3 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <div className="text-lg font-bold text-green-600 dark:text-green-300">{t('pos.cashPrice')}: ${totals.cashTotal}</div>
              </div>
              <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-300">{t('pos.nonCashPrice')}: ${totals.cardTotal}</div>
              </div>
            </div>
          ) : (
             <div className="mt-2 text-center text-2xl font-bold">
               {t('pos.total')}: ${totals.cardTotal}
             </div>
          )}
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-4 py-6">
        <Button
          variant="outline"
          className="h-24 flex-col gap-2"
          onClick={() => setSelectedMethod("cash")}
        >
          <Coins className="w-8 h-8" />
          <span>{t('pos.cash')}</span>
        </Button>
        
        {isEbtEnabled && hasEbtItems && (
          <Button
            variant="outline"
            className="h-24 flex-col gap-2 border-green-500 hover:bg-green-50"
            onClick={() => setSelectedMethod("ebt")}
          >
            <Banknote className="w-8 h-8 text-green-600" />
            <span>{t('pos.ebtSnap')}</span>
            <span className="text-xs text-green-600">{t('pos.eligible')}: ${ebtEligibleTotal.toFixed(2)}</span>
          </Button>
        )}
        
        {isNonIntegratedEnabled ? (
          <Button
            variant="outline"
            className="h-24 flex-col gap-2"
            onClick={() => setSelectedMethod('non_integrated')}
          >
            <CreditCardIcon className="w-8 h-8" />
            <span>{t('pos.customerTerminal')}</span>
            <span className="text-xs text-gray-500">{t('pos.externalDevice')}</span>
          </Button>
        ) : (
          <Button
            variant="outline"
            className="h-24 flex-col gap-2"
            onClick={() => {
              if (isCardManual) {
                setSelectedMethod('card_manual');
              } else {
                onStartInteractivePayment();
              }
            }}
          >
            <CreditCardIcon className="w-8 h-8" />
            <span>{t('pos.customerTerminal')}</span>
            {isCardManual && <span className="text-xs text-gray-500">{t('pos.manualEntry')}</span>}
          </Button>
        )}
      </div>
    </>
  );

  const renderCardManualEntry = () => (
    <>
      <DialogHeader>
        <DialogTitle>{t('pos.processCardPayment')}</DialogTitle>
        <DialogDescription>
          {t('pos.amountToCharge')}: <span className="font-bold text-xl">${finalCardTotal.toFixed(2)}</span>
        </DialogDescription>
      </DialogHeader>
      {!isProcessing ? (
        <div className="py-6 space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm font-medium text-blue-800 mb-2">
              {t('pos.instructions')}:
            </p>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>{t('pos.processOnTerminal').replace('{amount}', `$${finalCardTotal.toFixed(2)}`)}</li>
              <li>{t('pos.enterApprovalCodeBelow')}</li>
              <li>{t('pos.confirmSuccessOrFailure')}</li>
            </ol>
          </div>

          {(selectedMethod === 'card_manual' || (isNonIntegratedEnabled && settings?.payment_gateways?.non_integrated?.require_approval_code)) && (
            <div className="space-y-2">
              <label htmlFor="approval-code" className="text-sm font-medium">{t('pos.approvalCode')} *</label>
              <Input
                id="approval-code"
                type="text"
                value={manualApprovalCode}
                onChange={(e) => setManualApprovalCode(e.target.value)}
                placeholder={t('pos.enterApprovalCodePh')}
                autoFocus
              />
            </div>
          )}

          {(selectedMethod === 'card_manual' || (isNonIntegratedEnabled && settings?.payment_gateways?.non_integrated?.require_last_4)) && (
            <div className="space-y-2">
              <label htmlFor="card-last4" className="text-sm font-medium">{t('pos.cardLast4')} *</label>
              <Input
                id="card-last4"
                type="text"
                maxLength="4"
                value={manualLast4}
                onChange={(e) => setManualLast4(e.target.value.replace(/\D/g, ''))}
                placeholder="0000"
              />
            </div>
          )}

          {(selectedMethod === 'card_manual' || (isNonIntegratedEnabled && settings?.payment_gateways?.non_integrated?.allow_notes)) && (
            <div className="space-y-2">
              <label htmlFor="notes" className="text-sm font-medium">{t('pos.transactionNotes')}</label>
              <Textarea
                id="notes"
                value={transactionNotes}
                onChange={(e) => setTransactionNotes(e.target.value)}
                placeholder={t('pos.transactionNotesPh')}
                rows={2}
              />
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button variant="ghost" onClick={() => setSelectedMethod(null)}>
              {t('pos.back')}
            </Button>
            <Button
              onClick={() => setIsProcessing(true)}
              disabled={
                ((selectedMethod === 'card_manual' || (isNonIntegratedEnabled && settings?.payment_gateways?.non_integrated?.require_approval_code)) && !manualApprovalCode) ||
                ((selectedMethod === 'card_manual' || (isNonIntegratedEnabled && settings?.payment_gateways?.non_integrated?.require_last_4)) && (!manualLast4 || manualLast4.length !== 4))
              }
            >
              {t('pos.continue')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="py-8 space-y-6">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-orange-500" />
            <h3 className="text-xl font-bold mb-2">{t('pos.confirmPaymentStatusTitle')}</h3>
            <p className="text-gray-600">
              {t('pos.didPaymentProcess')} <span className="font-bold">${finalCardTotal.toFixed(2)}</span> {t('pos.processSuccessfullyOnTerminal')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="h-20 flex-col gap-2 border-red-500 hover:bg-red-50"
              onClick={() => handleManualConfirmation(false)}
            >
              <XCircle className="w-8 h-8 text-red-600" />
              <span className="text-red-600">{t('pos.paymentFailed')}</span>
            </Button>

            <Button
              className="h-20 flex-col gap-2 bg-green-600 hover:bg-green-700"
              onClick={() => handleManualConfirmation(true)}
            >
              <CheckCircle className="w-8 h-8" />
              <span>{t('pos.paymentSuccessful')}</span>
            </Button>
          </div>
        </div>
      )}
    </>
  );

  const renderCardProcessing = () => (
    <>
      <DialogHeader>
        <DialogTitle>{t('pos.processCardPayment')}</DialogTitle>
        <DialogDescription>
          {t('pos.customerChosenCard')} <span className="font-bold text-xl">${finalCardTotal.toFixed(2)}</span> {t('pos.includingTip')} ${finalTipAmount.toFixed(2)}{t('pos.tipSuffix')}.
        </DialogDescription>
      </DialogHeader>
      <div className="py-6 space-y-4">
        {isCardManual || isNonIntegratedEnabled ? (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm font-medium text-blue-800 mb-2">
              {t('pos.instructions')}:
            </p>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>{t('pos.processOnTerminal').replace('{amount}', `$${finalCardTotal.toFixed(2)}`)}</li>
              <li>{t('pos.waitForApproval')}</li>
              <li>{t('pos.clickToConfirmReceived')}</li>
            </ol>
          </div>
        ) : (
          <p className="text-center">{t('pos.useCardReader')}</p>
        )}
      </div>
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>
          {t('pos.cancel')}
        </Button>
        <Button
          onClick={() => {
            if (isCardManual || isNonIntegratedEnabled) {
              setSelectedMethod(isNonIntegratedEnabled ? 'non_integrated' : 'card_manual');
            } else {
              handlePayment("card");
            }
          }}
          className="bg-green-600 hover:bg-green-700"
        >
          <CreditCardIcon className="w-4 h-4 mr-2" />
          {t('pos.confirmPaymentReceived')}
        </Button>
      </div>
    </>
  );

  const renderCashPayment = () => (
    <>
      <DialogHeader>
        <DialogTitle>{t('pos.cashPayment')}</DialogTitle>
        <DialogDescription>
          {t('pos.totalAmountDue')}:
          <span className="font-bold text-2xl ml-2">${finalCashTotal.toFixed(2)}</span>
        </DialogDescription>
      </DialogHeader>
      <div className="py-6 space-y-4">
        <div className="space-y-1">
          <label htmlFor="cash-received" className="text-sm font-medium">{t('pos.cashReceived')}</label>
          <Input
            id="cash-received"
            type="number"
            step="0.01"
            value={cashReceived}
            onChange={(e) => setCashReceived(e.target.value)}
            placeholder="e.g., 100.00"
            autoFocus
          />
        </div>
        {change > 0 && (
          <div className="text-center text-lg">
            {t('pos.changeDue')}: <span className="font-bold text-2xl text-green-600">${change.toFixed(2)}</span>
          </div>
        )}
      </div>
      <div className="flex justify-between">
        <Button variant="ghost" onClick={() => setSelectedMethod(null)}>{t('pos.back')}</Button>
        <Button
          onClick={() => handlePayment("cash")}
          disabled={!cashReceived || parseFloat(cashReceived) < finalCashTotal}
        >
          {t('pos.finalizePayment')}
        </Button>
      </div>
    </>
  );

  const renderEBTPayment = () => {
    const maxEbtAmount = Math.min(ebtEligibleTotal, finalCashTotal);
    const currentEbtAmount = parseFloat(ebtAmount) || 0;
    const remainingAmount = finalCashTotal - currentEbtAmount;
    const needsSplitPayment = remainingAmount > 0 && currentEbtAmount > 0;

    if (isEbtManual && !isProcessing) {
      return (
        <>
          <DialogHeader>
            <DialogTitle>{t('pos.ebtSnapPayment')}</DialogTitle>
            <DialogDescription>
              <div className="mt-2 space-y-2">
                <div className="text-sm">
                  <strong>{t('pos.totalDue')}:</strong> ${finalCashTotal.toFixed(2)}
                </div>
                <div className="text-sm text-green-600">
                  <strong>{t('pos.ebtEligibleLabel')}:</strong> ${ebtEligibleTotal.toFixed(2)}
                </div>
                <div className="text-sm text-orange-600">
                  <strong>{t('pos.maxEbtAmount')}:</strong> ${maxEbtAmount.toFixed(2)}
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm font-medium text-green-800 mb-2">
                {t('pos.instructions')}:
              </p>
              <ol className="text-sm text-green-700 space-y-1 list-decimal list-inside">
                <li>{t('pos.processEbtOnTerminal')}</li>
                <li>{t('pos.enterApprovalAndCard')}</li>
                <li>{t('pos.confirmPaymentSuccess')}</li>
              </ol>
            </div>

            <div className="space-y-1">
              <label htmlFor="ebt-amount" className="text-sm font-medium">{t('pos.ebtAmount')} *</label>
              <Input
                id="ebt-amount"
                type="number"
                step="0.01"
                max={maxEbtAmount}
                value={ebtAmount}
                onChange={(e) => setEbtAmount(e.target.value)}
                placeholder={`${t('pos.max')}: ${maxEbtAmount.toFixed(2)}`}
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="ebt-approval" className="text-sm font-medium">{t('pos.approvalCode')} *</label>
              <Input
                id="ebt-approval"
                type="text"
                value={ebtApprovalCode}
                onChange={(e) => setEbtApprovalCode(e.target.value)}
                placeholder={t('pos.enterApprovalCodePh')}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="ebt-last4" className="text-sm font-medium">{t('pos.cardLast4')} *</label>
              <Input
                id="ebt-last4"
                type="text"
                maxLength="4"
                value={ebtLast4}
                onChange={(e) => setEbtLast4(e.target.value.replace(/\D/g, ''))}
                placeholder="0000"
              />
            </div>

            {needsSplitPayment && (
              <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-md">
                <p className="text-sm font-medium text-yellow-800 mb-2">
                  {t('pos.splitPaymentRequired')}
                </p>
                <p className="text-sm text-yellow-700 mb-3">
                  {t('pos.remainingBalance')}: <strong>${remainingAmount.toFixed(2)}</strong>
                </p>
                <label className="text-sm font-medium">{t('pos.payRemainingWith')}:</label>
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    variant={otherPaymentMethod === 'cash' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setOtherPaymentMethod('cash')}
                  >
                    {t('pos.cash')}
                  </Button>
                  <Button
                    type="button"
                    variant={otherPaymentMethod === 'card' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setOtherPaymentMethod('card')}
                  >
                    {t('pos.customerTerminal')}
                  </Button>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setSelectedMethod(null)}>{t('pos.back')}</Button>
            <Button
              onClick={() => setIsProcessing(true)}
              disabled={
                !ebtAmount || 
                parseFloat(ebtAmount) <= 0 || 
                parseFloat(ebtAmount) > maxEbtAmount ||
                !ebtApprovalCode ||
                !ebtLast4 ||
                ebtLast4.length !== 4 ||
                (needsSplitPayment && !otherPaymentMethod)
              }
            >
              {t('pos.continue')}
            </Button>
          </div>
        </>
      );
    }

    if (isEbtManual && isProcessing) {
      return (
        <>
          <DialogHeader>
            <DialogTitle>{t('pos.confirmEbtPayment')}</DialogTitle>
          </DialogHeader>
          <div className="py-8 space-y-6">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-orange-500" />
              <h3 className="text-xl font-bold mb-2">{t('pos.confirmPaymentStatusTitle')}</h3>
              <p className="text-gray-600">
                {t('pos.didEbtProcess')} <span className="font-bold">${currentEbtAmount.toFixed(2)}</span> {t('pos.processSuccessfullyQ')}
              </p>
              {needsSplitPayment && (
                <p className="text-sm text-gray-500 mt-2">
                  {t('pos.remainingWillBeCollected').replace('{amount}', `$${remainingAmount.toFixed(2)}`)}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-20 flex-col gap-2 border-red-500 hover:bg-red-50"
                onClick={() => handleManualConfirmation(false)}
              >
                <XCircle className="w-8 h-8 text-red-600" />
                <span className="text-red-600">{t('pos.paymentFailed')}</span>
              </Button>

              <Button
                className="h-20 flex-col gap-2 bg-green-600 hover:bg-green-700"
                onClick={() => handleManualConfirmation(true)}
              >
                <CheckCircle className="w-8 h-8" />
                <span>{t('pos.paymentSuccessful')}</span>
              </Button>
            </div>
          </div>
        </>
      );
    }

    // Integrated EBT flow (not currently implemented, but structure is here)
    return null;
  };

  const renderContent = () => {
    switch (selectedMethod) {
        case 'cash':
            return renderCashPayment();
        case 'ebt':
            return renderEBTPayment();
        case 'card_manual':
        case 'non_integrated':
            return renderCardManualEntry();
        case 'card_processing':
            return renderCardProcessing();
        default:
            return renderInitialSelection();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}