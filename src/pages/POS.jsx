import { useState, useEffect, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";


import {
  CreditCard,
  Search,
  Camera,
  Monitor,
  Globe,
  CheckCircle,
  AlertCircle,
  Package,
  MonitorPlay, // New import for Customer Display icon
  Settings, // New import for Settings icon
  LogOut,   // New import for LogOut icon
  Menu,      // New import for Menu icon
  MoreVertical // New import for MoreVertical icon
} from "lucide-react";
import { createPageUrl } from "@/utils";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import ProductGrid from "../components/pos/ProductGrid";
import Cart from "../components/pos/Cart";
import CustomerSelector from "../components/pos/CustomerSelector";
import CameraScanner from "../components/pos/CameraScanner";
// This will be replaced in JSX but keeping for now if it's referenced elsewhere
import PaymentModal from "../components/pos/PaymentModal";
import DepartmentGrid from "../components/pos/DepartmentGrid";
import OpenItemDialog from "../components/pos/OpenItemDialog";
import AgeVerificationDialog from "../components/pos/AgeVerificationDialog";
import PaymentChoiceDialog from "../components/pos/PaymentChoiceDialog";
import QuickCreateModal from "../components/pos/QuickCreateModal";

// POS_MODES are defined but the UI selector for them is removed based on the outline.
// The default posMode is 'restaurant' and will be used throughout the application.
const POS_MODES = [
  { value: "restaurant", label: "Restaurant", color: "bg-blue-500" },
  { value: "retail", label: "Retail", color: "bg-green-500" },
  { value: "quick_service", label: "Quick Service", color: "bg-yellow-500" },
  { value: "food_truck", label: "Food Truck", color: "bg-purple-500" }
];

export default function POSPage() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  // posMode is now fixed to "restaurant" as the selector is removed.
  // If dynamic mode switching is needed in the future, a different UI mechanism would be required.
  const [posMode, setPosMode] = useState("restaurant");
  const [searchTerm, setSearchTerm] = useState("");
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [showPayment, setShowPayment] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [tableNumber, setTableNumber] = useState("");
  const [settings, setSettings] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [productNotFoundDialog, setProductNotFoundDialog] = useState({
    isOpen: false,
    barcode: ''
  });
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [order, setOrder] = useState(null);
  const [stationId, setStationId] = useState(null);
  const [stationName, setStationName] = useState('');
  const [viewMode, setViewMode] = useState('pos');
  const [openTickets, setOpenTickets] = useState([]);
  const [pendingOnlineOrders, setPendingOnlineOrders] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [posProductView, setPosProductView] = useState('departments');
  const [isOpenItemDialogOpen, setIsOpenItemDialogOpen] = useState(false);
  const [isAgeVerificationOpen, setIsAgeVerificationOpen] = useState(false);
  const [ageVerificationData, setAgeVerificationData] = useState(null);
  const [deviceSessionId, setDeviceSessionId] = useState(null);
  const [initError, setInitError] = useState(null); // New state for initialization errors
  const [showPaymentChoice, setShowPaymentChoice] = useState(false);
  const [waitingForCustomer, setWaitingForCustomer] = useState(false);
  const [customerSelectedMethod, setCustomerSelectedMethod] = useState(null);

  // Refs to track if we're currently loading to prevent duplicate calls
  const loadingProductsRef = useRef(false);
  const loadingCustomersRef = useRef(false);
  const loadingOrdersRef = useRef(false);
  const loadingTicketsRef = useRef(false);

  const isKitchenDisplayEnabled = settings?.kitchen_display?.enabled !== false;

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Load initial data - ONLY ONCE on mount
  useEffect(() => {
    const initializePOS = async () => {
      setIsLoadingData(true);
      setInitError(null); // Clear previous errors

      try {
        console.log('POS: Starting initialization...');

        // **THE FIX**: Ensure settings are loaded BEFORE anything else.
        await loadSettingsAndMerchant();

        // Now that settings (including merchant_id) are guaranteed to be loaded,
        // load the rest of the data.
        await Promise.all([
          loadProducts(),
          loadCustomers(),
          loadDepartments(),
        ]);
        console.log('POS: All data loaded successfully');
      } catch (error) {
        console.error('POS: Fatal error during initialization:', error);
        setInitError(error.message || 'Failed to initialize POS');
      } finally {
        setIsLoadingData(false);
      }
    };
    initializePOS();
  }, []); // Empty dependency array - only run once

  // Load pending online orders - ONLY when merchant_id is available and in online orders view
  useEffect(() => {
    if (settings?.merchant_id === 'demo') {
      console.log('Demo Mode: Skipping online orders load.');
      return;
    }
    if (settings?.merchant_id && viewMode === 'online_orders') {
      loadPendingOnlineOrders();
      // Poll every 60 seconds (increased from 30)
      const interval = setInterval(loadPendingOnlineOrders, 60000);
      return () => clearInterval(interval);
    }
  }, [settings?.merchant_id, viewMode]); // Updated dependency array

  // Load open tickets - ONLY when in that view
  useEffect(() => {
    if (settings?.merchant_id === 'demo') {
      console.log('Demo Mode: Skipping open tickets load.');
      return;
    }
    if (viewMode === 'open_tickets' && settings?.merchant_id && isKitchenDisplayEnabled) {
      loadOpenTickets();
      // Poll every 30 seconds (increased from 10)
      const interval = setInterval(loadOpenTickets, 30000);
      return () => clearInterval(interval);
    }
  }, [viewMode, settings?.merchant_id, isKitchenDisplayEnabled]); // Updated dependency array

  // Update preview order - debounced
  useEffect(() => {
    if (settings?.merchant_id === 'demo') {
      console.log('Demo Mode: Skipping updatePreviewOrder.');
      return;
    }
    if (cart.length === 0 || !stationId || !settings?.merchant_id || viewMode !== 'pos') {
      return;
    }

    // Debounce preview updates to avoid rate limiting
    const timeoutId = setTimeout(() => {
      updatePreviewOrder();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [cart, discountPercent, selectedCustomer, tableNumber, stationId, stationName, posMode, settings, viewMode]);

  // Poll for order status updates when an order is active
  useEffect(() => {
    if (settings?.merchant_id === 'demo') {
      console.log('Demo Mode: Skipping order status polling.');
      return;
    }
    let interval;
    if (currentOrderId && settings?.merchant_id && viewMode === 'pos') {
      const fetchOrder = async () => {
        try {
          const fetchedOrder = await base44.entities.Order.get(currentOrderId);
          
          // Only update state if the order data has actually changed
          if (JSON.stringify(fetchedOrder) !== JSON.stringify(order)) {
            console.log('POS: Order status changed:', {
              id: fetchedOrder.id,
              status: fetchedOrder.status,
              payment_method: fetchedOrder.payment_method
            });
            
            setOrder(fetchedOrder);
            
            // Track when customer selects payment method
            if (waitingForCustomer && fetchedOrder.payment_method && fetchedOrder.payment_method !== 'pending') {
              console.log('POS: Customer selected payment method:', fetchedOrder.payment_method);
              setCustomerSelectedMethod(fetchedOrder.payment_method);
            }
            
            // Auto-close dialog and open payment modal when customer completes tip/approval and selects payment
            if (waitingForCustomer && fetchedOrder.status === 'payment_in_progress' && fetchedOrder.payment_method !== 'solana_pay') {
              console.log('POS: Customer ready for card payment, opening payment modal');
              setShowPaymentChoice(false);
              setWaitingForCustomer(false);
              setShowPayment(true);
            }
            
            // Handle Solana Pay completion
            if (fetchedOrder.status === 'completed' && fetchedOrder.payment_method === 'solana_pay') {
              console.log('POS: Solana payment completed, clearing order...');
              
              alert(`Payment successful!\nOrder ${fetchedOrder.order_number} completed via Solana Pay\n\nTransaction: ${fetchedOrder.payment_details?.signature || 'N/A'}\nAmount: ${fetchedOrder.payment_details?.amount || 0} ${fetchedOrder.payment_details?.token || 'TOKEN'}`);
              
              setCart([]);
              setSelectedCustomer(null);
              setDiscountPercent(0);
              setTableNumber("");
              setShowPayment(false);
              setShowPaymentChoice(false);
              setWaitingForCustomer(false);
              setCurrentOrderId(null);
              setOrder(null);
              setCustomerSelectedMethod(null);
              setPosProductView('departments');
              setSelectedDepartment('all');
              
              if (viewMode === 'open_tickets') {
                loadOpenTickets();
              }
            }
            
            // Handle any completed order
            if (fetchedOrder.status === 'completed' && order?.status !== 'completed') {
              console.log('POS: Order completed, cleaning up...');
              
              setTimeout(() => {
                if (currentOrderId === fetchedOrder.id) {
                  console.log('POS: Clearing completed order from POS');
                  setCurrentOrderId(null);
                  setOrder(null);
                  setCart([]);
                  setShowPayment(false);
                  setShowPaymentChoice(false);
                  setWaitingForCustomer(false);
                }
              }, 3000);
            }
          }
        } catch (error) {
          // Silently handle "not found" errors - this is expected when order is deleted
          if (error.message && (error.message.includes('not found') || error.message.includes('Object not found'))) {
            console.log('POS: Order no longer exists, clearing state');
            setOrder(null);
            setCurrentOrderId(null);
          } else {
            // Only log unexpected errors
            console.error("POS: Unexpected polling error:", error.message);
          }
        }
      };

      fetchOrder();
      interval = setInterval(fetchOrder, 2000);
    } else {
      if (order !== null) {
        setOrder(null);
      }
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [currentOrderId, settings?.merchant_id, viewMode, order?.status, order?.payment_method, waitingForCustomer]);


  // Trigger PaymentModal when order status indicates POS should handle card payment
  useEffect(() => {
    // If order status changes to 'payment_in_progress' or 'tip_selection_complete' (meaning tipping is done or skipped),
    // and the payment method is card, then show the payment modal.
    if (order && (order.status === 'payment_in_progress' || order.status === 'tip_selection_complete') && order.payment_method === 'card' && !showPayment) {
      setShowPayment(true);
    }
  }, [order, showPayment]);


  // Clear preview when cart is empty
  useEffect(() => {
    if (settings?.merchant_id === 'demo') {
      console.log('Demo Mode: Skipping preview clear based on empty cart.');
      return;
    }
    if (cart.length === 0 && currentOrderId && stationId && settings?.merchant_id) {
      const timeoutId = setTimeout(() => {
        clearPreview();
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [cart.length, currentOrderId, stationId, settings?.merchant_id]);

  // Device Session Registration and Heartbeat
  useEffect(() => {
    if (settings?.merchant_id === 'demo') {
      console.log('Demo Mode: Skipping device session registration and heartbeat.');
      return;
    }
    if (!stationId || !settings?.merchant_id) {
      console.log('POS: Missing stationId or merchant_id, skipping device session');
      return;
    }

    let sessionId = null;

    const registerSession = async () => {
      try {
        console.log('POS: Registering device session...', {
          merchant_id: settings.merchant_id,
          station_id: stationId,
          station_name: stationName
        });

        const { data } = await base44.functions.invoke('registerDeviceSession', {
          merchant_id: settings.merchant_id, // Pass merchant_id explicitly
          device_name: stationName || 'POS Terminal',
          device_type: 'pos',
          station_id: stationId,
          station_name: stationName,
          metadata: {
            pos_mode: posMode,
            browser: navigator.userAgent,
            screen_resolution: `${window.screen.width}x${window.screen.height}`
          }
        });

        if (data?.session?.session_id) {
          sessionId = data.session.session_id;
          setDeviceSessionId(sessionId);
          console.log('POS: Device session registered successfully:', sessionId);
        } else {
          console.warn('POS: Session registration returned no session_id');
        }
      } catch (error) {
        console.error('POS: Error registering device session:', error);
        // Don't break the app, just log
      }
    };

    const sendHeartbeat = async () => {
      if (!sessionId) {
        console.log('POS: No session ID, skipping heartbeat');
        return;
      }

      try {
        const { data } = await base44.functions.invoke('updateDeviceHeartbeat', {
          session_id: sessionId,
          active_order_id: currentOrderId || null,
          active_order_number: order?.order_number || null,
          status: cart.length > 0 ? 'online' : 'idle'
        });

        // Check if session was force-disconnected
        if (data?.forced_disconnect) {
          console.log('POS: Session was force-disconnected by admin');
          // Optionally show message or redirect
        }
      } catch (error) {
        // Only log error occasionally to avoid spam
        if (Math.random() < 0.1) {
          console.log('POS: Heartbeat error (suppressed):', error.message);
        }
        // Don't break the app - heartbeat failures are not critical
      }
    };

    // Register session immediately
    registerSession();

    // Send heartbeat every 30 seconds
    const heartbeatInterval = setInterval(sendHeartbeat, 30000);

    // Cleanup on unmount
    return () => {
      clearInterval(heartbeatInterval);

      if (sessionId) {
        base44.functions.invoke('disconnectDeviceSession', {
          session_id: sessionId
        }).catch(err => {
          // Ignore disconnect errors on cleanup
          console.log('POS: Session disconnect on cleanup (ignored)');
        });
      }
    };
  }, [stationId, stationName, settings?.merchant_id, posMode, currentOrderId, order?.order_number, cart.length]);

  // Add keyboard barcode scanner listener
  useEffect(() => {
    console.log('POS: Barcode scanner setup check:', {
      hasSettings: !!settings,
      enabled: settings?.hardware?.barcodeScanner?.enabled,
      type: settings?.hardware?.barcodeScanner?.type
    });

    // ALWAYS enable keyboard scanner for demo/development
    const scannerEnabled = true; // Force enable for now
    const scannerType = settings?.hardware?.barcodeScanner?.type || 'keyboard';

    if (!scannerEnabled || scannerType !== 'keyboard') {
      console.log('POS: Keyboard barcode scanner disabled');
      return;
    }

    console.log('POS: Setting up keyboard barcode scanner');
    let barcodeBuffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e) => {
      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      // If too much time has passed, reset buffer
      if (timeDiff > (settings?.hardware?.barcodeScanner?.scanTimeout || 150)) {
        barcodeBuffer = '';
      }

      // Only process if we're not in an input field
      const activeElement = document.activeElement;
      const isInputField = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.contentEditable === 'true'
      );

      if (isInputField) {
        return;
      }

      // Check if this is Enter key
      if (e.key === 'Enter' || e.keyCode === 13) {
        e.preventDefault();
        e.stopPropagation();
        
        const minLength = settings?.hardware?.barcodeScanner?.minLength || 3;
        console.log('POS: Enter pressed, buffer:', barcodeBuffer, 'minLength:', minLength);
        
        if (barcodeBuffer.length >= minLength) {
          console.log('POS: Processing barcode:', barcodeBuffer);
          handleBarcodeScanned(barcodeBuffer);
        } else {
          console.log('POS: Barcode too short, ignoring');
        }
        barcodeBuffer = '';
        return false;
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Regular character key
        e.preventDefault();
        e.stopPropagation();
        barcodeBuffer += e.key;
        return false;
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    console.log('POS: Keyboard scanner listener added');
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      console.log('POS: Keyboard scanner listener removed');
    };
  }, [settings?.hardware?.barcodeScanner]);

  const updatePreviewOrder = async () => {
    if (settings?.merchant_id === 'demo') {
      console.log('Demo Mode: Skipping updatePreviewOrder.');
      return;
    }
    try {
      const totals = calculateTotals();
      const orderData = {
        merchant_id: settings.merchant_id,
        order_number: `PREVIEW-${stationId}`,
        station_id: stationId,
        station_name: stationName,
        customer_id: selectedCustomer?.id,
        customer_name: selectedCustomer?.name || "Walk-in Customer",
        items: cart.map(item => ({
          product_id: item?.id,
          product_name: item?.name,
          quantity: item?.quantity || 0,
          unit_price: item?.is_open_item ? item.price : (item?.price || 0),
          modifiers: item?.modifiers || [],
          item_total: (item?.itemTotal || 0) * (item?.quantity || 0),
          is_open_item: item?.is_open_item || false,
          ebt_eligible: item?.ebt_eligible || false,
          tippable: item?.tippable !== false, // Default to true if not specified
          age_restricted: item?.age_restricted || false,
          minimum_age: item?.minimum_age || null
        })),
        subtotal: parseFloat(totals.subtotal),
        tax_amount: parseFloat(totals.taxAmount),
        discount_amount: parseFloat(totals.discountAmount),
        surcharge_amount: parseFloat(totals.surchargeAmount),
        surcharge_label: totals.surchargeLabel,
        tip_amount: 0,
        total: parseFloat(totals.cardTotal),
        payment_method: "pending",
        status: "preview",
        pos_mode: posMode,
        table_number: tableNumber || null,
        location: posMode === "food_truck" ? "Mobile Location" : "Main Store",
        sent_to_customer_display: false, // FIXED: Set to false for preview orders
        sent_to_kitchen: false
      };

      // Find existing preview order for this station
      const existingPreviews = await base44.entities.Order.filter({
        merchant_id: settings.merchant_id,
        station_id: stationId,
        status: 'preview'
      });

      if (existingPreviews && existingPreviews.length > 0) {
        // Update the first one, delete any others
        const previewToUpdate = existingPreviews[0];
        await base44.entities.Order.update(previewToUpdate.id, orderData);
        setCurrentOrderId(previewToUpdate.id);
        console.log('POS: Updated preview order:', previewToUpdate.id);

        // Clean up any duplicate previews
        for (let i = 1; i < existingPreviews.length; i++) {
          try {
            await base44.entities.Order.delete(existingPreviews[i].id);
          } catch (e) {
            // Ignore errors when cleaning up duplicates
          }
        }
      } else {
        // No preview exists, create new one
        const createdOrder = await base44.entities.Order.create(orderData);
        setCurrentOrderId(createdOrder.id);
        console.log('POS: Created new preview order:', createdOrder.id);
      }
    } catch (error) {
      console.error('Error updating preview order:', error);
      // Don't show alert to user, just log it
    }
  };

  const clearPreview = async () => {
    if (settings?.merchant_id === 'demo') {
      console.log('Demo Mode: Skipping clearPreview.');
      return;
    }
    try {
      // Find and delete all preview orders for this station
      const existingPreviews = await base44.entities.Order.filter({
        merchant_id: settings.merchant_id,
        station_id: stationId,
        status: 'preview'
      });

      for (const preview of existingPreviews) {
        try {
          await base44.entities.Order.delete(preview.id);
        } catch (e) {
          // Ignore individual delete errors
        }
      }

      // **THE FIX**: DO NOT clear currentOrderId here. It's needed for polling.
      // The polling logic will handle clearing state if the order is truly gone.
      // setCurrentOrderId(null);
      // setOrder(null);
    } catch (error) {
      console.error('Error clearing preview orders:', error);
      // setCurrentOrderId(null);
      // setOrder(null);
    }
  };

  const loadProducts = async () => {
    if (loadingProductsRef.current) return;
    loadingProductsRef.current = true;

    try {
      console.log('POS: Loading products...');
      const productList = await base44.entities.Product.list();
      console.log(`POS: Loaded ${productList.length} products`);
      setProducts(productList.filter(p => p.is_active)); // Filter by posMode will happen in filteredProducts
    } catch (error) {
      console.error("Error loading products:", error);
      // Don't throw, just log - allow POS to work without products
      setProducts([]); // Ensure products array is empty if loading fails
    } finally {
      loadingProductsRef.current = false;
    }
  };

  const loadCustomers = async () => {
    if (loadingCustomersRef.current) return;
    loadingCustomersRef.current = true;

    try {
      console.log('POS: Loading customers...');
      const customerList = await base44.entities.Customer.list();
      console.log(`POS: Loaded ${customerList.length} customers`);
      setCustomers(customerList);
    } catch (error) {
      console.error("Error loading customers:", error);
      // Don't throw, allow POS to work without customers
      setCustomers([]); // Ensure customers array is empty if loading fails
    } finally {
      loadingCustomersRef.current = false;
    }
  };

  const loadSettingsAndMerchant = async () => {
    // Default barcode scanner settings
    const defaultBarcodeScannerSettings = {
      enabled: false,
      type: "keyboard",
      prefix: "",
      playBeep: true,
      autoSearch: false,
      minLength: 4,
      scanTimeout: 150,
    };

    try {
      console.log('POS: Loading settings and merchant...');

      // Entity calls (Merchant, Products, Orders) require an authenticated base44
      // session for RLS. PIN/email logins only store a local snapshot — they do NOT
      // create a session. So always verify a live session first; if there is none,
      // send the user through the platform login (the only flow that creates a real
      // session), preserving this station link so they return straight to the POS.
      let pinUser = null;
      let sessionUser = null;
      try {
        sessionUser = await base44.auth.me();
      } catch (e) {
        console.warn('POS: No authenticated session.');
      }

      if (!sessionUser || !sessionUser.id) {
        const up = new URLSearchParams(window.location.search);
        const sId = up.get('station_id') || '';
        const returnTo = sId ? `${createPageUrl('POS')}?station_id=${encodeURIComponent(sId)}` : createPageUrl('POS');
        try {
          await base44.auth.redirectToLogin(returnTo);
        } catch (err) {
          console.error('POS: redirectToLogin failed:', err);
          setInitError('Authentication is required to use this station. Please sign in and reopen the station link.');
        }
        return;
      }

      // Prefer the staff PIN identity when it belongs to the same merchant as the session
      const pinUserJSON = localStorage.getItem('pinLoggedInUser');
      if (pinUserJSON) {
        try {
          const local = JSON.parse(pinUserJSON);
          if (local && local.merchant_id && local.merchant_id === sessionUser.merchant_id) {
            pinUser = local;
          }
        } catch (e) { /* ignore malformed snapshot */ }
      }
      if (!pinUser) pinUser = sessionUser;
      localStorage.setItem('pinLoggedInUser', JSON.stringify(pinUser));
      if (sessionUser.merchant_id) localStorage.setItem('deviceMerchantId', sessionUser.merchant_id);

      // Proceed based on whether we are in demo mode or a real merchant
      if (pinUser && pinUser.merchant_id && pinUser.merchant_id !== 'demo') {
        console.log('POS: Loading merchant with ID:', pinUser.merchant_id);
        
        try {
          // Try to fetch merchant - first with user scope, then with service role if needed
          let merchants = [];
          
          try {
            merchants = await base44.entities.Merchant.filter({ id: pinUser.merchant_id });
            console.log('POS: User-scoped merchant fetch returned:', merchants.length, 'results');
          } catch (userScopeError) {
            console.warn('POS: User-scoped merchant fetch failed, trying to invoke repair function if no merchants found:', userScopeError.message);
          }

          // If not found, try to repair the situation
          if (!merchants || merchants.length === 0) {
            console.log('POS: Merchant not found with ID:', pinUser.merchant_id);
            console.log('POS: Attempting to repair merchant connection...');
            
            try {
              const repairResponse = await base44.functions.invoke('repairMerchantConnection', {
                user_email: pinUser.email,
                user_merchant_id: pinUser.merchant_id
              });

              if (repairResponse.data?.success) {
                console.log('POS: Repair successful:', repairResponse.data.message);
                
                // Refresh user data to get potentially updated merchant_id or other settings
                const updatedUser = await base44.auth.me();
                localStorage.setItem('pinLoggedInUser', JSON.stringify(updatedUser));
                
                // Try to load merchant again with the updated user info
                merchants = await base44.entities.Merchant.filter({ id: updatedUser.merchant_id });
                
                if (merchants && merchants.length > 0) {
                  pinUser = updatedUser; // Use the updated user object for subsequent steps
                  console.log('POS: Successfully repaired and loaded merchant');
                }
              } else {
                throw new Error(repairResponse.data?.error || 'Repair failed');
              }
            } catch (repairError) {
              console.error('POS: Repair failed:', repairError);
              throw new Error('Your merchant account could not be found. Please contact support with error code: MERCHANT_NOT_FOUND');
            }
          }

          if (merchants && merchants.length > 0) {
            const merchant = merchants[0];
            console.log('POS: Merchant loaded:', merchant.business_name);

            const urlStationId = new URLSearchParams(window.location.search).get('station_id');
            let effectiveStationId = urlStationId || pinUser.pos_settings?.station_id, effectiveStationName = pinUser.pos_settings?.station_name, updatedPinUser = { ...pinUser };
            if (urlStationId) { try { const st = await base44.entities.Station.filter({ merchant_id: pinUser.merchant_id, station_id: urlStationId }); effectiveStationName = st?.length ? st[0].name : urlStationId; } catch { effectiveStationName = urlStationId; } }

            if (!effectiveStationId) {
              effectiveStationId = `STATION-${Date.now()}`;
              effectiveStationName = 'Main Station';

              updatedPinUser.pos_settings = {
                ...(updatedPinUser.pos_settings || {}),
                station_id: effectiveStationId,
                station_name: effectiveStationName
              };
              
              // Update user with station info
              try {
                // Use base44.auth.updateMe for user-specific settings
                await base44.auth.updateMe({ pos_settings: updatedPinUser.pos_settings });
                localStorage.setItem('pinLoggedInUser', JSON.stringify(updatedPinUser));
                pinUser = updatedPinUser; // Update pinUser for subsequent steps in this function
              } catch (updateError) {
                console.warn('POS: Could not update user with station info:', updateError);
                // Don't critical fail if user update fails, but warn.
              }
            } else {
              if (!effectiveStationName) {
                effectiveStationName = 'Main Station';
                updatedPinUser.pos_settings = {
                  ...(updatedPinUser.pos_settings || {}),
                  station_name: effectiveStationName
                };
                
                try {
                  // Use base44.auth.updateMe for user-specific settings
                  await base44.auth.updateMe({ pos_settings: updatedPinUser.pos_settings });
                  localStorage.setItem('pinLoggedInUser', JSON.stringify(updatedPinUser));
                  pinUser = updatedPinUser; // Update pinUser for subsequent steps in this function
                } catch (updateError) {
                  console.warn('POS: Could not update user with station name:', updateError);
                  // Don't critical fail if user update fails, but warn.
                }
              }
            }

            // Merge merchant settings with user pos_settings
            let currentSettings = {
              ...(merchant.settings || {}),
              ...(pinUser.pos_settings || {}), // User's POS settings (now guaranteed to have station_id and name) override
              merchant_id: pinUser.merchant_id // Ensure merchant_id is present and correct
            };

            // Apply hardware defaults
            currentSettings.hardware = {
              ...currentSettings.hardware,
              barcodeScanner: {
                ...defaultBarcodeScannerSettings,
                ...(currentSettings.hardware?.barcodeScanner || {}),
              }
            };

            // Ensure blockchain settings exist
            if (!currentSettings.blockchain) {
              currentSettings.blockchain = {
                enabled: false,
                network: 'mainnet',
                solana_wallet_address: '',
                btc_address: '',
                eth_address: ''
              };
            }

            // Ensure age_verification settings exist
            if (!currentSettings.age_verification) {
              currentSettings.age_verification = {
                enabled: true,
              };
            }
            
            // Ensure kitchen_display settings exist
            if (!currentSettings.kitchen_display) {
              currentSettings.kitchen_display = {
                enabled: true,
              };
            }

            setSettings(currentSettings);
            setStationId(effectiveStationId);
            setStationName(effectiveStationName);
            console.log('POS: Settings configured successfully for real merchant.');

          } else {
            // This should ideally not be reached if repair succeeded, but as a safeguard
            throw new Error('Merchant not found after all attempts');
          }
        } catch (merchantError) {
          console.error('POS: Error loading merchant data or updating user settings:', merchantError);
          alert('Failed to load merchant data: ' + merchantError.message + '\n\nPlease contact support or try logging in again.');
          window.location.href = createPageUrl('PinLogin');
          return; // Stop further execution
        }
      } else {
        // Demo mode
        console.log('POS: Running in demo mode');
        setSettings({
          merchant_id: 'demo',
          hardware: {
            barcodeScanner: defaultBarcodeScannerSettings
          },
          blockchain: {
            enabled: false
          },
          age_verification: {
              enabled: true
            },
          kitchen_display: {
            enabled: true,
          }
        });
        setStationId('DEMO-STATION');
        setStationName('Demo Station');
        console.log('POS: Settings configured for demo mode.');
      }

    } catch (error) {
      console.error("POS: Fatal error in loadSettingsAndMerchant:", error);
      // Catch-all for any other unexpected errors during the entire process
      setInitError('Failed to load POS settings: ' + error.message);
      // Do not redirect here, as a specific initError message will be displayed.
    }
  };

  const loadDepartments = async () => {
    try {
      console.log('POS: Loading departments...');
      
      // Get merchant_id reliably
      let merchantId = settings?.merchant_id;
      if (!merchantId) {
        const pinUserJSON = localStorage.getItem('pinLoggedInUser');
        if (pinUserJSON) {
          try {
            const pinUser = JSON.parse(pinUserJSON);
            merchantId = pinUser.merchant_id;
          } catch (e) {
            console.error('Error parsing pinLoggedInUser:', e);
          }
        }
      }
      
      if (!merchantId || merchantId === 'demo') {
        console.log('POS: Demo mode, loading all departments');
        const departmentList = await base44.entities.Department.list();
        setDepartments(departmentList);
        return;
      }
      
      console.log('POS: Loading departments for merchant:', merchantId);
      const departmentList = await base44.entities.Department.filter({ merchant_id: merchantId });
      console.log(`POS: Loaded ${departmentList.length} departments`);
      
      // Sort by display_order
      departmentList.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      
      console.log('POS: Department data:', departmentList.map(d => ({
        name: d.name,
        color: d.color,
        icon: d.icon
      })));
      
      setDepartments(departmentList);
    } catch (error) {
      console.error("Error loading departments:", error);
      setDepartments([]);
    }
  };

  const loadPendingOnlineOrders = async () => {
    if (settings?.merchant_id === 'demo') {
      console.log('Demo Mode: Skipping loadPendingOnlineOrders.');
      setPendingOnlineOrders([]);
      return;
    }
    if (loadingOrdersRef.current) return;
    loadingOrdersRef.current = true;

    try {
      let merchantId = settings?.merchant_id;
      if (!merchantId) {
        // Fallback for getting merchantId if settings isn't fully loaded yet
        const pinUserJSON = localStorage.getItem('pinLoggedInUser');
        if (pinUserJSON) {
          try {
            const pinUser = JSON.parse(pinUserJSON);
            merchantId = pinUser.merchant_id;
          } catch (e) {
            console.error('Error parsing pinLoggedInUser:', e);
          }
        }
      }

      if (!merchantId) {
        try {
          const user = await base44.auth.me();
          merchantId = user.merchant_id;
        } catch (e) {
          console.error('Error getting authenticated user:', e);
        }
      }

      if (!merchantId || merchantId === 'demo') return; // Exit if still no merchantId or in demo mode

      const orders = await base44.entities.OnlineOrder.filter({
        merchant_id: merchantId,
        status: 'pending'
      }, '-created_date');

      setPendingOnlineOrders(orders);
    } catch (error) {
      // Only log error, don't alert to avoid spam
      console.error('Error loading pending online orders:', error);
      setPendingOnlineOrders([]);
    } finally {
      loadingOrdersRef.current = false;
    }
  };

  const loadOpenTickets = async () => {
    if (settings?.merchant_id === 'demo') {
      console.log('Demo Mode: Skipping loadOpenTickets.');
      setOpenTickets([]);
      return;
    }
    if (!isKitchenDisplayEnabled) {
      console.log('Kitchen Display is not enabled, skipping loadOpenTickets.');
      setOpenTickets([]);
      return;
    }
    if (loadingTicketsRef.current) return;
    loadingTicketsRef.current = true;

    try {
      let merchantId = settings?.merchant_id;
      if (!merchantId) {
        // Fallback for getting merchantId if settings isn't fully loaded yet
        const pinUserJSON = localStorage.getItem('pinLoggedInUser');
        if (pinUserJSON) {
          try {
            const pinUser = JSON.parse(pinUserJSON);
            merchantId = pinUser.merchant_id;
          } catch (e) {
            console.error('Error parsing pinLoggedInUser:', e);
          }
        }
      }

      if (!merchantId) {
        try {
          const user = await base44.auth.me();
          merchantId = user.merchant_id;
        } catch (e) {
          console.error('Error getting authenticated user:', e);
        }
      }

      if (!merchantId || merchantId === 'demo') return; // Exit if still no merchantId or in demo mode

      const tickets = await base44.entities.Order.filter({
        merchant_id: merchantId,
        sent_to_kitchen: true,
        status: { $in: ['pending', 'processing'] }
      }, '-created_date');

      setOpenTickets(tickets);
    } catch (error) {
      // Only log error, don't alert to avoid spam
      console.error('Error loading open tickets:', error);
      setOpenTickets([]);
    } finally {
      loadingTicketsRef.current = false;
    }
  };

  const handleBarcodeScanned = async (barcode) => {
    console.log('POS: handleBarcodeScanned called with:', barcode);
    
    try {
      let processedBarcode = barcode.trim();
      if (settings?.hardware?.barcodeScanner?.prefix) {
        processedBarcode = processedBarcode.replace(settings.hardware.barcodeScanner.prefix, '');
      }

      console.log('POS: Processing barcode:', processedBarcode);
      console.log('POS: Available products:', products.length);
      
      // Log all product barcodes for debugging
      console.log('POS: Product barcodes in system:', products.map(p => ({
        name: p.name,
        sku: p.sku,
        barcode: p.barcode
      })));

      // Search for product with more flexible matching
      const product = products.find(p => {
        const matches = 
          p.sku?.trim() === processedBarcode ||
          p.barcode?.trim() === processedBarcode ||
          p.sku?.trim().toLowerCase() === processedBarcode.toLowerCase() ||
          p.barcode?.trim().toLowerCase() === processedBarcode.toLowerCase();
        
        if (matches) {
          console.log('POS: Match found:', p.name, 'SKU:', p.sku, 'Barcode:', p.barcode);
        }
        return matches;
      });

      if (product && product.is_active) {
        console.log('POS: Product found and active:', product.name);
        
        // Play success beep
        if (settings?.hardware?.barcodeScanner?.playBeep) {
          try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt59NEAxQp+PwtjGcUf8fyxHksBSR3x/DdkiAChRevO3rrFUUBkaP5PbdoHBmGF0fPTguAyN5wu/hkEURD1as5PCvZtByaN1ffJfeSHP4JAAAEBAEAAQA==');
            audio.play().catch(() => {});
          } catch (e) {
            console.log('Audio play failed:', e);
          }
        }

        // Add to cart
        console.log('POS: Adding to cart...');
        addToCart(product, []);
        
        // Switch to products view
        setPosProductView('products');
        setIsCameraScannerOpen(false);
        
        // Visual feedback
        setScannerActive(true);
        setTimeout(() => setScannerActive(false), 500);
        
        console.log('POS: Product added successfully');
      } else {
        console.log('POS: Product not found for barcode:', processedBarcode);
        
        // Play error beep
        if (settings?.hardware?.barcodeScanner?.playBeep) {
          try {
            const audio = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');
            audio.play().catch(() => {});
          } catch (e) {
            console.log('Audio play failed:', e);
          }
        }
        
        // Open quick create modal
        console.log('POS: Opening QuickCreateModal with barcode:', processedBarcode);
        setProductNotFoundDialog({
          isOpen: true,
          barcode: processedBarcode
        });
      }
    } catch (error) {
      console.error('POS: Error in handleBarcodeScanned:', error);
      alert(`Barcode scan error: ${error.message}`);
    }
  };

  const addToCart = (product, modifiers = []) => {
    try {
      console.log('POS: addToCart called with:', product.name);
      
      setCart(currentCart => {
        console.log('POS: Current cart length:', currentCart.length);
        
        // For open items, always add as a new line item (don't try to combine)
        if (product.is_open_item) {
          const newCart = [...currentCart];
          newCart.push({
            ...product,
            quantity: product.quantity || 1, // Ensure quantity is set for open items
            itemTotal: product.price * (product.quantity || 1) // Calculate itemTotal for open items
          });
          console.log('POS: Added open item, new cart length:', newCart.length);
          return newCart;
        }

        // For regular products, check if an identical item exists
        const existingItemIndex = currentCart.findIndex(
          item => item.id === product.id &&
          JSON.stringify(item.modifiers) === JSON.stringify(modifiers)
        );

        if (existingItemIndex > -1) {
          const newCart = [...currentCart];
          newCart[existingItemIndex].quantity += 1;
          console.log('POS: Increased quantity, new cart length:', newCart.length);
          return newCart;
        } else {
          const modifierTotal = modifiers.reduce((sum, mod) => sum + (mod?.price_adjustment || 0), 0);
          const newCart = [...currentCart, {
            ...product,
            quantity: 1,
            modifiers,
            modifierTotal,
            itemTotal: (product.price + modifierTotal),
            ebt_eligible: product.ebt_eligible || false,
            age_restricted: product.age_restricted || false,
            minimum_age: product.minimum_age || null
          }];
          console.log('POS: Added new item, new cart length:', newCart.length);
          return newCart;
        }
      });
    } catch (error) {
      console.error('POS: Error in addToCart:', error);
      alert(`Error adding to cart: ${error.message}`);
    }
  };

  const calculateTotals = () => {
    const pricingSettings = settings?.pricing_and_surcharge || {};
    const isDualPricingEnabled = pricingSettings.enable_dual_pricing || false;

    let subtotal = cart.reduce((sum, item) => {
      const itemTotal = item?.itemTotal || item?.price || 0; // Use item.price for open items
      const quantity = item?.quantity || 0;
      return sum + (itemTotal * quantity);
    }, 0);

    // Calculate EBT-eligible total
    let ebtEligibleTotal = cart.reduce((sum, item) => {
      if (item?.ebt_eligible) {
        const itemTotal = item?.itemTotal || item?.price || 0;
        const quantity = item?.quantity || 0;
        return sum + (itemTotal * quantity);
      }
      return sum;
    }, 0);

    const discountAmount = subtotal * (discountPercent / 100);
    const taxableAmount = subtotal - discountAmount;

    // Use merchant's tax rate, or default
    const taxRate = settings?.tax_rate ?? 0.08;
    const taxAmount = taxableAmount * taxRate;

    let surchargeAmount = 0;
    let surchargeLabel = '';

    if (isDualPricingEnabled && settings?.merchant_id !== 'demo') { // Only apply if not in demo mode
      // 1. Apply flat fee
      if (pricingSettings.flat_fee_amount > 0) {
        surchargeAmount += pricingSettings.flat_fee_amount;
      }
      // 2. Apply percentage fee on the subtotal after discount
      let percent = (pricingSettings.cc_surcharge_percent || 0) / 100;

      // Enforce regional caps
      if (pricingSettings.region === 'US' && percent > 0.04) {
        percent = 0.04;
      } else if (pricingSettings.region === 'CA' && percent > 0.024) {
        percent = 0.024;
      }

      surchargeAmount += taxableAmount * percent;

      // Determine label based on region
      if (pricingSettings.region === 'CA') {
        surchargeLabel = 'Credit Card Processing Fee';
      } else { // Default to US/Other
        surchargeLabel = pricingSettings.pricing_mode === 'cash_discount' ? 'Non-Cash Adjustment' : 'Credit Surcharge';
      }
    }

    const cashTotal = taxableAmount + taxAmount;
    const cardTotal = cashTotal + surchargeAmount;

    return {
      subtotal: subtotal.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      taxableAmount: taxableAmount.toFixed(2),
      surchargeAmount: surchargeAmount.toFixed(2),
      surchargeLabel: surchargeAmount > 0 ? surchargeLabel : '',
      cashTotal: cashTotal.toFixed(2),
      cardTotal: cardTotal.toFixed(2),
      ebtEligibleTotal: ebtEligibleTotal.toFixed(2), // Added EBT eligible total
    };
  };

  const updateCartQuantity = (index, quantity) => {
    if (quantity === 0) {
      setCart(cart.filter((_, i) => i !== index));
      return;
    }

    const newCart = [...cart];
    if (newCart[index]) {
      newCart[index].quantity = quantity;
      // For open items, itemTotal is just price * quantity, no modifiers
      if (newCart[index].is_open_item) {
        newCart[index].itemTotal = newCart[index].price;
      } else {
        newCart[index].itemTotal = ((newCart[index]?.price || 0) + (newCart[index]?.modifierTotal || 0));
      }
      setCart(newCart);
    }
  };

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const checkAgeRestrictedItems = () => {
    const restrictedItems = cart.filter(item => item?.age_restricted);
    return restrictedItems;
  };

  const handleCheckout = async () => {
    if (settings?.merchant_id === 'demo') {
      alert('Demo Mode: Checkout is simulated. Order would be processed here.');
      setShowPayment(false);
      setCart([]);
      setSelectedCustomer(null);
      setDiscountPercent(0);
      setTableNumber("");
      setCurrentOrderId(null);
      setOrder(null);
      setAgeVerificationData(null);
      setPosProductView('departments');
      setSelectedDepartment('all');
      return;
    }

    // Check for age-restricted items
    const restrictedItems = checkAgeRestrictedItems();

    // Only open age verification if there are restricted items AND age verification is enabled in settings
    if (restrictedItems.length > 0 && settings?.age_verification?.enabled !== false) {
      const maxAge = Math.max(...restrictedItems.map(item => item.minimum_age || 21));
      setIsAgeVerificationOpen(true);
      return;
    }

    // Show payment choice dialog
    setShowPaymentChoice(true);
    setWaitingForCustomer(false);
    setCustomerSelectedMethod(null);
  };

  const handleAgeVerified = (verificationData) => {
    setAgeVerificationData(verificationData);
    setIsAgeVerificationOpen(false);
    
    // After age verification, show payment choice
    setShowPaymentChoice(true);
    setWaitingForCustomer(false);
    setCustomerSelectedMethod(null);
  };

  const handleCashPayment = () => {
    // Close choice dialog and open cash payment modal directly
    setShowPaymentChoice(false);
    setShowPayment(true);
  };

  const handleEbtPayment = () => {
    // Close choice dialog and open payment modal with EBT pre-selected
    setShowPaymentChoice(false);
    setShowPayment(true);
    // Set a flag so PaymentModal knows to show EBT
    window.posShowEbtPayment = true;
  };

  // Set up callback for EBT payment from dialog
  useEffect(() => {
    window.posEbtPaymentCallback = handleEbtPayment;
    return () => {
      delete window.posEbtPaymentCallback;
    };
  }, []);

  const handleCustomerTerminal = async () => {
    try {
      console.log('POS: Starting customer terminal flow with order:', currentOrderId);
      
      if (!currentOrderId) {
        alert('No order found. Please add items to cart first.');
        return;
      }

      // Check if cart has tippable items
      const hasTippableItems = cart.some(item => item.tippable !== false);
      
      // Update order to move to customer display
      const updateData = {
        // If there are tippable items, status should be 'approval' to allow tip selection.
        // If not, it goes straight to 'ready_for_payment'.
        status: hasTippableItems ? 'approval' : 'ready_for_payment',
        sent_to_customer_display: false // Will be picked up by customer display
      };

      console.log('POS: Updating order for customer terminal:', updateData);
      await base44.entities.Order.update(currentOrderId, updateData);
      
      // Show waiting state
      setShowPaymentChoice(true);
      setWaitingForCustomer(true);
      
      console.log('POS: Order sent to customer display');
    } catch (error) {
      console.error('Error connecting to customer display or updating order status:', error);
      alert('Error connecting to customer display. Please try again.');
    }
  };

  const startInteractivePaymentFlow = async () => {
    if (settings?.merchant_id === 'demo') {
      alert('Demo Mode: Interactive payment flow not available.');
      return;
    }
    if (!currentOrderId || cart.length === 0) {
      alert("Cannot proceed to payment with an empty cart. Please add items or ensure an order preview exists.");
      return;
    }
    try {
      // This is the "handshake" that starts the customer-facing flow
      await base44.entities.Order.update(currentOrderId, { status: 'ready_for_payment' });
      // The POS will now wait for the customer to choose a payment method.
      // If they choose 'card', the status will eventually become 'payment_in_progress'
      // which will trigger the useEffect to open the payment modal.
      setShowPayment(false); // Close the modal after initiating
    } catch (error) {
      console.error("Error starting payment flow:", error);
      alert("Could not connect to customer display or update order. Please try again.");
    }
  };

  const processOrder = async (paymentData) => {
    if (settings?.merchant_id === 'demo') {
      alert('Demo Mode: Order would be processed here');
      setCart([]);
      setSelectedCustomer(null);
      setDiscountPercent(0);
      setShowPayment(false);
      setCurrentOrderId(null);
      setOrder(null);
      setAgeVerificationData(null);
      setPosProductView('departments');
      setSelectedDepartment('all');
      setShowPaymentChoice(false);
      setWaitingForCustomer(false);
      setCustomerSelectedMethod(null);
      return;
    }
    try {
      const totals = calculateTotals();
      const orderNumber = `POS-${Date.now()}`;

      let merchantId = settings?.merchant_id;
      if (!merchantId) {
        const pinUserJSON = localStorage.getItem('pinLoggedInUser');
        if (pinUserJSON) {
          try {
            const pinUser = JSON.parse(pinUserJSON);
            merchantId = pinUser.merchant_id;
          } catch (e) {
            console.error('Error parsing pinLoggedInUser:', e);
          }
        }
      }

      if (!merchantId) {
        try {
          const userAuthData = await base44.auth.me();
          merchantId = userAuthData.merchant_id;
        } catch (e) {
          console.error('Error getting authenticated user:', e);
        }
      }

      if (!merchantId) {
        throw new Error("Merchant ID not found. Cannot process order.");
      }

      const orderData = {
        merchant_id: merchantId,
        order_number: orderNumber,
        station_id: stationId,
        station_name: stationName,
        customer_id: selectedCustomer?.id,
        customer_name: selectedCustomer?.name || "Walk-in Customer",
        items: cart.map(item => ({
          product_id: item?.id,
          product_name: item?.name,
          quantity: item?.quantity || 0,
          unit_price: item?.is_open_item ? item.price : (item?.price || 0), // Use item.price for open items
          modifiers: item?.modifiers || [],
          item_total: (item?.itemTotal || 0) * (item?.quantity || 0),
          is_open_item: item?.is_open_item || false, // Persist open item status
          ebt_eligible: item?.ebt_eligible || false, // Persist EBT eligibility
          age_restricted: item?.age_restricted || false, // Persist age restriction
          minimum_age: item?.minimum_age || null // Persist minimum age
        })),
        subtotal: parseFloat(totals.subtotal),
        tax_amount: parseFloat(totals.taxAmount),
        discount_amount: parseFloat(totals.discountAmount),
        surcharge_amount: parseFloat(totals.surchargeAmount),
        surcharge_label: totals.surchargeLabel,
        tip_amount: paymentData?.tipAmount || 0,
        // The total amount for the order from all payment methods combined
        total: paymentData?.total || 0, // This should be the true total paid from the modal
        ebt_amount: paymentData?.ebtAmount || 0, // Amount paid with EBT
        ebt_eligible_total: parseFloat(totals.ebtEligibleTotal), // Total items eligible for EBT
        payment_method: paymentData?.method || 'cash',
        payment_details: paymentData?.details || {}, // Store additional payment details (e.g., change due, card info)
        status: "completed", // Mark as completed immediately
        pos_mode: posMode,
        table_number: tableNumber || null,
        location: posMode === "food_truck" ? "Mobile Location" : "Main Store",
        sent_to_customer_display: true,
        sent_to_kitchen: isKitchenDisplayEnabled // Only send to kitchen if enabled
      };

      // Add cash payment details if applicable
      if (paymentData?.method === 'cash' && paymentData?.change > 0) {
        orderData.payment_details = {
          ...orderData.payment_details,
          cash_received: paymentData.cashReceived,
          change_due: paymentData.change
        };
      }

      // Add age verification data if applicable
      if (ageVerificationData) {
        const pinUserJSON = localStorage.getItem('pinLoggedInUser');
        let verifiedByUser = { id: 'unknown', full_name: 'Unknown Cashier' };
        if (pinUserJSON) {
          try {
            verifiedByUser = JSON.parse(pinUserJSON);
          } catch (e) {
            console.error('Error parsing user from localStorage for age verification:', e);
          }
        }

        orderData.age_verification = {
          ...ageVerificationData,
          verified_by_user_id: verifiedByUser.id,
          verified_by_user_name: verifiedByUser.full_name,
          verified_at: new Date().toISOString()
        };
      }


      // If there's an existing order (from preview or ticket), update it. Otherwise, create.
      let finalOrder;
      // THE FIX: Ensure we use the correct ID from the `order` object.
      // If `order` object is loaded from a ticket or preview, its `id` is the `currentOrderId`.
      // If `currentOrderId` is set and `order` is null, it means it's a new order that has a preview in the DB.
      if (order?.id) { // Prefer the full order object if available
        finalOrder = await base44.entities.Order.update(order.id, orderData);
      } else if (currentOrderId) { // Fallback to currentOrderId if order object is not fully populated (e.g. from preview creation)
        finalOrder = await base44.entities.Order.update(currentOrderId, orderData);
      } else {
        finalOrder = await base44.entities.Order.create(orderData);
      }

      // If the original order was from an open ticket, we mark it as completed
      if (order?.source === 'open_ticket' && order?.id) {
        await base44.entities.Order.update(order.id, { status: 'completed' });
      }

      if (selectedCustomer) {
        const pointsEarned = Math.floor(parseFloat(totals.cardTotal) / 10);
        await base44.entities.Customer.update(selectedCustomer.id, {
          loyalty_points: (selectedCustomer?.loyalty_points || 0) + pointsEarned,
          total_spent: (selectedCustomer?.total_spent || 0) + parseFloat(totals.cardTotal),
          visit_count: (selectedCustomer?.visit_count || 0) + 1
        });
      }

      // Clear cart and reset state
      setCart([]);
      setSelectedCustomer(null);
      setDiscountPercent(0);
      setTableNumber("");
      setShowPayment(false);
      setCurrentOrderId(null);
      setOrder(null); // Explicitly clear the full order object
      setAgeVerificationData(null); // Clear age verification data after order completion
      setPosProductView('departments'); // Go back to departments after processing order
      setSelectedDepartment('all');
      setShowPaymentChoice(false);
      setWaitingForCustomer(false);
      setCustomerSelectedMethod(null);

      let successMessage = `Order ${orderData.order_number} processed successfully!\n✓ Payment received`;
      if (isKitchenDisplayEnabled) {
        successMessage += `\n✓ Sent to kitchen`;
      }


      if (paymentData?.method === 'ebt') {
        successMessage += `\n✓ EBT Payment: $${(paymentData.ebtAmount || 0).toFixed(2)}`;
        if ((paymentData.otherAmount || 0) > 0) {
          successMessage += `\n✓ Other Payment: $${(paymentData.otherAmount || 0).toFixed(2)}`;
        }
      }

      if ((paymentData?.change || 0) > 0) {
        successMessage += `\n\nChange due: $${(paymentData.change || 0).toFixed(2)}`;
      }

      alert(successMessage);

      if (viewMode === 'open_tickets') {
        loadOpenTickets();
      }
    } catch (error) {
      console.error("Error processing order:", error);
      alert(`Error processing order: ${error.message}`);
    }
  };

  const sendToKitchen = async () => {
    if (settings?.merchant_id === 'demo') {
      alert('Demo Mode: Order would be sent to kitchen here.');
      setCart([]);
      setSelectedCustomer(null);
      setDiscountPercent(0);
      setCurrentOrderId(null);
      setOrder(null);
      setPosProductView('departments');
      setSelectedDepartment('all');
      return;
    }
    try {
      if (cart.length === 0) {
        alert('Cannot send empty order to kitchen');
        return;
      }
      if (!isKitchenDisplayEnabled) {
        alert('Kitchen display is not enabled in settings.');
        return;
      }

      const totals = calculateTotals();
      const orderNumber = tableNumber
        ? `TABLE-${tableNumber}-${Date.now()}`
        : `ORDER-${Date.now()}`;

      let merchantId = settings?.merchant_id;
      if (!merchantId) {
        const pinUserJSON = localStorage.getItem('pinLoggedInUser');
        if (pinUserJSON) {
          try {
            const pinUser = JSON.parse(pinUserJSON);
            merchantId = pinUser.merchant_id;
          } catch (e) {
            console.error('Error parsing pinLoggedInUser:', e);
          }
        }
      }

      if (!merchantId) {
        try {
          const userAuthData = await base44.auth.me();
          merchantId = userAuthData.merchant_id;
        } catch (e) {
          console.error('Error getting authenticated user:', e);
        }
      }

      if (!merchantId) {
        throw new Error("Merchant ID not found. Cannot send to kitchen.");
      }

      const orderData = {
        merchant_id: merchantId,
        order_number: orderNumber,
        station_id: stationId,
        station_name: stationName,
        customer_id: selectedCustomer?.id,
        customer_name: selectedCustomer?.name || "Walk-in Customer",
        items: cart.map(item => ({
          product_id: item?.id,
          product_name: item?.name,
          quantity: item?.quantity || 0,
          unit_price: item?.is_open_item ? item.price : (item?.price || 0), // Use item.price for open items
          modifiers: item?.modifiers || [],
          item_total: (item?.itemTotal || 0) * (item?.quantity || 0),
          is_open_item: item?.is_open_item || false,
          ebt_eligible: item?.ebt_eligible || false, // Persist EBT eligibility
          age_restricted: item?.age_restricted || false, // Persist age restriction
          minimum_age: item?.minimum_age || null // Persist minimum age
        })),
        subtotal: parseFloat(totals.subtotal),
        tax_amount: parseFloat(totals.taxAmount),
        discount_amount: parseFloat(totals.discountAmount),
        tip_amount: 0,
        total: parseFloat(totals.cardTotal), // When sending to kitchen, typically the card total is what's being 'held'
        payment_method: "pending",
        status: "pending",
        pos_mode: posMode,
        table_number: tableNumber || null,
        location: posMode === "food_truck" ? "Mobile Location" : "Main Store",
        sent_to_customer_display: false,
        sent_to_kitchen: true
      };

      if (currentOrderId) {
        await base44.entities.Order.update(currentOrderId, orderData);
      } else {
        await base44.entities.Order.create(orderData);
      }

      setCart([]);
      setSelectedCustomer(null);
      setDiscountPercent(0);
      setCurrentOrderId(null);
      setOrder(null); // Clear the order state
      setPosProductView('departments'); // Go back to departments after sending to kitchen
      setSelectedDepartment('all');


      alert(tableNumber ? `Order sent to kitchen for Table ${tableNumber}` : 'Order sent to kitchen');

      await loadOpenTickets();
    } catch (error) {
      console.error("Error sending to kitchen:", error);
      alert(`Error sending to kitchen: ${error.message}`);
    }
  };

  const acceptOnlineOrder = async (onlineOrder) => {
    if (settings?.merchant_id === 'demo') {
      alert(`Demo Mode: Online order ${onlineOrder.order_number} accepted (simulated).`);
      await loadPendingOnlineOrders(); // Simulate reload
      await loadOpenTickets(); // Simulate reload
      return;
    }
    try {
      await base44.entities.OnlineOrder.update(onlineOrder.id, {
        status: 'confirmed'
      });

      let merchantId = settings?.merchant_id;
      if (!merchantId) {
        const pinUserJSON = localStorage.getItem('pinLoggedInUser');
        if (pinUserJSON) {
          const pinUser = JSON.parse(pinUserJSON);
          merchantId = pinUser.merchant_id;
        }
      }

      if (!merchantId) {
        const user = await base44.auth.me();
        merchantId = user.merchant_id;
      }

      const orderData = {
        merchant_id: merchantId,
        order_number: onlineOrder.order_number,
        station_id: stationId,
        station_name: 'Online',
        customer_id: null,
        customer_name: onlineOrder.customer_name,
        items: onlineOrder.items.map(item => ({
          ...item,
          ebt_eligible: item.ebt_eligible || false,
          age_restricted: item.age_restricted || false,
          minimum_age: item.minimum_age || null
        })),
        subtotal: onlineOrder.subtotal,
        tax_amount: onlineOrder.tax_amount,
        discount_amount: onlineOrder.discount_amount || 0,
        tip_amount: onlineOrder.tip_amount || 0,
        total: onlineOrder.total,
        ebt_amount: onlineOrder.ebt_amount || 0,
        ebt_eligible_total: onlineOrder.ebt_eligible_total || 0,
        payment_method: onlineOrder.payment_method || "online",
        payment_details: onlineOrder.payment_details || {},
        status: "pending",
        pos_mode: "quick_service",
        table_number: null,
        location: "Online Order",
        sent_to_customer_display: false,
        sent_to_kitchen: isKitchenDisplayEnabled, // Only send to kitchen if enabled
        online_order_id: onlineOrder.id,
        fulfillment_type: onlineOrder.fulfillment_type,
        delivery_address: onlineOrder.delivery_address,
        special_instructions: onlineOrder.special_instructions,
        requested_time: onlineOrder.requested_time
      };

      await base44.entities.Order.create(orderData);

      alert(`Online order ${onlineOrder.order_number} accepted and sent to kitchen!`);

      await loadPendingOnlineOrders();
      await loadOpenTickets();
    } catch (error) {
      console.error('Error accepting online order:', error);
      alert(`Error accepting order: ${error.message}`);
    }
  };

  const rejectOnlineOrder = async (onlineOrder, reason) => {
    if (settings?.merchant_id === 'demo') {
      alert(`Demo Mode: Online order ${onlineOrder.order_number} rejected (simulated).`);
      await loadPendingOnlineOrders(); // Simulate reload
      return;
    }
    try {
      await base44.entities.OnlineOrder.update(onlineOrder.id, {
        status: 'cancelled',
        cancellation_reason: reason || 'Rejected by merchant'
      });

      alert(`Online order ${onlineOrder.order_number} rejected`);

      await loadPendingOnlineOrders();
    } catch (error) {
      console.error('Error rejecting online order:', error);
      alert(`Error rejecting order: ${error.message}`);
    }
  };

  const processTicketPayment = (ticket) => {
    if (settings?.merchant_id === 'demo') {
      alert('Demo Mode: Processing ticket payment (simulated).');
      setCart([]);
      setSelectedCustomer(null);
      setDiscountPercent(0);
      setTableNumber("");
      setCurrentOrderId(null);
      setOrder(null);
      setPosProductView('departments');
      setSelectedDepartment('all');
      return;
    }
    setCart(ticket.items.map(item => ({
      id: item.product_id,
      name: item.product_name,
      price: item.unit_price,
      quantity: item.quantity,
      modifiers: item.modifiers || [],
      modifierTotal: (item.modifiers || []).reduce((sum, mod) => sum + (mod?.price_adjustment || 0), 0),
      itemTotal: item.unit_price + (item.modifiers || []).reduce((sum, mod) => sum + (mod?.price_adjustment || 0), 0),
      is_open_item: item.is_open_item || false, // Preserve open item status from ticket
      ebt_eligible: item.ebt_eligible || false, // Preserve EBT eligibility
      age_restricted: item.age_restricted || false, // Preserve age restriction
      minimum_age: item.minimum_age || null // Preserve minimum age
    })));

    setTableNumber(ticket.table_number || '');
    setDiscountPercent(ticket.subtotal > 0 ? (ticket.discount_amount / ticket.subtotal) * 100 : 0);
    setCurrentOrderId(ticket.id); // Set the current order ID to the ticket ID
    setOrder(ticket); // Load the entire ticket object into `order` state
    setSelectedCustomer(ticket.customer_id ? { id: ticket.customer_id, name: ticket.customer_name } : null);
    setViewMode('pos');
    // setShowPayment(true); // Don't show payment modal immediately, let the interactive flow handle it
    setPosProductView('departments'); // Ensure starting with departments when loading a ticket
    setSelectedDepartment('all');
  };

  const handleCreateProduct = async (productData) => {
    if (settings?.merchant_id === 'demo') {
      console.log('Demo Mode: Simulating product creation');
      alert('Demo Mode: Product creation simulated');
      addToCart({
        id: `DEMO-${Date.now()}`,
        name: productData.name,
        price: productData.price,
        is_active: true,
        ebt_eligible: productData.ebt_eligible || false,
        age_restricted: productData.age_restricted || false,
        minimum_age: productData.minimum_age || 21,
        department: productData.department || 'all'
      }, []);
      setProductNotFoundDialog({ isOpen: false, barcode: '' });
      return;
    }
    
    try {
      console.log('POS: Creating new product:', productData);
      const newProduct = await base44.entities.Product.create(productData);
      console.log('POS: Product created:', newProduct);

      // Reload products list
      const productList = await base44.entities.Product.list();
      setProducts(productList.filter(p => p.is_active));
      console.log('POS: Product list reloaded');

      // Automatically add the new product to cart
      addToCart(newProduct, []);
      
      setPosProductView('products');
      setSelectedDepartment(newProduct.department || 'all');

      // Visual feedback
      setScannerActive(true);
      setTimeout(() => setScannerActive(false), 500);
      setProductNotFoundDialog({ isOpen: false, barcode: '' });
      
      // Show success feedback
      if (settings?.hardware?.barcodeScanner?.playBeep) {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt19NEAxQp+PwtjGcUf8fyxHksBSR3x/DdkiAChRevO3rrFUUBkaP5PbdoHBmGF0fPTguAyN5wu/hkEURD1as5PCvZtByaN1ffJfeSHP4JAAAEBAEAAQA==');
        audio.play().catch(() => {});
      }

      console.log('POS: Product created and added to cart successfully');
    } catch (error) {
      console.error('POS: Error creating product:', error);
      alert('Error creating product: ' + error.message);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!products || !Array.isArray(products)) return [];
    return products.filter(product => {
      if (!product) return false;
      const matchesSearch = (product.name || '').toLowerCase().includes((searchTerm || '').toLowerCase());
      const matchesDepartment = selectedDepartment === "all" || product.department === selectedDepartment;
      const matchesPosMode = !product.pos_mode || product.pos_mode.includes(posMode);
      return matchesSearch && matchesDepartment && matchesPosMode;
    });
  }, [products, selectedDepartment, searchTerm, posMode]);

  // categories useMemo removed as we are now using departments
  const isCameraScannerEnabled = settings?.hardware?.barcodeScanner?.enabled && settings.hardware.barcodeScanner.type === 'camera';

  const handleSelectDepartment = (deptName) => {
    setSelectedDepartment(deptName);
    setPosProductView('products');
  };

  const handleBackToDepartments = () => {
    setSelectedDepartment('all');
    setPosProductView('departments');
    setSearchTerm('');
  };

  const openCustomerDisplay = () => {
    if (!settings?.merchant_id || !stationId) {
      alert('Cannot open customer display: missing merchant or station information');
      return;
    }
    
    // Create full URL with merchant and station parameters
    const baseUrl = window.location.origin;
    const cdPath = createPageUrl('CustomerDisplay');
    const fullUrl = `${baseUrl}${cdPath}?merchant_id=${settings.merchant_id}&station_id=${stationId}`;
    
    console.log('Opening Customer Display:', fullUrl);
    
    window.open(fullUrl, '_blank', 'width=1024,height=768,menubar=no,toolbar=no,location=no,status=no');
  };

  const openKitchenDisplay = () => {
    if (!settings?.merchant_id) {
      alert('Cannot open kitchen display: missing merchant information');
      return;
    }
    
    // Create full URL with merchant parameter
    const baseUrl = window.location.origin;
    const kdPath = createPageUrl('KitchenDisplay');
    const fullUrl = `${baseUrl}${kdPath}?merchant_id=${settings.merchant_id}`;
    
    console.log('Opening Kitchen Display:', fullUrl);
    
    window.open(fullUrl, '_blank', 'width=1280,height=1024,menubar=no,toolbar=no,location=no,status=no');
  };

  const handleClockOut = () => {
    if (confirm('Are you sure you want to clock out?')) {
      // Just clear PIN user, keep merchant context
      localStorage.removeItem('pinLoggedInUser');
      window.location.href = createPageUrl('PinLogin');
    }
  };

  // IMPROVED LOADING SCREEN
  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-blue-200 mx-auto animate-pulse"></div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Loading POS System</h2>
          <p className="text-gray-500 dark:text-gray-400">Please wait while we set up your terminal...</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  // ERROR STATE - if critical data failed to load
  if (initError) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900 dark:to-red-800">
        <div className="text-center max-w-md p-8">
          <AlertCircle className="w-20 h-20 text-red-600 dark:text-red-400 mx-auto mb-4" />
          <h2 className="2xl font-bold text-gray-900 dark:text-white mb-2">Initialization Error</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {initError}
          </p>
          <div className="space-y-2">
            <Button
              onClick={() => window.location.reload()}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              Retry
            </Button>
            {/* Removed the Logout button for preview mode */}
          </div>
        </div>
      </div>
    );
  }

  if (!settings || !stationId) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900 dark:to-red-800">
        <div className="text-center max-w-md p-8">
          <AlertCircle className="w-20 h-20 text-red-600 dark:text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Setup Required</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Your POS terminal needs to be configured. Please log in through the PIN Login page.
          </p>
          <Button
            onClick={() => window.location.href = createPageUrl('PinLogin')}
            className="w-full"
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  // Simplified viewMode for demo
  if (viewMode === 'online_orders') {
    if (settings?.merchant_id === 'demo') {
      return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 md:p-4 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Globe className="w-6 h-6 text-green-600" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pending Online Orders (Demo)</h1>
                <Badge variant="outline">0 orders</Badge>
              </div>
              <Button onClick={() => setViewMode('pos')} variant="outline">
                Back to POS
              </Button>
            </div>
          </div>
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-xl text-gray-500">No pending online orders in Demo Mode.</p>
          </div>
        </div>
      );
    }
    return (
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 md:p-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Globe className="w-6 h-6 text-green-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pending Online Orders</h1>
              <Badge variant="outline">{pendingOnlineOrders.length} orders</Badge>
            </div>
            <Button onClick={() => setViewMode('pos')} variant="outline">
              Back to POS
            </Button>
          </div>
        </div>

        <div className="p-4 md:p-6">
          {pendingOnlineOrders.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-xl text-gray-500">No pending online orders</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingOnlineOrders.map((order) => (
                <Card key={order.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold">{order.order_number}</h3>
                      <p className="text-sm text-gray-600 mt-1">{order.customer_name}</p>
                      <p className="text-sm text-gray-500">{order.customer_phone}</p>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800">
                      {order.fulfillment_type}
                    </Badge>
                  </div>

                  {order.delivery_address && (
                    <div className="mb-3 p-2 bg-gray-50 rounded text-sm">
                      <p className="font-medium">Delivery Address:</p>
                      <p className="text-gray-600">{order.delivery_address}</p>
                    </div>
                  )}

                  {order.requested_time && (
                    <div className="mb-3 text-sm">
                      <p className="font-medium">Requested Time:</p>
                      <p className="text-gray-600">{new Date(order.requested_time).toLocaleString()}</p>
                    </div>
                  )}

                  <div className="space-y-2 mb-4">
                    {(order.items || []).map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{item.quantity}x {item.product_name}</span>
                        <span>${item.item_total.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {order.special_instructions && (
                    <div className="mb-4 p-2 bg-yellow-50 rounded text-sm">
                      <p className="font-medium">Special Instructions:</p>
                      <p className="text-gray-700">{order.special_instructions}</p>
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <div className="flex justify-between font-bold text-lg mb-4">
                      <span>Total:</span>
                      <span>${order.total.toFixed(2)}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        onClick={() => {
                          const reason = prompt('Reason for rejection (optional):');
                          if (reason !== null) {
                            rejectOnlineOrder(order, reason);
                          }
                        }}
                        className="flex-1"
                      >
                        Reject
                      </Button>
                      <Button
                        onClick={() => acceptOnlineOrder(order)}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        Accept Order
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (viewMode === 'open_tickets') {
    if (settings?.merchant_id === 'demo') {
      return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 md:p-4 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <CreditCard className="w-6 h-6 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Open Tickets (Demo)</h1>
                <Badge variant="outline">0 tickets</Badge>
              </div>
              <Button onClick={() => setViewMode('pos')} variant="outline">
                Back to POS
              </Button>
            </div>
          </div>
          <div className="text-center py-12">
            <p className="text-xl text-gray-500">No open tickets in Demo Mode.</p>
          </div>
        </div>
      );
    }
    return (
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 md:p-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CreditCard className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Open Tickets</h1>
              <Badge variant="outline">{openTickets.length} tickets</Badge>
            </div>
            <Button onClick={() => setViewMode('pos')} variant="outline">
              Back to POS
            </Button>
          </div>
        </div>

        <div className="p-4 md:p-6">
          {openTickets.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xl text-gray-500">No open tickets</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {openTickets.map((ticket) => (
                <Card key={ticket.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold">{ticket.table_number ? `Table ${ticket.table_number}` : 'No Table'}</h3>
                      <p className="text-sm text-gray-500">{ticket.order_number}</p>
                      <p className="text-sm text-gray-600 mt-1">{ticket.customer_name}</p>
                    </div>
                    <Badge className={
                      ticket.status === 'processing' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                    }>
                      {ticket.status}
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-4">
                    {(ticket.items || []).map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{item.quantity}x {item.product_name}</span>
                        <span>${(item.item_total || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between font-bold text-lg mb-4">
                      <span>Total:</span>
                      <span>${(ticket.total || 0).toFixed(2)}</span>
                    </div>
                    <Button
                      onClick={() => processTicketPayment(ticket)}
                      className="w-full"
                    >
                      Process Payment
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 md:p-4 sticky top-0 z-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
          <div className="flex items-center gap-2 md:gap-4">
            <CreditCard className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
            <h1 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">POS</h1>
            <Badge variant="outline" className="text-xs">
              {stationName}
            </Badge>
            <Badge variant="outline" className="px-2 py-1 text-sm">
              {cart.length}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Buttons */}
            <Button
              variant={viewMode === 'pos' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('pos')}
              className="flex-1 sm:flex-none"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              POS
            </Button>

            {/* Only show open tickets button if kitchen display is enabled */}
            {isKitchenDisplayEnabled && (
              <Button
                variant={viewMode === 'open_tickets' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setViewMode('open_tickets');
                  loadOpenTickets();
                }}
                className="flex-1 sm:flex-none relative"
              >
                <Monitor className="w-4 h-4 mr-2" />
                Tickets
                {openTickets.length > 0 && (
                  <Badge className="ml-2 bg-red-500">{openTickets.length}</Badge>
                )}
              </Button>
            )}

            <Button
              variant={viewMode === 'online_orders' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setViewMode('online_orders');
                loadPendingOnlineOrders();
              }}
              className="flex-1 sm:flex-none relative"
            >
              <Globe className="w-4 h-4 mr-2" />
              Online
              {pendingOnlineOrders.length > 0 && (
                <Badge className="ml-2 bg-orange-500">{pendingOnlineOrders.length}</Badge>
              )}
            </Button>

            {/* Customer Display and Kitchen Display Links */}
            <Button
              variant="outline"
              size="sm"
              onClick={openCustomerDisplay}
              title="Customer Display"
              className="flex-1 sm:flex-none"
            >
              <MonitorPlay className="w-4 h-4 mr-2" />
              CD
            </Button>

            {/* Only show Kitchen Display link if enabled */}
            {isKitchenDisplayEnabled && (
              <Button
                variant="outline"
                size="sm"
                onClick={openKitchenDisplay}
                title="Kitchen Display"
                className="flex-1 sm:flex-none"
              >
                <Monitor className="w-4 h-4 mr-2" />
                KD
              </Button>
            )}

            {/* Additional POS Features */}
            {viewMode === 'pos' && (
              <>
                {/* Department/Products View Toggle */}
                {posProductView === 'products' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBackToDepartments}
                  >
                    ← Departments
                  </Button>
                )}

                {/* Customer Selector */}
                <CustomerSelector
                  customers={customers}
                  selectedCustomer={selectedCustomer}
                  onSelectCustomer={setSelectedCustomer}
                />

                {/* Table Number (for restaurant mode) */}
                {posMode === "restaurant" && (
                  <Input
                    placeholder="Table #"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="w-24"
                  />
                )}

                {/* Open Item Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOpenItemDialogOpen(true)}
                  title="Add Open Item"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Open Item
                </Button>

                {/* Camera Scanner Button */}
                {isCameraScannerEnabled && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCameraScannerOpen(true)}
                    title="Scan Barcode"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Scan
                  </Button>
                )}

                {/* Send to Kitchen Button (restaurant mode) - Only show if kitchen display is enabled */}
                {posMode === "restaurant" && cart.length > 0 && isKitchenDisplayEnabled && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={sendToKitchen}
                    className="bg-orange-500 text-white hover:bg-orange-600"
                  >
                    <Monitor className="w-4 h-4 mr-2" />
                    Send to Kitchen
                  </Button>
                )}
              </>
            )}

            {/* System Menu Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>System</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => window.location.href = createPageUrl('SystemMenu')}>
                  <Menu className="w-4 h-4 mr-2" />
                  System Menu
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.location.href = createPageUrl('Settings')}>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleClockOut} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Clock Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {isMobile ? (
        <div className="flex flex-col h-[calc(100vh-64px)]">
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 max-h-[50vh] overflow-auto">
            <Cart
              cart={cart}
              onUpdateQuantity={updateCartQuantity}
              onRemoveItem={removeFromCart}
              discountPercent={discountPercent}
              onDiscountChange={setDiscountPercent}
              totals={calculateTotals()}
              onCheckout={handleCheckout}
              onSendToKitchen={posMode === "restaurant" && isKitchenDisplayEnabled ? sendToKitchen : null}
              selectedCustomer={selectedCustomer}
              isMobile={isMobile}
              settings={settings}
            />
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {posProductView === 'departments' ? (
              <DepartmentGrid
                departments={departments}
                onSelectDepartment={(dept) => {
                  setSelectedDepartment(dept);
                  setPosProductView('products');
                }}
              />
            ) : (
              <ProductGrid
                products={filteredProducts}
                onAddToCart={addToCart}
                onProductClick={addToCart} // Assuming a click adds to cart
                posMode={posMode}
                isMobile={isMobile}
                showImages={false}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="flex h-[calc(100vh-64px)]">
          <div className="w-96 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
            <Cart
              cart={cart}
              onUpdateQuantity={updateCartQuantity}
              onRemoveItem={removeFromCart}
              discountPercent={discountPercent}
              onDiscountChange={setDiscountPercent}
              totals={calculateTotals()}
              onCheckout={handleCheckout}
              onSendToKitchen={posMode === "restaurant" && isKitchenDisplayEnabled ? sendToKitchen : null}
              selectedCustomer={selectedCustomer}
              isMobile={isMobile}
              settings={settings}
            />
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-y-auto p-4"> {/* Added flex-col here to make DepartmentGrid and ProductGrid stack vertically if needed, and overflow-y-auto for the content */}
              {posProductView === 'departments' ? (
                <DepartmentGrid
                  departments={departments}
                  onSelectDepartment={(dept) => {
                    setSelectedDepartment(dept);
                    setPosProductView('products');
                  }}
                />
              ) : (
                <ProductGrid
                  products={filteredProducts}
                  onAddToCart={addToCart}
                  onProductClick={addToCart} // Assuming a click adds to cart
                  posMode={posMode}
                  isMobile={isMobile}
                  showImages={false}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dialogs - make sure these are at the end */}
      {isCameraScannerEnabled && (
        <CameraScanner
          isOpen={isCameraScannerOpen}
          onClose={() => setIsCameraScannerOpen(false)}
          onScan={handleBarcodeScanned}
        />
      )}

      {/* Quick Create Modal for barcode scanning */}
      <QuickCreateModal
        isOpen={productNotFoundDialog.isOpen}
        onClose={() => {
          console.log('POS: Closing QuickCreateModal');
          setProductNotFoundDialog({ isOpen: false, barcode: '' });
        }}
        barcode={productNotFoundDialog.barcode}
        onCreateProduct={handleCreateProduct}
        merchantId={settings?.merchant_id}
        departments={departments}
      />

      {showPaymentChoice && (
        <PaymentChoiceDialog
          isOpen={showPaymentChoice}
          onClose={() => {
            setShowPaymentChoice(false);
            setWaitingForCustomer(false);
            setCustomerSelectedMethod(null);
          }}
          onCashSelected={handleCashPayment}
          onEbtSelected={handleEbtPayment} // Pass the new EBT handler
          onCustomerTerminalSelected={handleCustomerTerminal}
          order={order}
          waitingForCustomer={waitingForCustomer}
          customerSelectedMethod={customerSelectedMethod}
        />
      )}

      {showPayment && (
        <PaymentModal
          isOpen={showPayment}
          onClose={() => setShowPayment(false)}
          totals={calculateTotals()}
          onProcessPayment={processOrder}
          onStartInteractivePayment={settings?.merchant_id !== 'demo' ? startInteractivePaymentFlow : null}
          customer={selectedCustomer}
          settings={settings}
          cart={cart}
          posMode={posMode}
          tableNumber={tableNumber}
          merchantId={settings?.merchant_id}
          stationId={stationId}
          stationName={stationName}
          order={order}
        />
      )}

      {isAgeVerificationOpen && (
        <AgeVerificationDialog
          isOpen={isAgeVerificationOpen}
          onClose={() => {
            setIsAgeVerificationOpen(false);
            setAgeVerificationData(null);
          }}
          onVerify={handleAgeVerified}
          requiredAge={Math.max(...checkAgeRestrictedItems().map(item => item.minimum_age || 21))}
          restrictedItems={checkAgeRestrictedItems()}
          settings={settings}
        />
      )}

      {isOpenItemDialogOpen && (
        <OpenItemDialog
          isOpen={isOpenItemDialogOpen}
          onClose={() => setIsOpenItemDialogOpen(false)}
          onAddItem={addToCart}
        />
      )}
    </div>
  );
}