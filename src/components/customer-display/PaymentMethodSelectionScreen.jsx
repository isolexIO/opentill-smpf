import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { buildPricing, FUNDING } from '@/lib/pricing';
// Removed: Card, Button components as per new design
import { CreditCard, Banknote, Loader2, AlertCircle } from 'lucide-react'; // Removed Coins icon, replaced by img
import OpenTILLPaymentsLogo from '@/components/payment/OpenTILLPaymentsLogo';

export default function PaymentMethodSelectionScreen({ order, settings, onMethodSelected, onPaymentMethodSelected }) {
  // Support both prop names
  const handleMethodSelected = onMethodSelected || onPaymentMethodSelected;
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState(null);
  const [rule, setRule] = useState(null);

  // Load the applicable compliance rule; fail closed until an approved one is found.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const region = settings?.pricing_and_surcharge?.region || 'US';
        const rules = await base44.entities.ComplianceRule.filter({ jurisdiction_country: region, status: 'active' });
        if (cancelled) return;
        const now = Date.now();
        const valid = (rules || []).filter(r =>
          r.legal_review_status === 'approved' &&
          (!r.effective_date || new Date(r.effective_date).getTime() <= now) &&
          (!r.expiration_date || new Date(r.expiration_date).getTime() >= now)
        );
        valid.sort((a, b) => (a.maximum_state_pct ?? Infinity) - (b.maximum_state_pct ?? Infinity));
        setRule(valid[0] || null);
      } catch (e) {
        setRule(null);
      }
    })();
    return () => { cancelled = true; };
  }, [settings?.pricing_and_surcharge?.region]);

  // Dual pricing / surcharge settings — computed via the integer-cents fee engine.
  const pricingSettings = settings?.pricing_and_surcharge || {};
  const program = !pricingSettings.enable_dual_pricing
    ? 'standard'
    : (pricingSettings.pricing_mode === 'cash_discount' ? 'dual_pricing' : 'surcharge');

  // Reconstruct the taxable base from the order (surcharge is computed on the
  // pre-tax subtotal; tax is added to both prices afterward).
  const taxable = Math.max(0, (order?.subtotal || 0) - (order?.discount_amount || 0));
  const taxAmt = order?.tax_amount || 0;

  // Funding type is unknown until the processor confirms a card, so a credit-card
  // surcharge program fails closed here (no adjustment). Dual pricing discloses
  // the card price up front and applies to all cards.
  const pricing = buildPricing({
    settings,
    rule,
    cardFundingType: FUNDING.UNKNOWN,
    subtotalDollars: taxable,
    taxDollars: 0,
    tipDollars: 0,
  });
  const cashPrice = parseFloat(pricing.cashTotal) + taxAmt;
  const cardPrice = parseFloat(pricing.cardTotal) + taxAmt;
  const showDualPrices = program === 'dual_pricing' && pricing.allowed && cardPrice > cashPrice;
  const isSurchargeProgram = program === 'surcharge';

  // Check which payment methods are available
  const isSolanaPayEnabled = settings?.solana_pay?.enabled && 
                              settings?.solana_pay?.wallet_address;
  
  // Show card if any gateway is configured, OR always show it by default
  // (the cashier already chose "Customer Terminal" which implies card payment is available)
  const hasAnyGateway = settings?.payment_gateways?.stripe?.enabled ||
                        settings?.payment_gateways?.shift4?.enabled ||
                        settings?.payment_gateways?.non_integrated?.enabled ||
                        settings?.payment_gateways?.pax?.enabled ||
                        settings?.payment_gateways?.verifone?.enabled;
  const isCardEnabled = true; // Always show card — cashier already routed to customer terminal
  const isEbtEnabled = settings?.payment_gateways?.ebt?.enabled;
  
  // Check if there are EBT-eligible items in the order
  const hasEbtItems = order?.items?.some(item => item.ebt_eligible);
  const ebtEligibleTotal = order?.items?.reduce((sum, item) => {
    if (item.ebt_eligible) {
      return sum + (item.item_total * item.quantity);
    }
    return sum;
  }, 0) || 0;

  const showEbt = isEbtEnabled && hasEbtItems && ebtEligibleTotal > 0;

  const handleSelectMethod = async (method) => { // Renamed from handleSelectPaymentMethod
    setSelecting(true);
    setError(null);

    try {
      console.log('Customer Display: Selecting payment method:', method);

      // Update order with selected payment method
      await base44.entities.Order.update(order.id, {
        payment_method: method,
        status: method === 'solana_pay' ? 'payment_in_progress' : 'approval'
      });

      console.log('Customer Display: Payment method updated successfully');

      // Notify parent component
      if (handleMethodSelected) {
        handleMethodSelected(method);
      }
    } catch (error) {
      console.error('Error selecting payment method:', error);
      setError(error.message || 'Failed to select payment method');
      setSelecting(false);
    }
  };

  if (!order) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="text-center text-white">
          <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin" />
          <p className="text-2xl">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-green-500 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-white max-w-md mx-auto">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 md:p-12">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-gray-900 dark:text-white">
            Choose Payment Method
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-8 text-lg">
            Select how you'd like to pay
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Credit/Debit Card */}
            {isCardEnabled && (
              <button 
                className={`group relative p-8 border-2 border-gray-200 dark:border-gray-700 rounded-2xl hover:border-blue-500 hover:shadow-xl transition-all duration-300 transform hover:scale-105 ${
                  selecting ? 'opacity-50 pointer-events-none' : ''
                }`}
                onClick={() => handleSelectMethod('card')}
                disabled={selecting}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-300/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="flex justify-center mb-4">
                    <CreditCard className="w-16 h-16 text-blue-600 group-hover:text-blue-700 transition-colors" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                    Credit/Debit Card
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors">
                    Pay with your credit or debit card
                  </p>
                </div>
              </button>
            )}

            {/* Solana Pay */}
            {isSolanaPayEnabled && (
              <button
                onClick={() => handleSelectMethod('solana_pay')}
                className={`group relative p-8 border-2 border-gray-200 dark:border-gray-700 rounded-2xl hover:border-purple-500 hover:shadow-xl transition-all duration-300 transform hover:scale-105 ${
                  selecting ? 'opacity-50 pointer-events-none' : ''
                }`}
                disabled={selecting}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-green-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="flex justify-center mb-4">
                    <img 
                      src="https://solana.com/src/img/branding/solanaLogoMark.svg" 
                      alt="Solana Pay" 
                      className="h-16 w-16"
                    />
                  </div>
                  <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white group-hover:text-purple-600 transition-colors">
                    Solana Pay
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors">
                    Pay with crypto - instant & secure
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2 text-sm text-purple-600 dark:text-purple-400">
                    <span className="font-medium">Near-zero fees</span>
                    <span>•</span>
                    <span className="font-medium">Instant settlement</span>
                  </div>
                </div>
              </button>
            )}

            {/* EBT/SNAP */}
            {showEbt && (
              <button 
                className={`group relative p-8 border-2 border-gray-200 dark:border-gray-700 rounded-2xl hover:border-green-500 hover:shadow-xl transition-all duration-300 transform hover:scale-105 ${
                  selecting ? 'opacity-50 pointer-events-none' : ''
                }`}
                onClick={() => handleSelectMethod('ebt')}
                disabled={selecting}
              >
                 <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-300/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="flex justify-center mb-4">
                    <Banknote className="w-16 h-16 text-green-600 group-hover:text-green-700 transition-colors" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white group-hover:text-green-600 transition-colors">
                    EBT/SNAP
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors">
                    Pay with your EBT benefits
                  </p>
                  <div className="text-lg text-green-600 dark:text-green-400 font-semibold mt-4">
                    Eligible: ${ebtEligibleTotal.toFixed(2)}
                  </div>
                </div>
              </button>
            )}

            {/* If no payment methods are enabled and there are no other options to show */}
            {!isCardEnabled && !isSolanaPayEnabled && !showEbt && (
              <div className="col-span-full text-center text-gray-700 dark:text-gray-300 mt-8">
                <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-500 dark:text-gray-400" />
                <p className="text-2xl">No payment methods available</p>
                <p className="text-lg mt-2 opacity-80">
                  Please contact the merchant to enable payment options
                </p>
              </div>
            )}
          </div> {/* End of grid */}

          {/* Total display */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            {showDualPrices ? (
              <div className="flex justify-around items-center">
                <div className="text-center">
                  <p className="text-gray-500 text-sm font-medium uppercase tracking-wide mb-1">Cash Price</p>
                  <p className="text-4xl font-extrabold text-green-600">${cashPrice.toFixed(2)}</p>
                </div>
                <div className="text-gray-300 text-3xl font-light">|</div>
                <div className="text-center">
                  <p className="text-gray-500 text-sm font-medium uppercase tracking-wide mb-1">Card Price</p>
                  <p className="text-4xl font-extrabold text-blue-600">${cardPrice.toFixed(2)}</p>
                </div>
              </div>
            ) : isSurchargeProgram ? (
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">Total</p>
                <p className="text-4xl font-extrabold text-gray-900 dark:text-white">${(order.total || cashPrice).toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-2">A credit-card surcharge may apply at confirmation. Debit &amp; prepaid cards are never surcharged.</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">Order Total</p>
                <p className="text-4xl font-extrabold text-gray-900 dark:text-white">
                  ${(order.total || 0).toFixed(2)}
                </p>
              </div>
            )}
          </div>

        </div> {/* End of bg-white card */}

        {/* Secure payment footer */}
        <div className="mt-12 flex justify-center">
          <OpenTILLPaymentsLogo height="h-8" subtitle="Secure payments" />
        </div>
      </div> {/* End of w-full max-w-4xl */}
    </div>
  );
}