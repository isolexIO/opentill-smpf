import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import WelcomeScreen from '../components/customer-display/WelcomeScreen';
import TipScreen from '../components/customer-display/TipScreen';
import SolanaPayScreen from '../components/customer-display/SolanaPayScreen';
import TransactionStatusScreen from '../components/customer-display/TransactionStatusScreen';
import ApprovalScreen from '../components/customer-display/ApprovalScreen';
import CardPaymentStatusScreen from '../components/customer-display/CardPaymentStatusScreen';
import PaymentMethodSelectionScreen from '../components/customer-display/PaymentMethodSelectionScreen';
import EBTPaymentScreen from '../components/customer-display/EBTPaymentScreen';

export default function CustomerDisplayPage() {
  const [currentOrder, setCurrentOrder] = useState(null);
  const [merchant, setMerchant] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState(null);
  const [stationId, setStationId] = useState(null); // Added stationId state
  const [stationInfo, setStationInfo] = useState(null);

  useEffect(() => {
    initializeDisplay();
    return () => {
      // Cleanup: disconnect session when component unmounts
      if (sessionId) {
        disconnectSession();
      }
    };
  }, []);

  useEffect(() => {
    if (merchant) {
      console.log('CustomerDisplay: Starting polling with merchant:', merchant.business_name);
      // Start polling for orders
      const interval = setInterval(() => {
        pollForOrder();
      }, 1500); // Poll every 1.5 seconds for better responsiveness

      // The currentOrder as a dependency here will make sure that
      // when currentOrder state changes, the polling interval effectively
      // "restarts" (clears old, sets new) which is useful if the polling
      // logic needs to react immediately to currentOrder state changes.
      return () => clearInterval(interval);
    }
  }, [merchant, currentScreen, currentOrder, stationId]); // Removed lastCheckedOrderId, added currentOrder and stationId

  const initializeDisplay = async () => {
    try {
      setError(null);
      console.log('CustomerDisplay: Initializing...');

      // Get merchant_id from URL params first (public access)
      const urlParams = new URLSearchParams(window.location.search);
      const merchantIdFromUrl = urlParams.get('merchant_id');
      const stationIdFromUrl = urlParams.get('station_id');
      
      console.log('CustomerDisplay: URL params:', { merchantIdFromUrl, stationIdFromUrl });

      let merchantId = merchantIdFromUrl;
      let userId = null;
      
      // If no merchant_id in URL, fall back to user authentication
      if (!merchantId) {
        let user = null;
        const pinUserJSON = localStorage.getItem('pinLoggedInUser');
        
        if (pinUserJSON) {
          try {
            user = JSON.parse(pinUserJSON);
            console.log('CustomerDisplay: Using pinLoggedInUser:', user.email);
          } catch (e) {
            console.error('Error parsing pinLoggedInUser:', e);
          }
        }

        if (!user) {
          try {
            user = await base44.auth.me();
            console.log('CustomerDisplay: Using authenticated user:', user?.email);
          } catch (e) {
            console.error('CustomerDisplay: No authenticated user');
            setError('Please log in to use customer display');
            return;
          }
        }

        if (!user?.merchant_id) {
          setError('No merchant associated with user');
          return;
        }
        
        merchantId = user.merchant_id;
        userId = user.id;
      }

      // Load merchant data via public endpoint (display links may be unauthenticated)
      const merchantResp = await base44.functions.invoke('getPublicMerchant', { merchant_id: merchantId });
      if (!merchantResp.data?.success || !merchantResp.data?.merchant) {
        setError(merchantResp.data?.error || 'Merchant not found. Please check your configuration.');
        return;
      }
      const merchantData = merchantResp.data.merchant;
      console.log('CustomerDisplay: Loaded merchant:', merchantData.business_name);
      setMerchant(merchantData);

      if (stationIdFromUrl) {
        setStationId(stationIdFromUrl);
        console.log('CustomerDisplay: Station ID from URL:', stationIdFromUrl);
        try {
          const stations = await base44.entities.Station.filter({ merchant_id: merchantId, station_id: stationIdFromUrl });
          if (stations && stations.length > 0) setStationInfo(stations[0]);
        } catch (e) {
          console.warn('CustomerDisplay: Could not load station info', e);
        }
      }

      // Register device session
      try {
        const result = await base44.functions.invoke('registerDeviceSession', {
          merchant_id: merchantId,
          device_name: 'Customer Display',
          device_type: 'customer_display',
          station_id: stationIdFromUrl || null,
          station_name: null,
          user_id: userId || null,
          user_name: userId ? 'Customer Display' : null
        });

        if (result.data?.session_id) {
          setSessionId(result.data.session_id);
          console.log('CustomerDisplay: Device session registered:', result.data.session_id);
          
          // Start heartbeat
          startHeartbeat(result.data.session_id);
        }
      } catch (sessionError) {
        console.warn('CustomerDisplay: Could not register session:', sessionError);
        // Don't block display if session registration fails
      }

    } catch (error) {
      console.error('CustomerDisplay: Initialization error:', error);
      setError('Failed to initialize customer display: ' + error.message);
    }
  };

  const startHeartbeat = (sid) => {
    const heartbeatInterval = setInterval(async () => {
      try {
        await base44.functions.invoke('updateDeviceHeartbeat', {
          session_id: sid,
          active_order_id: currentOrder?.id || null,
          active_order_number: currentOrder?.order_number || null
        });
      } catch (err) {
        console.warn('CustomerDisplay: Heartbeat failed:', err);
      }
    }, 10000); // Every 10 seconds

    // Store interval ID to clear on unmount
    window.customerDisplayHeartbeat = heartbeatInterval;
  };

  const disconnectSession = async () => {
    if (window.customerDisplayHeartbeat) {
      clearInterval(window.customerDisplayHeartbeat);
    }

    if (sessionId) {
      try {
        await base44.functions.invoke('disconnectDeviceSession', {
          session_id: sessionId
        });
        console.log('CustomerDisplay: Session disconnected');
      } catch (err) {
        console.warn('CustomerDisplay: Error disconnecting session:', err);
      }
    }
  };

  const pollForOrder = async () => {
    try {
      if (!merchant?.id) {
        console.log('CustomerDisplay: No merchant ID for polling');
        return;
      }

      // Use the stationId state for filtering
      const targetStationId = stationId;

      console.log('CustomerDisplay: Polling for orders...', {
        merchantId: merchant.id,
        stationId: targetStationId,
        currentScreen,
        hasCurrentOrder: !!currentOrder
      });

      // --- Part 1: Find new orders that need to be displayed (if no order is currently active) ---
      if (!currentOrder) {
        const pendingResp = await base44.functions.invoke('getDisplayOrders', {
          merchant_id: merchant.id,
          station_id: targetStationId || null,
          mode: 'customer'
        });

        if (pendingResp.data?.success && pendingResp.data.pendingOrder) {
          const order = pendingResp.data.pendingOrder;
          console.log('CustomerDisplay: Found new order:', {
            orderNumber: order.order_number,
            status: order.status,
            total: order.total
          });

          setCurrentOrder(order);

          // Mark as sent to display
          await base44.functions.invoke('updateDisplayOrder', {
            order_id: order.id,
            merchant_id: merchant.id,
            action: 'mark_sent'
          });

          if (order.status === 'approval') {
            setCurrentScreen('approval');
          } else if (order.status === 'tip_selection') {
            setCurrentScreen('tip');
          } else if (order.status === 'ready_for_payment') {
            setCurrentScreen('payment_method');
          } else {
            setCurrentScreen('approval');
          }
        }
      }

      // --- Part 2: If we have a current order, check for status updates ---
      if (currentOrder?.id) {
        try {
          const statusResp = await base44.functions.invoke('getDisplayOrders', {
            merchant_id: merchant.id,
            mode: 'customer',
            current_order_id: currentOrder.id
          });
          if (!statusResp.data?.success || !statusResp.data.currentOrder) {
            console.log('CustomerDisplay: Current order not found, returning to welcome.');
            returnToWelcome();
            return;
          }
          const updatedOrder = statusResp.data.currentOrder;
          
          console.log('CustomerDisplay: Status check:', {
            orderNumber: updatedOrder.order_number,
            oldStatus: currentOrder.status,
            newStatus: updatedOrder.status,
            oldTip: currentOrder.tip_amount,
            newTip: updatedOrder.tip_amount,
            currentScreen
          });

          // Check if order has been updated
          const statusChanged = updatedOrder.status !== currentOrder.status;
          const tipChanged = updatedOrder.tip_amount !== currentOrder.tip_amount;
          const paymentMethodChanged = updatedOrder.payment_method !== currentOrder.payment_method;

          if (statusChanged || tipChanged || paymentMethodChanged) {
            console.log('CustomerDisplay: Order updated, refreshing');
            setCurrentOrder(updatedOrder); // Update local order state immediately

            // Handle status transitions
            if (updatedOrder.status === 'tip_selection') {
              console.log('CustomerDisplay: → Tip screen');
              setCurrentScreen('tip');
            } 
            else if (updatedOrder.status === 'ready_for_payment') {
              console.log('CustomerDisplay: → Payment method screen');
              setCurrentScreen('payment_method');
            } 
            else if (updatedOrder.status === 'payment_in_progress') {
              console.log('CustomerDisplay: → Payment processing, method:', updatedOrder.payment_method);
              
              if (updatedOrder.payment_method === 'solana_pay' || updatedOrder.payment_method === 'chain_link') {
                setCurrentScreen('solana_pay');
              } else if (updatedOrder.payment_method === 'card') {
                setCurrentScreen('card_payment');
              } else if (updatedOrder.payment_method === 'ebt') {
                setCurrentScreen('ebt_payment');
              }
            } 
            else if (updatedOrder.status === 'completed' || (updatedOrder.status === 'pending' && updatedOrder.payment_method && updatedOrder.payment_method !== 'pending')) {
              console.log('CustomerDisplay: → Success screen');
              setCurrentScreen('success');
              setTimeout(() => returnToWelcome(), 5000);
            }
            else if (updatedOrder.status === 'cancelled') {
              console.log('CustomerDisplay: Order cancelled');
              returnToWelcome();
            }
          }
        } catch (orderError) {
          console.error('CustomerDisplay: Error fetching current order:', orderError);
        }
      } else if (!currentOrder && currentScreen !== 'welcome') {
        // If no current order is active and we're not on the welcome screen,
        // it means the previous order was completed/cancelled and we need to reset.
        // Special case: don't interrupt SolanaPayScreen if it's processing
        if (currentScreen !== 'solana_pay') {
             console.log('CustomerDisplay: No active order, returning to welcome from non-solana screen.');
             returnToWelcome();
        }
      }

    } catch (error) {
      console.error('CustomerDisplay: Polling error:', error);
    }
  };

  const handleTipSelected = async (tipAmount) => {
    if (!currentOrder) return;

    try {
      console.log('CustomerDisplay: Tip selected:', tipAmount);
      
      // Update order with tip (server recomputes the total)
      await base44.functions.invoke('updateDisplayOrder', {
        order_id: currentOrder.id,
        merchant_id: merchant.id,
        action: 'set_tip',
        tip_amount: tipAmount
      });

      // No need to setCurrentOrder or setCurrentScreen here, polling will pick it up
    } catch (error) {
      console.error('CustomerDisplay: Error updating tip:', error);
    }
  };

  const handlePaymentMethodSelected = async (method) => {
    if (!currentOrder) return;

    try {
      console.log('CustomerDisplay: Payment method selected:', method);

      await base44.functions.invoke('updateDisplayOrder', {
        order_id: currentOrder.id,
        merchant_id: merchant.id,
        action: 'set_payment_method',
        payment_method: method
      });

      // No need to setCurrentOrder or setCurrentScreen here, polling will pick it up
    } catch (error) {
      console.error('CustomerDisplay: Error selecting payment method:', error);
    }
  };

  const handlePaymentComplete = async (success, details = {}) => {
    console.log('CustomerDisplay: Payment complete callback received:', success, details);
    
    if (success) {
      // Update order status to completed
      if (currentOrder?.id) {
        try {
          await base44.functions.invoke('updateDisplayOrder', {
            order_id: currentOrder.id,
            merchant_id: merchant.id,
            action: 'complete',
            payment_details: details
          });
          // Polling will eventually catch the 'completed' status and transition
        } catch (err) {
          console.error('CustomerDisplay: Error updating order to completed:', err);
          // Even if update fails, try to show success and return to welcome as a fallback
          setCurrentScreen('success');
          setTimeout(() => {
            returnToWelcome();
          }, 5000);
        }
      } else {
        // If no current order, still show success for a bit then reset
        setCurrentScreen('success');
        setTimeout(() => {
          returnToWelcome();
        }, 5000);
      }
    } else {
      setCurrentScreen('error');
      setTimeout(() => {
        // Return to payment method selection to retry, or approval if it was cash initially
        if (currentOrder?.payment_method === 'cash') {
          setCurrentScreen('approval'); // If cash failed (e.g. staff cancelled), back to approval
        } else {
          setCurrentScreen('payment_method'); // For other payment types, retry payment method selection
        }
      }, 5000);
    }
  };

  const returnToWelcome = () => {
    console.log('CustomerDisplay: Returning to welcome screen');
    setCurrentOrder(null);
    setCurrentScreen('welcome');
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-900 to-red-700 p-8">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Display Error</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={initializeDisplay}
            className="mt-4 px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">Initializing Customer Display...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {stationInfo && (
        <div className="fixed top-2 left-2 z-50 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
          {stationInfo.name} · {stationInfo.layout_type}
        </div>
      )}
      {/* Debug info */}
      {window.location.hostname === 'localhost' && (
        <div className="fixed top-2 right-2 bg-black/70 text-white text-xs p-2 rounded z-50 max-w-xs">
          <div>Screen: {currentScreen}</div>
          <div>Order: {currentOrder?.order_number || 'None'}</div>
          <div>Status: {currentOrder?.status || 'N/A'}</div>
          <div>Tip: ${currentOrder?.tip_amount?.toFixed(2) || '0.00'}</div>
          <div>Merchant: {merchant?.business_name}</div>
          <div>Station ID: {stationId || 'N/A'}</div>
        </div>
      )}

      {currentScreen === 'welcome' && (
        <WelcomeScreen
          merchantName={merchant.business_name || merchant.display_name}
          order={null}
          settings={merchant.settings}
        />
      )}

      {currentScreen === 'approval' && currentOrder && (
        <ApprovalScreen
          order={currentOrder}
          settings={merchant.settings}
          onApprove={async () => {
            // Only update backend, polling will handle screen transition
            console.log('CustomerDisplay: Order approved, updating status to tip_selection');
            await base44.functions.invoke('updateDisplayOrder', {
              order_id: currentOrder.id,
              merchant_id: merchant.id,
              action: 'approve'
            });
          }}
        />
      )}

      {currentScreen === 'tip' && currentOrder && (
        <TipScreen
          order={currentOrder}
          settings={merchant.settings}
          onTipSelected={handleTipSelected}
        />
      )}

      {currentScreen === 'payment_method' && currentOrder && (
        <PaymentMethodSelectionScreen
          order={currentOrder}
          settings={merchant.settings}
          onMethodSelected={handlePaymentMethodSelected}
        />
      )}

      {currentScreen === 'solana_pay' && currentOrder && (
        <SolanaPayScreen
          order={currentOrder}
          settings={merchant.settings}
          onPaymentComplete={handlePaymentComplete}
        />
      )}

      {currentScreen === 'card_payment' && currentOrder && (
        <CardPaymentStatusScreen
          order={currentOrder}
          settings={merchant.settings}
          onComplete={handlePaymentComplete}
        />
      )}

      {currentScreen === 'ebt_payment' && currentOrder && (
        <EBTPaymentScreen
          order={currentOrder}
          settings={merchant.settings}
          onComplete={handlePaymentComplete}
        />
      )}

      {currentScreen === 'success' && currentOrder && (
        <TransactionStatusScreen
          success={true}
          order={currentOrder}
          settings={merchant.settings}
        />
      )}

      {currentScreen === 'error' && (
        <TransactionStatusScreen
          success={false}
          order={currentOrder} // Pass currentOrder to display context even on error
          settings={merchant.settings}
          errorMessage="Payment failed. Please try again."
        />
      )}
    </div>
  );
}