import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Trash2,
  Users,
  Percent,
  Plus,
  Minus,
  UtensilsCrossed,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

export default function Cart({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  discountPercent,
  onDiscountChange,
  totals,
  onCheckout,
  onSendToKitchen,
  selectedCustomer,
  isMobile,
  settings,
}) {
  const handleOptimisticUpdate = (index, newQuantity) => {
    onUpdateQuantity(index, newQuantity);
  };

  const handleOptimisticRemove = (index) => {
    onRemoveItem(index);
  };

  const isDualPricingEnabled = settings?.pricing_and_surcharge?.enable_dual_pricing && settings?.pricing_and_surcharge?.show_dual_prices;
  const hasEbtEligibleItems = parseFloat(totals.ebtEligibleTotal || 0) > 0;
  const hasAgeRestrictedItems = cart.some(item => item?.age_restricted);
  const isKitchenDisplayEnabled = settings?.kitchen_display?.enabled !== false;

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold">Current Order</h2>
        {selectedCustomer && (
          <div className="flex items-center mt-2">
            <Users className="w-4 h-4 mr-2 text-gray-500" />
            <span className="text-sm font-medium">{selectedCustomer.name}</span>
          </div>
        )}
        
        {/* EBT & Age Verification Indicators */}
        {(hasEbtEligibleItems || hasAgeRestrictedItems) && (
          <div className="flex flex-wrap gap-2 mt-2">
            {hasEbtEligibleItems && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                <ShieldCheck className="w-3 h-3 mr-1" />
                EBT Eligible: ${totals.ebtEligibleTotal}
              </Badge>
            )}
            {hasAgeRestrictedItems && (
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Age Verification Required
              </Badge>
            )}
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500">Cart is empty</p>
            </div>
          ) : (
            cart.map((item, index) => (
              <div key={index} className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{item.name}</p>
                    {item.ebt_eligible && (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                        EBT
                      </Badge>
                    )}
                    {item.age_restricted && (
                      <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                        {item.minimum_age || 21}+
                      </Badge>
                    )}
                  </div>
                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="text-xs text-gray-500 pl-2">
                      {item.modifiers.map((mod, modIndex) => (
                        <div key={modIndex}>+ {mod.name} (${mod.price_adjustment.toFixed(2)})</div>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-gray-500">
                    ${item.itemTotal.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center border rounded-md">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 min-h-[44px] md:min-h-[32px]"
                      onClick={() => handleOptimisticUpdate(index, item.quantity - 1)}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleOptimisticUpdate(index, parseInt(e.target.value) || 1)}
                      className="w-12 h-8 text-center border-none focus-visible:ring-0"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 min-h-[44px] md:min-h-[32px]"
                      onClick={() => handleOptimisticUpdate(index, item.quantity + 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 min-h-[44px] md:min-h-[32px] text-red-500"
                    onClick={() => handleOptimisticRemove(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {cart.length > 0 && (
        <div className="p-4 border-t bg-gray-50 dark:bg-gray-800/50">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>${totals.subtotal}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Discount</span>
              <div className="flex items-center gap-2 w-24">
                <Input
                  type="number"
                  value={discountPercent}
                  onChange={(e) => onDiscountChange(Number(e.target.value))}
                  className="w-full h-8 text-right"
                  placeholder="0"
                />
                <Percent className="w-4 h-4 text-gray-500" />
              </div>
            </div>
             {Number(totals.discountAmount) > 0 && (
                <div className="flex justify-between text-sm text-red-500">
                    <span>Discount Applied</span>
                    <span>-${totals.discountAmount}</span>
                </div>
             )}
            <div className="flex justify-between text-sm">
              <span>Tax</span>
              <span>${totals.taxAmount}</span>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t">
            {isDualPricingEnabled ? (
                 <div className="space-y-2">
                    <div className="flex justify-between text-lg font-bold text-green-600">
                        <span>Cash Price</span>
                        <span>${totals.cashTotal}</span>
                    </div>
                     <div className="flex justify-between text-xl font-bold">
                        <span>Non-Cash Price</span>
                        <span>${totals.cardTotal}</span>
                    </div>
                </div>
            ) : (
                 <div className="flex justify-between text-2xl font-bold">
                    <span>Total</span>
                    <span>${totals.cardTotal}</span>
                </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2">
            {onSendToKitchen && isKitchenDisplayEnabled && (
              <Button
                variant="outline"
                size="lg"
                onClick={onSendToKitchen}
                className="w-full min-h-[44px]"
              >
                <UtensilsCrossed className="w-4 h-4 mr-2" />
                Send to Kitchen
              </Button>
            )}
            <Button
              size="lg"
              onClick={onCheckout}
              className="w-full min-h-[44px] bg-blue-600 hover:bg-blue-700"
              disabled={cart.length === 0}
            >
              Pay
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}