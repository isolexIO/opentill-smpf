import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import MobileSolanaPay from '@/components/mobile/MobileSolanaPay';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  ArrowLeft,
  DollarSign,
  CreditCard,
  CheckCircle,
  Loader2,
  X,
  Package,
} from 'lucide-react';

export default function MobilePOS({ merchant, station, sessionId, initialProducts, initialDepartments }) {
  const { token } = useParams();
  const [products] = useState(initialProducts || []);
  const [departments] = useState(initialDepartments || []);
  const [cart, setCart] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState('products'); // products | cart | checkout | success | solana_pay
  const [loading, setLoading] = useState(!initialProducts);
  const [processing, setProcessing] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [cashReceived, setCashReceived] = useState('');
  const [pendingOrder, setPendingOrder] = useState(null); // for solana_pay & stripe flows
  const heartbeatRef = useRef(null);

  const settings = merchant?.settings || {};
  const taxRate = settings.tax_rate ?? 0.08;
  const merchantId = merchant?.id;
  const solanaPayEnabled = settings?.solana_pay?.enabled && settings?.solana_pay?.wallet_address;
  const stripeEnabled = settings?.stripe_enabled;

  // Heartbeat
  useEffect(() => {
    if (!sessionId || !merchantId) return;
    heartbeatRef.current = setInterval(async () => {
      try {
        await base44.functions.invoke('updateDeviceHeartbeat', { session_id: sessionId });
      } catch (e) { /* non-fatal */ }
    }, 10000);
    return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current); };
  }, [sessionId, merchantId]);

  // Heartbeat cleanup on unmount
  useEffect(() => {
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (sessionId) {
        base44.functions.invoke('disconnectDeviceSession', { session_id: sessionId }).catch(() => {});
      }
    };
  }, []);

  // PWA meta
  useEffect(() => {
    const metas = [
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'theme-color', content: '#3B82F6' },
    ];
    const created = metas.map(m => {
      const el = document.createElement('meta');
      el.name = m.name;
      el.content = m.content;
      document.head.appendChild(el);
      return el;
    });
    const viewport = document.querySelector('meta[name="viewport"]');
    const originalViewport = viewport?.content;
    if (viewport) {
      viewport.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
    }
    return () => {
      created.forEach(el => el.remove());
      if (viewport && originalViewport) viewport.content = originalViewport;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(p => p.department_id === selectedDepartment || p.department === selectedDepartment);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.barcode?.includes(q)
      );
    }
    return filtered;
  }, [products, selectedDepartment, searchTerm]);

  const addToCart = (product) => {
    setCart(current => {
      const existing = current.findIndex(item => item.id === product.id);
      if (existing > -1) {
        const newCart = [...current];
        newCart[existing].quantity += 1;
        return newCart;
      }
      return [...current, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (index, delta) => {
    setCart(current => {
      const newCart = [...current];
      const newQty = newCart[index].quantity + delta;
      if (newQty <= 0) {
        return current.filter((_, i) => i !== index);
      }
      newCart[index].quantity = newQty;
      return newCart;
    });
  };

  const removeFromCart = (index) => {
    setCart(current => current.filter((_, i) => i !== index));
  };

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;
    return {
      subtotal: subtotal.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      total: total.toFixed(2),
    };
  }, [cart, taxRate]);

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setView('checkout');
  };

  const buildOrderData = (paymentMethod, status = 'pending') => {
    const orderNumber = `MOBILE-${Date.now()}`;
    const total = parseFloat(totals.total);
    return {
      order_number: orderNumber,
      customer_name: 'Walk-in Customer',
      items: cart.map(item => ({
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price || 0,
        item_total: (item.price || 0) * item.quantity,
      })),
      subtotal: parseFloat(totals.subtotal),
      tax_amount: parseFloat(totals.taxAmount),
      discount_amount: 0,
      total,
      payment_method: paymentMethod,
      status,
      pos_mode: 'restaurant',
      sent_to_customer_display: true,
    };
  };

  const resetCheckoutState = () => {
    setCart([]);
    setPaymentMethod(null);
    setCashReceived('');
    setPendingOrder(null);
  };

  // Cash: create order + complete immediately
  const processCashOrder = async () => {
    setProcessing(true);
    try {
      const total = parseFloat(totals.total);
      const cashRecv = parseFloat(cashReceived) || total;
      const changeDue = Math.max(0, cashRecv - total);

      const orderData = buildOrderData('cash', 'completed');
      orderData.payment_details = {
        cash_received: cashRecv,
        change_due: changeDue,
      };

      const res = await base44.functions.invoke('createMobileOrder', {
        token,
        order_data: orderData,
      });

      if (!res.data?.success) throw new Error(res.data?.error || 'Failed to create order');

      setLastOrder({ ...orderData, id: res.data.order.id, change_due: changeDue });
      resetCheckoutState();
      setView('success');
    } catch (e) {
      console.error('MobilePOS: Cash order failed', e);
      alert(`Failed to process order: ${e.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // Card: create order → create Stripe Checkout session → redirect
  const processCardOrder = async () => {
    setProcessing(true);
    try {
      const orderData = buildOrderData('card', 'pending');

      const createRes = await base44.functions.invoke('createMobileOrder', {
        token,
        order_data: orderData,
      });

      if (!createRes.data?.success) throw new Error(createRes.data?.error || 'Failed to create order');

      const orderId = createRes.data.order.id;
      const origin = window.location.origin;
      const successUrl = `${origin}/mobile/station/${token}?stripe_status=success&order_id=${orderId}`;
      const cancelUrl = `${origin}/mobile/station/${token}?stripe_status=canceled&order_id=${orderId}`;

      const stripeRes = await base44.functions.invoke('createMobileStripeCheckout', {
        token,
        order_id: orderId,
        success_url: successUrl,
        cancel_url: cancelUrl,
      });

      if (!stripeRes.data?.success) throw new Error(stripeRes.data?.error || 'Failed to start card payment');

      // Redirect to Stripe Checkout
      window.location.href = stripeRes.data.checkout_url;
    } catch (e) {
      console.error('MobilePOS: Card order failed', e);
      alert(`Failed to start card payment: ${e.message}`);
      setProcessing(false);
    }
  };

  // Solana Pay: create order → show QR screen
  const processSolanaOrder = async () => {
    setProcessing(true);
    try {
      const orderData = buildOrderData('solana_pay', 'payment_in_progress');

      const createRes = await base44.functions.invoke('createMobileOrder', {
        token,
        order_data: orderData,
      });

      if (!createRes.data?.success) throw new Error(createRes.data?.error || 'Failed to create order');

      setPendingOrder({
        id: createRes.data.order.id,
        order_number: createRes.data.order.order_number,
        total: parseFloat(totals.total),
        items: cart.map(item => ({
          product_name: item.name,
          quantity: item.quantity,
        })),
      });
      setView('solana_pay');
      setProcessing(false);
    } catch (e) {
      console.error('MobilePOS: Solana order failed', e);
      alert(`Failed to start crypto payment: ${e.message}`);
      setProcessing(false);
    }
  };

  // Called when SolanaPay confirms payment
  const handleSolanaPaymentComplete = async (success, paymentDetails) => {
    if (!success || !pendingOrder) return;
    setProcessing(true);
    try {
      const res = await base44.functions.invoke('completeMobileOrder', {
        token,
        order_id: pendingOrder.id,
        payment_method: 'solana_pay',
        payment_details: paymentDetails,
      });

      if (!res.data?.success) throw new Error(res.data?.error || 'Failed to complete order');

      setLastOrder({
        order_number: pendingOrder.order_number,
        total: pendingOrder.total,
        change_due: 0,
      });
      resetCheckoutState();
      setView('success');
    } catch (e) {
      console.error('MobilePOS: Complete solana order failed', e);
      alert(`Failed to complete order: ${e.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // Check for Stripe Checkout return
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const stripeStatus = urlParams.get('stripe_status');
    const orderId = urlParams.get('order_id');

    if (stripeStatus === 'success' && orderId) {
      // Complete the order after Stripe Checkout success
      (async () => {
        setProcessing(true);
        try {
          const res = await base44.functions.invoke('completeMobileOrder', {
            token,
            order_id: orderId,
            payment_method: 'card',
            payment_details: { stripe_checkout: 'completed' },
          });

          if (res.data?.success) {
            setLastOrder({
              order_number: res.data.order.order_number,
              total: res.data.order.total,
              change_due: 0,
            });
            setView('success');
          } else {
            alert('Payment could not be verified. Please contact the cashier.');
          }
        } catch (e) {
          console.error('Stripe checkout return error:', e);
          alert('Payment verification failed. Please contact the cashier.');
        } finally {
          setProcessing(false);
          // Clean URL
          window.history.replaceState({}, document.title, `/mobile/station/${token}`);
        }
      })();
    } else if (stripeStatus === 'canceled') {
      // Payment canceled — go back to products
      window.history.replaceState({}, document.title, `/mobile/station/${token}`);
    }
  }, [token]);

  // --- Loading ---
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700 text-white">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <p className="text-lg font-medium">Loading products…</p>
      </div>
    );
  }

  // --- Success ---
  if (view === 'success' && lastOrder) {
    const changeDue = lastOrder.change_due || 0;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-500 to-emerald-600 text-white p-6">
        <CheckCircle className="w-20 h-20 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Order Complete!</h2>
        <p className="text-lg mb-1">{lastOrder.order_number}</p>
        <p className="text-3xl font-bold mb-4">${lastOrder.total.toFixed(2)}</p>
        {changeDue > 0 && (
          <div className="bg-white/20 rounded-xl px-6 py-3 mb-6">
            <p className="text-sm">Change Due</p>
            <p className="text-2xl font-bold">${changeDue.toFixed(2)}</p>
          </div>
        )}
        <Button
          size="lg"
          className="bg-white text-gray-900 hover:bg-gray-100"
          onClick={() => { setLastOrder(null); setView('products'); }}
        >
          New Order
        </Button>
      </div>
    );
  }

  // --- Processing overlay (Stripe redirect, etc.) ---
  if (processing && view !== 'checkout') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
        <p className="text-lg font-medium text-gray-600">Processing payment…</p>
      </div>
    );
  }

  // --- Solana Pay ---
  if (view === 'solana_pay' && pendingOrder) {
    return (
      <MobileSolanaPay
        order={pendingOrder}
        settings={settings}
        merchant={merchant}
        onPaymentComplete={handleSolanaPaymentComplete}
        onBack={() => { setView('checkout'); setPaymentMethod(null); setPendingOrder(null); }}
      />
    );
  }

  // --- Checkout ---
  if (view === 'checkout') {
    const total = parseFloat(totals.total);
    const changeDue = paymentMethod === 'cash' && parseFloat(cashReceived) ? Math.max(0, parseFloat(cashReceived) - total) : 0;
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 text-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => setView('cart')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold">Payment</h1>
        </div>

        {/* Total */}
        <div className="bg-white p-6 text-center border-b">
          <p className="text-sm text-gray-500 mb-1">Total Due</p>
          <p className="text-4xl font-bold text-gray-900">${totals.total}</p>
        </div>

        {/* Payment method selection */}
        {!paymentMethod && (
          <div className="p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-600 mb-2">Select Payment Method</p>
            <button
              className="w-full bg-white rounded-xl p-4 flex items-center gap-4 shadow-sm border-2 border-transparent hover:border-blue-500 transition-colors"
              onClick={() => setPaymentMethod('cash')}
            >
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <span className="font-semibold text-lg">Cash</span>
            </button>
            {stripeEnabled && (
              <button
                className="w-full bg-white rounded-xl p-4 flex items-center gap-4 shadow-sm border-2 border-transparent hover:border-blue-500 transition-colors"
                onClick={processCardOrder}
                disabled={processing}
              >
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  {processing ? <Loader2 className="w-6 h-6 text-blue-600 animate-spin" /> : <CreditCard className="w-6 h-6 text-blue-600" />}
                </div>
                <span className="font-semibold text-lg">{processing ? 'Redirecting…' : 'Card'}</span>
              </button>
            )}
            {solanaPayEnabled && (
              <button
                className="w-full bg-white rounded-xl p-4 flex items-center gap-4 shadow-sm border-2 border-transparent hover:border-purple-500 transition-colors"
                onClick={processSolanaOrder}
                disabled={processing}
              >
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <img
                    src="https://solana.com/src/img/branding/solanaLogoMark.svg"
                    alt="Solana"
                    className="w-6 h-6"
                  />
                </div>
                <span className="font-semibold text-lg">Crypto (Solana Pay)</span>
              </button>
            )}
            {!stripeEnabled && !solanaPayEnabled && (
              <p className="text-center text-sm text-gray-400 py-4">
                Only cash payments are available for this merchant.
              </p>
            )}
          </div>
        )}

        {/* Cash payment */}
        {paymentMethod === 'cash' && (
          <div className="p-4 space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-2">Cash Received</label>
              <Input
                type="number"
                step="0.01"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                placeholder="0.00"
                className="text-2xl font-bold h-16 text-center"
                autoFocus
              />
            </div>
            {/* Quick cash buttons */}
            <div className="grid grid-cols-4 gap-2">
              {[total, Math.ceil(total), Math.ceil(total / 5) * 5, Math.ceil(total / 10) * 10].filter((v, i, arr) => arr.indexOf(v) === i).map(amt => (
                <Button key={amt} variant="outline" onClick={() => setCashReceived(amt.toFixed(2))}>
                  ${amt.toFixed(2)}
                </Button>
              ))}
            </div>
            {parseFloat(cashReceived) >= total && (
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-600">Change Due</p>
                <p className="text-3xl font-bold text-green-600">${changeDue.toFixed(2)}</p>
              </div>
            )}
            <Button
              size="lg"
              className="w-full"
              disabled={parseFloat(cashReceived) < total || processing}
              onClick={processCashOrder}
            >
              {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : `Confirm – $${totals.total}`}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // --- Cart View ---
  if (view === 'cart') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="bg-blue-600 text-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => setView('products')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold">Cart ({itemCount})</h1>
        </div>

        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <ShoppingCart className="w-16 h-16 mb-4" />
            <p>Cart is empty</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {cart.map((item, index) => (
                <Card key={index} className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{item.name}</p>
                      <p className="text-sm text-gray-500">${(item.price || 0).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(index, -1)}>
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="font-bold w-8 text-center">{item.quantity}</span>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(index, 1)}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <span className="font-bold text-sm w-16 text-right">${((item.price || 0) * item.quantity).toFixed(2)}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeFromCart(index)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            <div className="bg-white border-t p-4 space-y-2 shadow-lg">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span>${totals.subtotal}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax</span>
                <span>${totals.taxAmount}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total</span>
                <span>${totals.total}</span>
              </div>
              <Button size="lg" className="w-full mt-2" onClick={handleCheckout}>
                Checkout – ${totals.total}
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  // --- Product Grid View ---
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}>
      {/* Header */}
      <div className="bg-blue-600 text-white px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-lg font-bold">{station?.name || 'Mobile POS'}</h1>
            <p className="text-xs text-white/70">{merchant?.business_name || ''}</p>
          </div>
          <Button
            variant="ghost"
            className="text-white hover:bg-white/20 relative"
            onClick={() => setView('cart')}
          >
            <ShoppingCart className="w-5 h-5" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {itemCount}
              </span>
            )}
          </Button>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search products…"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/20 text-white placeholder-white/50 border border-white/30 focus:bg-white focus:text-gray-900 focus:outline-none"
          />
        </div>
      </div>

      {/* Department tabs */}
      {departments.length > 0 && (
        <div className="bg-white border-b overflow-x-auto flex gap-1 px-2 py-2 sticky top-[88px] z-10">
          <button
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedDepartment === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
            onClick={() => setSelectedDepartment('all')}
          >
            All
          </button>
          {departments.map(dept => (
            <button
              key={dept.id}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedDepartment === dept.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
              onClick={() => setSelectedDepartment(dept.id)}
            >
              {dept.name}
            </button>
          ))}
        </div>
      )}

      {/* Products */}
      <div className="flex-1 overflow-y-auto p-3">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Package className="w-12 h-12 mb-3" />
            <p>No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map(product => (
              <Card
                key={product.id}
                className="overflow-hidden cursor-pointer hover:shadow-lg active:scale-95 transition-transform"
                onClick={() => addToCart(product)}
              >
                {product.image_url && (
                  <div className="aspect-square bg-gray-100">
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <CardContent className="p-3">
                  <p className="font-semibold text-sm truncate">{product.name}</p>
                  <p className="font-bold text-green-600 mt-1">${(product.price || 0).toFixed(2)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Bottom cart bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-20" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <button
            className="w-full flex items-center justify-between px-4 py-3"
            onClick={() => setView('cart')}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {itemCount}
                </span>
              </div>
              <span className="font-semibold">View Cart</span>
            </div>
            <span className="text-xl font-bold text-blue-600">${totals.total}</span>
          </button>
        </div>
      )}
    </div>
  );
}