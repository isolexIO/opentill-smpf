import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, ShoppingBag } from 'lucide-react';

export default function ApprovalScreen({ order, settings, onApprove }) {
  const [approving, setApproving] = useState(false);

  // Dual pricing
  const pricingSettings = settings?.pricing_and_surcharge || {};
  const dualPricingEnabled = pricingSettings.enable_dual_pricing || pricingSettings.show_dual_prices;
  const surchargePercent = pricingSettings.cc_surcharge_percent || 0;
  const flatFee = pricingSettings.flat_fee_amount || 0;
  const pricingMode = pricingSettings.pricing_mode || 'surcharge';
  const baseTotal = order?.total || 0;
  let cashPrice, cardPrice;
  if (pricingMode === 'cash_discount') {
    cardPrice = baseTotal;
    cashPrice = baseTotal - (baseTotal * (surchargePercent / 100)) - flatFee;
  } else {
    cashPrice = baseTotal;
    cardPrice = baseTotal + (baseTotal * (surchargePercent / 100)) + flatFee;
  }

  const handleApprove = async () => {
    try {
      setApproving(true);
      console.log('ApprovalScreen: Customer approved order');

      // Check if order has tippable items
      const hasTippableItems = order.items?.some(item => item.tippable !== false) ?? true;

      // Update order status
      const updateData = {
        status: hasTippableItems ? 'tip_selection' : 'ready_for_payment'
      };

      console.log('ApprovalScreen: Updating order:', updateData);
      await base44.entities.Order.update(order.id, updateData);

      if (onApprove) {
        onApprove();
      }
    } catch (error) {
      console.error('ApprovalScreen: Error approving order:', error);
      alert('Error processing approval. Please try again.');
      setApproving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 to-blue-900 flex items-center justify-center p-8">
      <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-3xl w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Review Your Order
          </h1>
          <p className="text-xl text-gray-600">
            Order #{order?.order_number}
          </p>
        </div>

        {/* Order Items */}
        <div className="bg-gray-50 rounded-2xl p-6 mb-8 max-h-96 overflow-y-auto">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Items</h2>
          <div className="space-y-3">
            {(order?.items || []).map((item, index) => (
              <div key={index} className="flex justify-between items-start py-3 border-b border-gray-200 last:border-0">
                <div className="flex-1">
                  <div className="font-semibold text-lg text-gray-800">
                    {item.quantity}x {item.product_name}
                  </div>
                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="text-sm text-gray-600 ml-4 mt-1">
                      {item.modifiers.map((mod, modIndex) => (
                        <div key={modIndex}>+ {mod.name}</div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-lg font-semibold text-gray-800 ml-4">
                  ${item.item_total?.toFixed(2) || '0.00'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Totals */}
        <div className="bg-blue-50 rounded-2xl p-6 mb-8">
          <div className="space-y-2 text-lg">
            <div className="flex justify-between">
              <span className="text-gray-700">Subtotal:</span>
              <span className="font-semibold">${order?.subtotal?.toFixed(2) || '0.00'}</span>
            </div>
            {order?.discount_amount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount:</span>
                <span className="font-semibold">-${order.discount_amount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-700">Tax:</span>
              <span className="font-semibold">${order?.tax_amount?.toFixed(2) || '0.00'}</span>
            </div>
            {order?.surcharge_amount > 0 && (
              <div className="flex justify-between text-blue-600">
                <span>{order.surcharge_label || 'Surcharge'}:</span>
                <span className="font-semibold">${order.surcharge_amount.toFixed(2)}</span>
              </div>
            )}
            {dualPricingEnabled && surchargePercent > 0 ? (
              <div className="pt-3 border-t-2 border-gray-300">
                <div className="flex justify-between text-xl font-bold text-gray-800 mb-1">
                  <span>Total (Cash):</span>
                  <span className="text-green-600">${cashPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-gray-800">
                  <span>Total (Card <span className="font-normal text-base text-gray-500">+{surchargePercent}%</span>):</span>
                  <span className="text-blue-600">${cardPrice.toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <div className="flex justify-between text-2xl font-bold text-gray-800 pt-3 border-t-2 border-gray-300">
                <span>Total:</span>
                <span>${order?.total?.toFixed(2) || '0.00'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Approve Button */}
        <Button
          onClick={handleApprove}
          disabled={approving}
          className="w-full h-20 text-2xl font-bold bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white disabled:opacity-50 rounded-xl"
        >
          {approving ? (
            <>
              <Clock className="w-6 h-6 mr-3 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CheckCircle className="w-6 h-6 mr-3" />
              Approve & Continue
            </>
          )}
        </Button>
      </div>
    </div>
  );
}