import React, { useState, useEffect, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  ShoppingCart,
  Plus,
  Minus,
  Heart,
  Car,
  Store,
  UtensilsCrossed,
  CheckCircle,
  Loader2,
  DollarSign
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ModifierDialog from "../components/online-menu/ModifierDialog";
import ProductGrid from '../components/pos/ProductGrid';
import SolanaPayScreen from '../components/customer-display/SolanaPayScreen';
import LoyaltyWidget from '../components/online-menu/LoyaltyWidget';

const ProductCard = ({ product, onAddToCart, onToggleFavorite, isFavorite }) => {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow group dark:bg-gray-900 dark:border-gray-700">
      <div className="aspect-video bg-gray-200 dark:bg-gray-700 relative cursor-pointer" onClick={() => onAddToCart(product)}>
        <img
          src={product.image_url || `https://via.placeholder.com/400x300/F0F0F0/AAAAAA?text=${product.name}`}
          alt={product.name}
          className="w-full h-full object-cover"
        />
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 rounded-full"
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(product.id); }}
        >
          <Heart className={`w-5 h-5 transition-all ${isFavorite ? 'text-red-500 fill-red-500' : 'text-gray-600 dark:text-gray-300'}`} />
        </Button>
      </div>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{product.name}</h3>
          <span className="font-bold text-lg text-green-600 dark:text-green-400">
            ${product.price.toFixed(2)}
          </span>
        </div>
        {product.description && (
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">
            {product.description}
          </p>
        )}
        <div className="flex justify-between items-center">
          <Badge variant="secondary" className="capitalize dark:bg-gray-700 dark:text-gray-200">
            {product.category}
          </Badge>
          <Button
            onClick={() => onAddToCart(product)}
            size="sm"
            className="flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function OnlineMenuPage() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('details');
  const [showAccount, setShowAccount] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    phone: "",
    fulfillment_type: "pickup",
    delivery_address: "",
    special_instructions: "",
    requested_time: ""
  });
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [pastOrders, setPastOrders] = useState([]);
  const [favoriteProducts, setFavoriteProducts] = useState([]);
  const [merchant, setMerchant] = useState(null);
  const [selectedProductForModifiers, setSelectedProductForModifiers] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [currentOrder, setCurrentOrder] = useState(null);
  const [showSolanaPayModal, setShowSolanaPayModal] = useState(false);
  const [selectedReward, setSelectedReward] = useState(null);

  const loadUserData = useCallback(async (user) => {
    try {
      const userOrders = await base44.entities.OnlineOrder.filter({ created_by: user.email }, "-created_date", 20);
      setPastOrders(userOrders);

      if (user.favorite_product_ids && user.favorite_product_ids.length > 0) {
        const favs = await base44.entities.Product.filter({ id: { "$in": user.favorite_product_ids } });
        setFavoriteProducts(favs);
      } else {
        setFavoriteProducts([]);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Determine which merchant to load data for
      let targetMerchantId = null;
      
      try {
        const userData = await base44.auth.me();
        targetMerchantId = userData.merchant_id;
      } catch (authError) {
        console.log('No authenticated user');
      }
      
      // If no authenticated user, try to get merchant from subdomain
      if (!targetMerchantId) {
        try {
          const hostname = window.location.hostname;
          const subdomain = hostname.split('.')[0];
          
          if (subdomain && !['localhost', 'chainlinkpos', 'www', ''].includes(subdomain.toLowerCase())) {
            const dealerList = await base44.entities.Dealer.filter({ slug: subdomain });
            if (dealerList && dealerList.length > 0) {
              // For dealer subdomain, get first active merchant under that dealer
              const merchantList = await base44.entities.Merchant.filter({ 
                dealer_id: dealerList[0].id,
                status: 'active'
              });
              if (merchantList && merchantList.length > 0) {
                targetMerchantId = merchantList[0].id;
              }
            }
          }
        } catch (subdomainError) {
          console.log('Could not determine merchant from subdomain');
        }
      }
      
      // Load products filtered by merchant
      if (targetMerchantId) {
        const productList = await base44.entities.Product.filter({ 
          merchant_id: targetMerchantId,
          is_active: true 
        });
        setProducts(productList);
      } else {
        // Fallback: show products from first active merchant
        const productList = await base44.entities.Product.list();
        setProducts(productList.filter(p => p.is_active));
      }

      try {
        const userData = await base44.auth.me();
        setCurrentUser(userData);
        setCustomerInfo(prev => ({ 
          ...prev, 
          name: userData.full_name || '', 
          email: userData.email || '' 
        }));
        loadUserData(userData);
        
        if (targetMerchantId) {
          const merchants = await base44.entities.Merchant.filter({ id: targetMerchantId });
          if (merchants && merchants.length > 0) {
            setMerchant(merchants[0]);
          }
        }
      } catch (authError) {
        console.log('No authenticated user - public browsing mode');
        if (targetMerchantId) {
          try {
            const merchants = await base44.entities.Merchant.filter({ id: targetMerchantId });
            if (merchants && merchants.length > 0) {
              setMerchant(merchants[0]);
            }
          } catch (merchantError) {
            console.error('Could not load merchant:', merchantError);
          }
        }
      }

    } catch (error) {
      console.error("Error loading initial data:", error);
    } finally {
      setLoading(false);
    }
  }, [loadUserData]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleToggleFavorite = useCallback(async (productId) => {
    if (!currentUser) {
      alert("Please log in to save favorites!");
      return;
    }

    const currentFavorites = currentUser.favorite_product_ids || [];
    let newFavorites;

    if (currentFavorites.includes(productId)) {
      newFavorites = currentFavorites.filter(id => id !== productId);
    } else {
      newFavorites = [...currentFavorites, productId];
    }

    try {
      await base44.auth.updateMe({ favorite_product_ids: newFavorites });
      const updatedUser = await base44.auth.me();
      setCurrentUser(updatedUser);
      loadUserData(updatedUser);
    } catch (error) {
      console.error("Error updating favorites", error);
    }
  }, [currentUser, loadUserData]);

  const addToCart = (product, modifiers = []) => {
    const existingItemIndex = cart.findIndex(
      item => item.id === product.id &&
      JSON.stringify(item.modifiers) === JSON.stringify(modifiers)
    );
    const modifierTotal = modifiers.reduce((sum, mod) => sum + (mod.price_adjustment || 0), 0);

    if (existingItemIndex > -1) {
      const newCart = [...cart];
      newCart[existingItemIndex].quantity += 1;
      newCart[existingItemIndex].item_total =
        (product.price + modifierTotal) *
        newCart[existingItemIndex].quantity;
      setCart(newCart);
    } else {
      setCart([...cart, {
        ...product,
        quantity: 1,
        modifiers,
        item_total: product.price + modifierTotal
      }]);
    }
    setSelectedProductForModifiers(null);
  };

  const updateCartQuantity = (index, quantity) => {
    if (quantity === 0) {
      setCart(cart.filter((_, i) => i !== index));
      return;
    }

    const newCart = [...cart];
    const item = newCart[index];
    const modifierTotal = item.modifiers?.reduce((sum, m) => sum + (m.price_adjustment || 0), 0) || 0;
    newCart[index].quantity = quantity;
    newCart[index].item_total = (item.price + modifierTotal) * quantity;
    setCart(newCart);
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.item_total, 0);
    const deliveryFee = customerInfo.fulfillment_type === "delivery" ? (merchant?.settings?.online_ordering?.delivery_fee || 4.99) : 0;
    const taxRate = merchant?.settings?.tax_rate || 0.08;
    
    // Apply reward discount
    let rewardDiscount = 0;
    if (selectedReward) {
      if (selectedReward.reward_type === 'fixed_discount') {
        rewardDiscount = selectedReward.discount_value;
      } else if (selectedReward.reward_type === 'percentage_discount') {
        rewardDiscount = subtotal * (selectedReward.discount_value / 100);
        if (selectedReward.max_discount_amount > 0 && rewardDiscount > selectedReward.max_discount_amount) {
          rewardDiscount = selectedReward.max_discount_amount;
        }
      }
    }
    
    const discountedSubtotal = Math.max(0, subtotal - rewardDiscount);
    const taxAmount = (discountedSubtotal + deliveryFee) * taxRate;
    const total = discountedSubtotal + deliveryFee + taxAmount;

    return {
      subtotal: subtotal.toFixed(2),
      rewardDiscount: rewardDiscount.toFixed(2),
      deliveryFee: deliveryFee.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      total: total.toFixed(2)
    };
  };

  const resetOrderState = useCallback(() => {
    setCart([]);
    setCustomerInfo({
      name: currentUser?.full_name || "",
      email: currentUser?.email || "",
      phone: "",
      fulfillment_type: "pickup",
      delivery_address: "",
      special_instructions: "",
      requested_time: ""
    });
    setShowCheckout(false);
    setCheckoutStep('details');
    setPaymentMethod('card');
    setCurrentOrder(null);
    setShowSolanaPayModal(false);
    setSelectedReward(null);
  }, [currentUser]);

  const processCardCryptoPayment = async (paymentDetails) => {
    setLoading(true);
    try {
      if (!currentOrder) {
        alert("Error: No order to process. Please restart checkout.");
        setCheckoutStep('details');
        return;
      }

      await base44.entities.OnlineOrder.update(currentOrder.id, {
        status: "confirmed",
        payment_status: "paid",
        payment_method: paymentDetails.method
      });

      // Update customer points and record redemption
      if (customerInfo.phone && merchant?.id) {
        const customers = await base44.entities.Customer.filter({ 
          merchant_id: merchant.id,
          phone: customerInfo.phone 
        });
        
        if (customers.length > 0) {
          const customer = customers[0];
          const loyaltySettings = merchant.settings?.loyalty_program || {};
          const pointsEarned = Math.floor(parseFloat(currentOrder.total) * (loyaltySettings.points_per_dollar || 10) / 100);
          let newPoints = (customer.loyalty_points || 0) + pointsEarned;
          
          // Deduct points if reward was used
          if (selectedReward) {
            newPoints -= selectedReward.points_required;
            
            // Record redemption
            await base44.entities.CustomerRedemption.create({
              merchant_id: merchant.id,
              customer_id: customer.id,
              customer_phone: customer.phone,
              reward_id: selectedReward.id,
              reward_name: selectedReward.name,
              points_spent: selectedReward.points_required,
              discount_amount: parseFloat(calculateTotals().rewardDiscount),
              order_id: currentOrder.id,
              order_number: currentOrder.order_number,
              status: 'used'
            });
            
            // Update reward redemption count
            await base44.entities.Reward.update(selectedReward.id, {
              total_redemptions: (selectedReward.total_redemptions || 0) + 1
            });
          }
          
          // Update customer
          await base44.entities.Customer.update(customer.id, {
            loyalty_points: newPoints,
            total_spent: (customer.total_spent || 0) + parseFloat(currentOrder.total),
            visit_count: (customer.visit_count || 0) + 1
          });
        }
      }

      setCheckoutStep('confirmation');
      setTimeout(resetOrderState, 5000);

      if (currentUser) {
        loadUserData(currentUser);
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      alert("Error processing payment. Please try again.");
      setCheckoutStep('payment');
    } finally {
      setLoading(false);
    }
  };

  const initiateOrderProcess = async () => {
    if (cart.length === 0) {
      alert('Your cart is empty');
      return;
    }

    if (!customerInfo.name || !customerInfo.phone) {
      alert('Please enter your name and phone number');
      return;
    }
    if (customerInfo.fulfillment_type === 'delivery' && !customerInfo.delivery_address) {
      alert('Please enter a delivery address');
      return;
    }

    // Check minimum purchase for reward
    if (selectedReward && selectedReward.min_purchase_amount > 0) {
      const subtotal = cart.reduce((sum, item) => sum + item.item_total, 0);
      if (subtotal < selectedReward.min_purchase_amount) {
        alert(`Minimum purchase of $${selectedReward.min_purchase_amount} required for this reward`);
        return;
      }
    }

    setLoading(true);

    try {
      const totals = calculateTotals();
      const orderNumber = `ON-${Date.now()}`;

      const orderData = {
        merchant_id: merchant?.id || 'unknown',
        order_number: orderNumber,
        customer_name: customerInfo.name,
        customer_email: customerInfo.email || '',
        customer_phone: customerInfo.phone,
        items: cart.map(item => ({
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          modifiers: item.modifiers || [],
          item_total: item.item_total
        })),
        subtotal: parseFloat(totals.subtotal),
        tax_amount: parseFloat(totals.taxAmount),
        delivery_fee: parseFloat(totals.deliveryFee),
        discount_amount: parseFloat(totals.rewardDiscount),
        total: parseFloat(totals.total),
        fulfillment_type: customerInfo.fulfillment_type,
        delivery_address: customerInfo.fulfillment_type === 'delivery' ? customerInfo.delivery_address : null,
        special_instructions: customerInfo.special_instructions || null,
        requested_time: customerInfo.requested_time || null,
        status: "pending",
        payment_status: "unpaid",
        payment_method: paymentMethod,
        payment_details: selectedReward ? {
          reward_id: selectedReward.id,
          reward_name: selectedReward.name,
          points_used: selectedReward.points_required
        } : {}
      };

      const createdOrder = await base44.entities.OnlineOrder.create(orderData);
      setCurrentOrder(createdOrder);

      if (paymentMethod === 'solana_pay') {
        setShowSolanaPayModal(true);
      } else if (paymentMethod === 'cash') {
        await base44.entities.OnlineOrder.update(createdOrder.id, {
          status: 'confirmed',
          payment_status: 'paid',
          payment_method: 'cash'
        });
        
        // Handle loyalty points for cash payment
        if (customerInfo.phone && merchant?.id) {
          const customers = await base44.entities.Customer.filter({ 
            merchant_id: merchant.id,
            phone: customerInfo.phone 
          });
          
          if (customers.length > 0) {
            const customer = customers[0];
            const loyaltySettings = merchant.settings?.loyalty_program || {};
            const pointsEarned = Math.floor(parseFloat(totals.total) * (loyaltySettings.points_per_dollar || 10) / 100);
            let newPoints = (customer.loyalty_points || 0) + pointsEarned;
            
            if (selectedReward) {
              newPoints -= selectedReward.points_required;
              
              await base44.entities.CustomerRedemption.create({
                merchant_id: merchant.id,
                customer_id: customer.id,
                customer_phone: customer.phone,
                reward_id: selectedReward.id,
                reward_name: selectedReward.name,
                points_spent: selectedReward.points_required,
                discount_amount: parseFloat(totals.rewardDiscount),
                order_id: createdOrder.id,
                order_number: createdOrder.order_number,
                status: 'used'
              });
              
              await base44.entities.Reward.update(selectedReward.id, {
                total_redemptions: (selectedReward.total_redemptions || 0) + 1
              });
            }
            
            await base44.entities.Customer.update(customer.id, {
              loyalty_points: newPoints,
              total_spent: (customer.total_spent || 0) + parseFloat(totals.total),
              visit_count: (customer.visit_count || 0) + 1
            });
          }
        }
        
        setCheckoutStep('confirmation');
        setTimeout(resetOrderState, 5000);
        if (currentUser) loadUserData(currentUser);
      } else {
        setCheckoutStep('payment');
      }

    } catch (error) {
      console.error('Error initiating order process:', error);
      alert('Failed to initiate order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSolanaPaymentComplete = async (signature) => {
    setLoading(true);
    try {
      if (!currentOrder) {
        alert('Payment confirmed, but no order found to update. Please contact support.');
        setShowSolanaPayModal(false);
        setCheckoutStep('details');
        return;
      }
      
      await base44.entities.OnlineOrder.update(currentOrder.id, {
        status: 'confirmed',
        payment_status: 'paid',
        payment_details: {
          ...currentOrder.payment_details,
          signature: signature,
          confirmed_at: new Date().toISOString()
        }
      });

      // Update customer points
      if (customerInfo.phone && merchant?.id) {
        const customers = await base44.entities.Customer.filter({ 
          merchant_id: merchant.id,
          phone: customerInfo.phone 
        });
        
        if (customers.length > 0) {
          const customer = customers[0];
          const loyaltySettings = merchant.settings?.loyalty_program || {};
          const pointsEarned = Math.floor(parseFloat(currentOrder.total) * (loyaltySettings.points_per_dollar || 10) / 100);
          let newPoints = (customer.loyalty_points || 0) + pointsEarned;
          
          if (selectedReward) {
            newPoints -= selectedReward.points_required;
            
            await base44.entities.CustomerRedemption.create({
              merchant_id: merchant.id,
              customer_id: customer.id,
              customer_phone: customer.phone,
              reward_id: selectedReward.id,
              reward_name: selectedReward.name,
              points_spent: selectedReward.points_required,
              discount_amount: parseFloat(calculateTotals().rewardDiscount),
              order_id: currentOrder.id,
              order_number: currentOrder.order_number,
              status: 'used'
            });
            
            await base44.entities.Reward.update(selectedReward.id, {
              total_redemptions: (selectedReward.total_redemptions || 0) + 1
            });
          }
          
          await base44.entities.Customer.update(customer.id, {
            loyalty_points: newPoints,
            total_spent: (customer.total_spent || 0) + parseFloat(currentOrder.total),
            visit_count: (customer.visit_count || 0) + 1
          });
        }
      }

      setShowSolanaPayModal(false);
      setCheckoutStep('confirmation');
      setTimeout(resetOrderState, 5000);
      if (currentUser) loadUserData(currentUser);

    } catch (error) {
      console.error('Error updating order after Solana payment:', error);
      alert('Solana Payment confirmed, but failed to update order status. Please contact support.');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => (products || []).filter(product =>
    selectedCategory === "all" || product.category === selectedCategory
  ), [products, selectedCategory]);

  const categories = useMemo(() => ["all", ...new Set((products || []).map(p => p?.category).filter(Boolean))], [products]);
  const totals = calculateTotals();

  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-700 dark:text-gray-300">Loading menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-50 border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Online Ordering</h1>
              <p className="text-gray-500 dark:text-gray-400">Order ahead for pickup or delivery</p>
            </div>
            <div className="flex items-center gap-4">
              {currentUser && (
                <Button variant="outline" onClick={() => setShowAccount(true)} className="dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white">
                  My Account
                </Button>
              )}
              <Button
                onClick={() => setShowCart(true)}
                className="relative"
                disabled={cart.length === 0}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Cart ({cart.length})
                {cart.length > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-red-500 text-white">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                onClick={() => setSelectedCategory(category)}
                className={`shrink-0 capitalize ${
                  selectedCategory === category 
                    ? 'dark:bg-blue-600 dark:text-white' 
                    : 'dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white dark:bg-gray-800'
                }`}
              >
                {category === "all" ? "All Items" : category}
              </Button>
            ))}
          </div>
        </div>

        <ProductGrid
          products={filteredProducts}
          onAddToCart={(product, modifiersFromGrid) => {
            if (modifiersFromGrid && modifiersFromGrid.length > 0) {
              addToCart(product, modifiersFromGrid);
            } else {
              if (product.modifiers && product.modifiers.length > 0) {
                setSelectedProductForModifiers(product);
              } else {
                addToCart(product);
              }
            }
          }}
          posMode="quick_service"
          isMobile={false}
          showImages={true}
          onToggleFavorite={handleToggleFavorite}
          isFavorite={(productId) => currentUser?.favorite_product_ids?.includes(productId)}
        />
      </div>

      {selectedProductForModifiers && (
        <ModifierDialog
          product={selectedProductForModifiers}
          onAddToCart={addToCart}
          onCancel={() => setSelectedProductForModifiers(null)}
        />
      )}

      {/* Checkout Modal */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-gray-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="dark:text-white">
              {checkoutStep === 'details' && 'Order Details'}
              {checkoutStep === 'payment' && 'Complete Payment'}
              {checkoutStep === 'confirmation' && 'Order Confirmed!'}
            </DialogTitle>
            {checkoutStep === 'confirmation' && (
              <DialogDescription className="dark:text-gray-400">
                You will be redirected to the menu shortly.
              </DialogDescription>
            )}
          </DialogHeader>

          {checkoutStep === 'details' && (
            <div className="space-y-6">
              <Card className="dark:bg-gray-900 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg dark:text-white">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="dark:text-gray-200">Name *</Label>
                      <Input
                        value={customerInfo.name}
                        onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <Label className="dark:text-gray-200">Phone *</Label>
                      <Input
                        type="tel"
                        value={customerInfo.phone}
                        onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="dark:text-gray-200">Email (optional)</Label>
                    <Input
                      type="email"
                      value={customerInfo.email}
                      onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Loyalty Widget */}
              {customerInfo.phone && merchant?.settings?.loyalty_program?.enabled && (
                <LoyaltyWidget
                  phone={customerInfo.phone}
                  merchant={merchant}
                  onRewardSelected={setSelectedReward}
                  selectedReward={selectedReward}
                />
              )}

              <Card className="dark:bg-gray-900 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg dark:text-white">Order Fulfillment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      type="button"
                      className={`p-4 border-2 rounded-lg text-center transition-colors ${
                        customerInfo.fulfillment_type === "pickup" 
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-600" 
                          : "border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-800"
                      }`}
                      onClick={() => setCustomerInfo({...customerInfo, fulfillment_type: "pickup"})}
                    >
                      <Store className="w-8 h-8 mx-auto mb-2 dark:text-white" />
                      <div className="font-medium dark:text-white">Pickup</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Free</div>
                    </button>
                    <button
                      type="button"
                      className={`p-4 border-2 rounded-lg text-center transition-colors ${
                        customerInfo.fulfillment_type === "delivery" 
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-600" 
                          : "border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-800"
                      }`}
                      onClick={() => setCustomerInfo({...customerInfo, fulfillment_type: "delivery"})}
                    >
                      <Car className="w-8 h-8 mx-auto mb-2 dark:text-white" />
                      <div className="font-medium dark:text-white">Delivery</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">$4.99</div>
                    </button>
                    <button
                      type="button"
                      className={`p-4 border-2 rounded-lg text-center transition-colors ${
                        customerInfo.fulfillment_type === "dine_in" 
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-600" 
                          : "border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-800"
                      }`}
                      onClick={() => setCustomerInfo({...customerInfo, fulfillment_type: "dine_in"})}
                    >
                      <UtensilsCrossed className="w-8 h-8 mx-auto mb-2 dark:text-white" />
                      <div className="font-medium dark:text-white">Dine In</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Free</div>
                    </button>
                  </div>

                  {customerInfo.fulfillment_type === "delivery" && (
                    <div>
                      <Label className="dark:text-gray-200">Delivery Address *</Label>
                      <Textarea
                        value={customerInfo.delivery_address}
                        onChange={(e) => setCustomerInfo({...customerInfo, delivery_address: e.target.value})}
                        placeholder="Enter your complete delivery address"
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <Label className="dark:text-gray-200">Special Instructions (optional)</Label>
                    <Textarea
                      value={customerInfo.special_instructions}
                      onChange={(e) => setCustomerInfo({...customerInfo, special_instructions: e.target.value})}
                      placeholder="Any special requests or dietary restrictions"
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="dark:bg-gray-900 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg dark:text-white">Payment Method</CardTitle>
                </CardHeader>
                <CardContent>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full border-2 rounded-lg p-3 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="card">Credit/Debit Card</option>
                    {merchant?.settings?.online_ordering?.allow_cash_payment !== false && (
                      <option value="cash">Cash on {customerInfo.fulfillment_type === 'delivery' ? 'Delivery' : 'Pickup'}</option>
                    )}
                    {merchant?.settings?.solana_pay?.enabled && merchant?.settings?.solana_pay?.display_in_customer_terminal !== false && (
                      <option value="solana_pay">Solana Pay (Crypto)</option>
                    )}
                  </select>
                </CardContent>
              </Card>

              <Card className="dark:bg-gray-900 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg dark:text-white">Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm dark:text-gray-200">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>${totals.subtotal}</span>
                    </div>
                    {parseFloat(totals.rewardDiscount) > 0 && (
                      <div className="flex justify-between text-green-600 dark:text-green-400">
                        <span>Reward Discount:</span>
                        <span>-${totals.rewardDiscount}</span>
                      </div>
                    )}
                    {parseFloat(totals.deliveryFee) > 0 && (
                      <div className="flex justify-between">
                        <span>Delivery Fee:</span>
                        <span>${totals.deliveryFee}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>${totals.taxAmount}</span>
                    </div>
                    <Separator className="dark:bg-gray-600" />
                    <div className="flex justify-between text-lg font-bold dark:text-white">
                      <span>Total:</span>
                      <span>${totals.total}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowCheckout(false)} className="flex-1 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white">
                  Back to Menu
                </Button>
                <Button
                  onClick={initiateOrderProcess}
                  className="flex-1"
                  disabled={
                    !customerInfo.name ||
                    !customerInfo.phone ||
                    (customerInfo.fulfillment_type === "delivery" && !customerInfo.delivery_address) ||
                    loading
                  }
                >
                  {loading ? "Processing..." : "Place Order"}
                </Button>
              </div>
            </div>
          )}

          {checkoutStep === 'payment' && (
            <div className="space-y-4">
              <p className="text-center text-gray-600 dark:text-gray-300">Simulated payment - click to confirm</p>
              <Button className="w-full" onClick={() => processCardCryptoPayment({ method: paymentMethod })}>
                Confirm Payment ${totals.total}
              </Button>
              <Button variant="link" onClick={() => setCheckoutStep('details')} className="w-full dark:text-blue-400">
                Back to Details
              </Button>
            </div>
          )}

          {checkoutStep === 'confirmation' && (
            <div className="text-center py-10">
              <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
              <h3 className="text-xl font-semibold dark:text-white">Thank you for your order!</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-2">Your order has been placed successfully.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {showSolanaPayModal && currentOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <SolanaPayScreen
              order={currentOrder}
              settings={merchant?.settings}
              onPaymentComplete={handleSolanaPaymentComplete}
            />
            <Button
              variant="outline"
              className="w-full mt-4 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
              onClick={() => {
                setShowSolanaPayModal(false);
                setCurrentOrder(null);
                setCheckoutStep('details');
              }}
            >
              Cancel Payment
            </Button>
          </div>
        </div>
      )}

      {currentUser && (
        <Dialog open={showAccount} onOpenChange={setShowAccount}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto dark:bg-gray-800 dark:border-gray-700">
            <DialogHeader>
              <DialogTitle className="dark:text-white">My Account</DialogTitle>
              <DialogDescription className="dark:text-gray-400">
                View your order history, favorites, and profile information.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="flex items-center gap-4 border-b pb-4 mb-4 dark:border-gray-700">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-300 text-2xl font-bold">
                  {currentUser.full_name ? currentUser.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <h3 className="text-xl font-semibold dark:text-white">{currentUser.full_name}</h3>
                  <p className="text-gray-600 dark:text-gray-400">{currentUser.email}</p>
                </div>
              </div>

              <Tabs defaultValue="history">
                <TabsList className="grid w-full grid-cols-2 dark:bg-gray-700">
                  <TabsTrigger value="history" className="dark:data-[state=active]:bg-blue-600 dark:data-[state=active]:text-white dark:data-[state=inactive]:text-gray-300">
                    Order History
                  </TabsTrigger>
                  <TabsTrigger value="favorites" className="dark:data-[state=active]:bg-blue-600 dark:data-[state=active]:text-white dark:data-[state=inactive]:text-gray-300">
                    My Favorites
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="history" className="mt-4">
                  <div className="space-y-4">
                    {pastOrders.length > 0 ? (
                      pastOrders.map(order => (
                        <Card key={order.id} className="dark:bg-gray-900 dark:border-gray-700">
                          <CardContent className="p-4 flex justify-between items-center">
                            <div>
                              <p className="font-semibold dark:text-white">Order {order.order_number}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{new Date(order.created_date).toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold dark:text-white">${order.total.toFixed(2)}</p>
                              <Badge variant="secondary" className="capitalize mt-1 dark:bg-gray-700 dark:text-gray-200">{order.status}</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <p className="text-center text-gray-500 dark:text-gray-400 py-8">No past orders found.</p>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="favorites" className="mt-4">
                  {favoriteProducts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {favoriteProducts.map(product => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          onAddToCart={(p) => {
                            if (p.modifiers && p.modifiers.length > 0) {
                              setSelectedProductForModifiers(p);
                            } else {
                              addToCart(p);
                            }
                          }}
                          onToggleFavorite={handleToggleFavorite}
                          isFavorite={true}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">You haven't favorited any items yet.</p>
                  )}
                </TabsContent>
              </Tabs>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAccount(false)} className="dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}