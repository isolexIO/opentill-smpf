import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import MobileSolanaPay from '@/components/mobile/MobileSolanaPay';
import MobileOpenItemDialog from '@/components/mobile/MobileOpenItemDialog';
import MobileCustomerSheet from '@/components/mobile/MobileCustomerSheet';
import MobileAgeVerification from '@/components/mobile/MobileAgeVerification';
import CameraScanner from '@/components/pos/CameraScanner';
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
  Package,
  User,
  Tag,
  Monitor,
  ScanLine,
} from 'lucide-react';

export default function MobilePOS({ merchant, station, sessionId, initialProducts, initialDepartments, initialCustomers }) {
  const { token } = useParams();
  const [products] = useState(initialProducts || []);
  const [departments] = useState(initialDepartments || []);
  const [customers] = useState(initialCustomers || []);
  const [cart, setCart] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState('products');
  const [posProductView, setPosProductView] = useState('departments');
  const [loading, setLoading] = useState(!initialProducts);
  const [processing, setProcessing] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [cashReceived, setCashReceived] = useState('');
  const [pendingOrder, setPendingOrder] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [tableNumber, setTableNumber] = useState('');
  const [showOpenItem, setShowOpenItem] = useState(false);
  const [showCustomerSheet, setShowCustomerSheet] = useState(false);
  const [showAgeVerification, setShowAgeVerification] = useState(false);
  const [ageVerificationData, setAgeVerificationData] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const heartbeatRef = useRef(null);

  const settings = merchant?.settings || {};
  const taxRate = settings.tax_rate ?? 0.08;
  const merchantId = merchant?.id;
  const solanaPayEnabled = settings?.solana_pay?.enabled && settings?.solana_pay?.wallet_address;
  const stripeEnabled = settings?.stripe_enabled;
  const isDemo = settings?.is_demo || merchant?.is_demo;
  const isKitchenDisplayEnabled = settings?.kitchen_display?.enabled !== false;
  const isDualPricingEnabled = settings?.pricing_and_surcharge?.enable_dual_pricing || false;
  const isAgeVerificationEnabled = settings?.age_verification?.enabled !== false;

  // --- Effects: heartbeat, cleanup, PWA, Stripe return ---

  useEffect(() => {
    if (!sessionId || !merchantId) return;
    heartbeatRef.current = setInterval(async () => {
      try {
        await base44.functions.invoke('updateDeviceHeartbeat', { session_id: sessionId });
      } catch (e) { /* non-fatal */ }
    }, 10000);
    return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current); };
  }, [sessionId, merchantId]);

  useEffect(() => {
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (sessionId) {
        base44.functions.invoke('disconnectDeviceSession', { session_id: sessionId }).catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    const metas = [
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'theme-color', content: '#3B82F6' },
    ];
    const created = metas.map((m) => {
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
      created.forEach((el) => el.remove());
      if (viewport && originalViewport) viewport.content = originalViewport;
    };
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const stripeStatus = urlParams.get('stripe_status');
    const orderId = urlParams.get('order_id');

    if (stripeStatus === 'success' && orderId) {
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
          try { sessionStorage.removeItem(`opentill_mobile_cart_${token}`); } catch (e) { /* non-fatal */ }
          setProcessing(false);
          window.history.replaceState({}, document.title, `/mobile/station/${token}`);
        }
      })();
    } else if (stripeStatus === 'canceled') {
      // Restore the saved cart so the customer can retry without re-adding items
      try {
        const saved = sessionStorage.getItem(`opentill_mobile_cart_${token}`);
        if (saved) {
          const ctx = JSON.parse(saved);
          if (Array.isArray(ctx.cart) && ctx.cart.length > 0) {
            setCart(ctx.cart);
            setSelectedCustomer(ctx.selectedCustomer || null);
            setTableNumber(ctx.tableNumber || '');
            setDiscountPercent(ctx.discountPercent || 0);
            setView('cart');
          }
        }
      } catch (e) { /* non-fatal */ }
      window.history.replaceState({}, document.title, `/mobile/station/${token}`);
    }
  }, [token]);

  // Restore the cart on a plain page refresh (not a Stripe return)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('stripe_status')) return; // Stripe-return effect handles it
    try {
      const saved = sessionStorage.getItem(`opentill_mobile_cart_${token}`);
      if (saved) {
        const ctx = JSON.parse(saved);
        if (Array.isArray(ctx.cart) && ctx.cart.length > 0) {
          setCart(ctx.cart);
          setSelectedCustomer(ctx.selectedCustomer || null);
          setTableNumber(ctx.tableNumber || '');
          setDiscountPercent(ctx.discountPercent || 0);
          setView('cart');
        }
      }
    } catch (e) { /* non-fatal */ }
  }, [token]);

  // Persist the cart continuously so a refresh keeps it; clear when emptied
  useEffect(() => {
    if (!token) return;
    const key = `opentill_mobile_cart_${token}`;
    try {
      if (cart.length > 0) {
        sessionStorage.setItem(key, JSON.stringify({ cart, selectedCustomer, tableNumber, discountPercent }));
      } else {
        sessionStorage.removeItem(key);
      }
    } catch (e) { /* non-fatal */ }
  }, [cart, selectedCustomer, tableNumber, discountPercent, token]);

  // --- Derived values ---

  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(
        (p) => p.department_id === selectedDepartment || p.department === selectedDepartment
      );
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) => p.name?.toLowerCase().includes(q) || p.barcode?.includes(q)
      );
    }
    return filtered;
  }, [products, selectedDepartment, searchTerm]);

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => {
      const itemTotal = item.is_open_item ? item.price : item.price || 0;
      return sum + itemTotal * item.quantity;
    }, 0);

    const ebtEligibleTotal = cart.reduce((sum, item) => {
      if (item.ebt_eligible) {
        const itemTotal = item.is_open_item ? item.price : item.price || 0;
        return sum + itemTotal * item.quantity;
      }
      return sum;
    }, 0);

    const discountAmount = subtotal * (discountPercent / 100);
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * taxRate;

    let surchargeAmount = 0;
    let surchargeLabel = '';

    if (isDualPricingEnabled) {
      // Hardcoded in-person card-present rate: 2.7% + $0.05 + 0.80% platform fee
      const stripeRate = 2.7;
      const stripeFlat = 0.05;
      const platformFee = 0.8;
      const effectivePercent = stripeRate + platformFee;

      surchargeAmount += stripeFlat;
      let percent = effectivePercent / 100;

      const region = settings?.pricing_and_surcharge?.region || 'US';
      if (region === 'US' && percent > 0.04) percent = 0.04;
      else if (region === 'CA' && percent > 0.024) percent = 0.024;

      surchargeAmount += taxableAmount * percent;
      surchargeLabel =
        region === 'CA'
          ? 'Credit Card Processing Fee'
          : settings?.pricing_and_surcharge?.pricing_mode === 'cash_discount'
            ? 'Non-Cash Adjustment'
            : 'Credit Surcharge';
    }

    const cashTotal = taxableAmount + taxAmount;
    const cardTotal = cashTotal + surchargeAmount;

    return {
      subtotal: subtotal.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      surchargeAmount: surchargeAmount.toFixed(2),
      surchargeLabel,
      cashTotal: cashTotal.toFixed(2),
      cardTotal: cardTotal.toFixed(2),
      ebtEligibleTotal: ebtEligibleTotal.toFixed(2),
      total: cardTotal.toFixed(2),
    };
  }, [cart, taxRate, discountPercent, settings, isDualPricingEnabled]);

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // --- Cart operations ---

  const addToCart = (product) => {
    setCart((current) => {
      if (product.is_open_item) {
        return [...current, { ...product, quantity: 1 }];
      }
      const existing = current.findIndex((item) => item.id === product.id);
      if (existing > -1) {
        const newCart = [...current];
        newCart[existing].quantity += 1;
        return newCart;
      }
      return [...current, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (index, delta) => {
    setCart((current) => {
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
    setCart((current) => current.filter((_, i) => i !== index));
  };

  const handleBarcodeScanned = (barcode) => {
    const product = products.find(
      (p) => p.barcode?.trim() === barcode || p.sku?.trim() === barcode
    );
    if (product) {
      addToCart(product);
      setPosProductView('products');
      setSelectedDepartment(product.department || 'all');
    } else {
      if (navigator.vibrate) navigator.vibrate(200);
      alert(`No product found for barcode: ${barcode}`);
    }
  };

  // --- Barcode scanner ---
  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e) => {
      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      if (timeDiff > 150) {
        barcodeBuffer = '';
      }

      const activeElement = document.activeElement;
      const isInputField =
        activeElement &&
        (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');

      if (isInputField) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        if (barcodeBuffer.length >= 3) {
          handleBarcodeScanned(barcodeBuffer);
        }
        barcodeBuffer = '';
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        barcodeBuffer += e.key;
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [products]);

  // --- Order building & checkout ---

  const buildOrderData = (paymentMethod, status = 'pending') => {
    const orderNumber = `MOBILE-${Date.now()}`;
    const isCash = paymentMethod === 'cash';
    const total = isCash ? parseFloat(totals.cashTotal) : parseFloat(totals.cardTotal);

    return {
      order_number: orderNumber,
      customer_id: selectedCustomer?.id || null,
      customer_name: selectedCustomer?.name || 'Walk-in Customer',
      items: cart.map((item) => ({
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.is_open_item ? item.price : item.price || 0,
        item_total: (item.is_open_item ? item.price : item.price || 0) * item.quantity,
        is_open_item: item.is_open_item || false,
        ebt_eligible: item.ebt_eligible || false,
        age_restricted: item.age_restricted || false,
        minimum_age: item.minimum_age || null,
      })),
      subtotal: parseFloat(totals.subtotal),
      tax_amount: parseFloat(totals.taxAmount),
      discount_amount: parseFloat(totals.discountAmount),
      surcharge_amount: parseFloat(totals.surchargeAmount),
      surcharge_label: totals.surchargeLabel,
      total,
      ebt_eligible_total: parseFloat(totals.ebtEligibleTotal),
      payment_method: paymentMethod,
      status,
      pos_mode: 'restaurant',
      table_number: tableNumber || null,
      sent_to_customer_display: true,
      age_verification: ageVerificationData,
    };
  };

  const resetCheckoutState = () => {
    setCart([]);
    setPaymentMethod(null);
    setCashReceived('');
    setPendingOrder(null);
    setSelectedCustomer(null);
    setDiscountPercent(0);
    setTableNumber('');
    setAgeVerificationData(null);
    setPosProductView('departments');
    setSelectedDepartment('all');
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;

    const restrictedItems = cart.filter((item) => item.age_restricted);
    if (restrictedItems.length > 0 && isAgeVerificationEnabled) {
      setShowAgeVerification(true);
      return;
    }

    setView('checkout');
  };

  const handleAgeVerified = (verificationData) => {
    setAgeVerificationData(verificationData);
    setShowAgeVerification(false);
    setView('checkout');
  };

  const sendToKitchen = async () => {
    if (cart.length === 0) return;
    setProcessing(true);
    try {
      const orderData = buildOrderData('pending', 'pending');
      orderData.sent_to_kitchen = true;
      orderData.payment_method = 'pending';
      orderData.sent_to_customer_display = false;

      const res = await base44.functions.invoke('createMobileOrder', {
        token,
        order_data: orderData,
      });

      if (!res.data?.success) throw new Error(res.data?.error || 'Failed to send to kitchen');

      resetCheckoutState();
      setView('products');
      alert('Order sent to kitchen!');
    } catch (e) {
      console.error('MobilePOS: Send to kitchen failed', e);
      alert(`Failed to send to kitchen: ${e.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const processCashOrder = async () => {
    setProcessing(true);
    try {
      const total = parseFloat(totals.cashTotal);
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

      setLastOrder({ ...orderData, id: res.data.order.id, change_due: changeDue, total });
      resetCheckoutState();
      setView('success');
    } catch (e) {
      console.error('MobilePOS: Cash order failed', e);
      alert(`Failed to process order: ${e.message}`);
    } finally {
      setProcessing(false);
    }
  };

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

      // Demo accounts use a mock payflow — no real Stripe redirect
      if (isDemo) {
        await new Promise((r) => setTimeout(r, 1200));
        const res = await base44.functions.invoke('completeMobileOrder', {
          token,
          order_id: orderId,
          payment_method: 'card',
          payment_details: { mock: true, demo: true, last4: '4242', brand: 'test_card' },
        });
        if (!res.data?.success) throw new Error(res.data?.error || 'Failed to complete order');
        setLastOrder({
          order_number: res.data.order.order_number,
          total: res.data.order.total,
          change_due: 0,
        });
        resetCheckoutState();
        setView('success');
        return;
      }

      const origin = window.location.origin;
      const successUrl = `${origin}/mobile/station/${token}?stripe_status=success&order_id=${orderId}`;
      const cancelUrl = `${origin}/mobile/station/${token}?stripe_status=canceled&order_id=${orderId}`;

      // Persist cart across the Stripe redirect so a canceled payment restores the order
      try {
        sessionStorage.setItem(`opentill_mobile_cart_${token}`, JSON.stringify({
          cart, selectedCustomer, tableNumber, discountPercent,
        }));
      } catch (e) { /* non-fatal */ }

      const stripeRes = await base44.functions.invoke('createMobileStripeCheckout', {
        token,
        order_id: orderId,
        success_url: successUrl,
        cancel_url: cancelUrl,
      });

      if (!stripeRes.data?.success) throw new Error(stripeRes.data?.error || 'Failed to start card payment');

      window.location.href = stripeRes.data.checkout_url;
    } catch (e) {
      console.error('MobilePOS: Card order failed', e);
      alert(`Failed to start card payment: ${e.message}`);
      setProcessing(false);
    }
  };

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
        total: parseFloat(totals.cardTotal),
        items: cart.map((item) => ({
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

  // --- Dialogs (always available in non-special views) ---
  const dialogs = (
    <>
      <MobileOpenItemDialog isOpen={showOpenItem} onClose={() => setShowOpenItem(false)} onAdd={addToCart} />
      <MobileCustomerSheet
        isOpen={showCustomerSheet}
        onClose={() => setShowCustomerSheet(false)}
        customers={customers}
        selectedCustomer={selectedCustomer}
        onSelect={setSelectedCustomer}
      />
      <MobileAgeVerification
        isOpen={showAgeVerification}
        onClose={() => setShowAgeVerification(false)}
        onVerify={handleAgeVerified}
        restrictedItems={cart.filter((item) => item.age_restricted)}
        requiredAge={Math.max(
          ...cart.filter((item) => item.age_restricted).map((item) => item.minimum_age || 21),
          21
        )}
      />
      <CameraScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={(barcode) => {
          handleBarcodeScanned(barcode);
          setShowScanner(false);
        }}
      />
    </>
  );

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
          onClick={() => {
            setLastOrder(null);
            setView('products');
          }}
        >
          New Order
        </Button>
      </div>
    );
  }

  // --- Processing overlay ---
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
        onBack={() => {
          setView('checkout');
          setPaymentMethod(null);
          setPendingOrder(null);
        }}
      />
    );
  }

  // --- Checkout ---
  if (view === 'checkout') {
    const total = parseFloat(totals.cashTotal);
    const changeDue =
      paymentMethod === 'cash' && parseFloat(cashReceived)
        ? Math.max(0, parseFloat(cashReceived) - total)
        : 0;
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="bg-blue-600 text-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => setView('cart')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold">Payment</h1>
        </div>

        <div className="bg-white p-6 text-center border-b">
          <p className="text-sm text-gray-500 mb-1">Total Due</p>
          {isDualPricingEnabled && parseFloat(totals.surchargeAmount) > 0 ? (
            <div>
              <p className="text-2xl font-bold text-gray-500">${totals.cashTotal}</p>
              <p className="text-xs text-gray-400">Cash price</p>
              <p className="text-4xl font-bold text-gray-900 mt-1">${totals.cardTotal}</p>
              <p className="text-xs text-gray-400">Card price (incl. {totals.surchargeLabel})</p>
            </div>
          ) : (
            <p className="text-4xl font-bold text-gray-900">${totals.total}</p>
          )}
        </div>

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
              <div className="flex-1 text-left">
                <span className="font-semibold text-lg">Cash</span>
                {isDualPricingEnabled && <p className="text-xs text-gray-400">${totals.cashTotal}</p>}
              </div>
            </button>
            {stripeEnabled && (
              <button
                className="w-full bg-white rounded-xl p-4 flex items-center gap-4 shadow-sm border-2 border-transparent hover:border-blue-500 transition-colors"
                onClick={processCardOrder}
                disabled={processing}
              >
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  {processing ? (
                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                  ) : (
                    <CreditCard className="w-6 h-6 text-blue-600" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <span className="font-semibold text-lg">{processing ? (isDemo ? 'Processing demo payment…' : 'Redirecting…') : 'openTILL Payments'}</span>
                  {isDualPricingEnabled && <p className="text-xs text-gray-400">${totals.cardTotal}</p>}
                  {isDemo && <p className="text-xs text-blue-500">Demo · no real charge</p>}
                </div>
              </button>
            )}
            {solanaPayEnabled && (
              <button
                className="w-full bg-white rounded-xl p-4 flex items-center gap-4 shadow-sm border-2 border-transparent hover:border-purple-500 transition-colors"
                onClick={processSolanaOrder}
                disabled={processing}
              >
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <img src="https://solana.com/src/img/branding/solanaLogoMark.svg" alt="Solana" className="w-6 h-6" />
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
            <div className="grid grid-cols-4 gap-2">
              {[total, Math.ceil(total), Math.ceil(total / 5) * 5, Math.ceil(total / 10) * 10]
                .filter((v, i, arr) => arr.indexOf(v) === i)
                .map((amt) => (
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
            <Button size="lg" className="w-full" disabled={parseFloat(cashReceived) < total || processing} onClick={processCashOrder}>
              {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : `Confirm – $${totals.cashTotal}`}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // --- Cart View ---
  if (view === 'cart') {
    return (
      <>
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
                        <div className="flex gap-1 mt-1">
                          {item.ebt_eligible && (
                            <Badge variant="outline" className="text-xs">EBT</Badge>
                          )}
                          {item.age_restricted && (
                            <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                              18+
                            </Badge>
                          )}
                        </div>
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
                      <span className="font-bold text-sm w-16 text-right">
                        ${((item.price || 0) * item.quantity).toFixed(2)}
                      </span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeFromCart(index)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Cart controls */}
              <div className="bg-white border-t p-4 space-y-3 shadow-lg">
                {/* Customer & Table */}
                <div className="flex gap-2">
                  <button
                    className="flex-1 border rounded-lg p-2 flex items-center gap-2 text-sm"
                    onClick={() => setShowCustomerSheet(true)}
                  >
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="truncate">{selectedCustomer?.name || 'Walk-in'}</span>
                  </button>
                  <Input
                    placeholder="Table #"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="w-24 h-10"
                  />
                </div>

                {/* Discount */}
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-gray-500" />
                  <Input
                    type="number"
                    placeholder="Discount %"
                    value={discountPercent || ''}
                    onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                    className="h-10"
                  />
                  <span className="text-sm text-gray-500">%</span>
                </div>

                {/* Totals */}
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span>${totals.subtotal}</span>
                  </div>
                  {parseFloat(totals.discountAmount) > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-${totals.discountAmount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tax</span>
                    <span>${totals.taxAmount}</span>
                  </div>
                  {isDualPricingEnabled && parseFloat(totals.surchargeAmount) > 0 && (
                    <div className="flex justify-between text-sm text-orange-600">
                      <span>{totals.surchargeLabel}</span>
                      <span>+${totals.surchargeAmount}</span>
                    </div>
                  )}
                  {isDualPricingEnabled && parseFloat(totals.surchargeAmount) > 0 ? (
                    <div className="pt-2 border-t space-y-1">
                      <div className="flex justify-between font-bold">
                        <span>Cash Total</span>
                        <span>${totals.cashTotal}</span>
                      </div>
                      <div className="flex justify-between font-bold text-blue-600">
                        <span>Card Total</span>
                        <span>${totals.cardTotal}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                      <span>Total</span>
                      <span>${totals.total}</span>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  {isKitchenDisplayEnabled && (
                    <Button
                      variant="outline"
                      className="flex-1 bg-orange-500 text-white hover:bg-orange-600 border-orange-500"
                      onClick={sendToKitchen}
                    >
                      <Monitor className="w-4 h-4 mr-2" />
                      Kitchen
                    </Button>
                  )}
                  <Button size="lg" className="flex-1" onClick={handleCheckout}>
                    Checkout
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
        {dialogs}
      </>
    );
  }

  // --- Product Grid View ---
  return (
    <>
      <div className="min-h-screen bg-gray-50 flex flex-col" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}>
        {/* Header */}
        <div className="bg-blue-600 text-white px-4 py-3 sticky top-0 z-10">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-lg font-bold">{station?.name || 'Mobile POS'}</h1>
              <p className="text-xs text-white/70">{merchant?.business_name || ''}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={() => setShowScanner(true)}>
                <ScanLine className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={() => setShowOpenItem(true)}>
                <Package className="w-5 h-5" />
              </Button>
              <Button variant="ghost" className="text-white hover:bg-white/20 relative" onClick={() => setView('cart')}>
                <ShoppingCart className="w-5 h-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {itemCount}
                  </span>
                )}
              </Button>
            </div>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search or scan products…"
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/20 text-white placeholder-white/50 border border-white/30 focus:bg-white focus:text-gray-900 focus:outline-none"
            />
          </div>
        </div>

        {/* Department grid or Product grid */}
        {posProductView === 'departments' && departments.length > 0 && !searchTerm ? (
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-2 gap-3">
              <button
                className="bg-white rounded-xl p-4 shadow-sm border-2 border-transparent hover:border-blue-500 transition-colors flex flex-col items-center gap-2"
                onClick={() => {
                  setSelectedDepartment('all');
                  setPosProductView('products');
                }}
              >
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <span className="font-semibold text-sm">All Products</span>
              </button>
              {departments.map((dept) => (
                <button
                  key={dept.id}
                  className="bg-white rounded-xl p-4 shadow-sm border-2 border-transparent hover:border-blue-500 transition-colors flex flex-col items-center gap-2"
                  onClick={() => {
                    setSelectedDepartment(dept.name);
                    setPosProductView('products');
                  }}
                >
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <Package className="w-6 h-6 text-purple-600" />
                  </div>
                  <span className="font-semibold text-sm">{dept.name}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-3">
            {posProductView === 'departments' && departments.length > 0 && (
              <button
                className="mb-3 text-sm text-blue-600 font-medium"
                onClick={() => {
                  setPosProductView('departments');
                  setSelectedDepartment('all');
                  setSearchTerm('');
                }}
              >
                ← Back to Departments
              </button>
            )}
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Package className="w-12 h-12 mb-3" />
                <p>No products found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredProducts.map((product) => (
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
                      <div className="flex items-center justify-between mt-1">
                        <p className="font-bold text-green-600">${(product.price || 0).toFixed(2)}</p>
                        {product.ebt_eligible && <Badge variant="outline" className="text-xs">EBT</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bottom cart bar */}
        {cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-20" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <button className="w-full flex items-center justify-between px-4 py-3" onClick={() => setView('cart')}>
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
      {dialogs}
    </>
  );
}