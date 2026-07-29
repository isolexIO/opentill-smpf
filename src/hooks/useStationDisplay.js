import { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Shared hook that manages the real-time polling + screen state for a
 * Customer Display (used by both the stationary CustomerDisplay page and
 * the MobileStationDisplay page). Reuses the existing getDisplayOrders /
 * updateDisplayOrder backend functions — no duplicate carts, orders, or
 * payment workflow.
 */
export function useStationDisplay({ merchant, stationId, sessionId, displayTimeout }) {
  const [currentOrder, setCurrentOrder] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [connectionLost, setConnectionLost] = useState(false);
  const stateRef = useRef({ currentOrder, currentScreen });

  useEffect(() => {
    stateRef.current = { currentOrder, currentScreen };
  }, [currentOrder, currentScreen]);

  const returnToWelcome = useCallback(() => {
    setCurrentOrder(null);
    setCurrentScreen('welcome');
  }, []);

  const pollForOrder = useCallback(async () => {
    if (!merchant?.id) return;

    const { currentOrder: curOrder, currentScreen: curScreen } = stateRef.current;
    const targetStationId = stationId;

    try {
      // --- Part 1: Find new orders that need to be displayed ---
      if (!curOrder) {
        const pendingResp = await base44.functions.invoke('getDisplayOrders', {
          merchant_id: merchant.id,
          session_id: sessionId,
          station_id: targetStationId || null,
          mode: 'customer'
        });

        if (pendingResp.data?.success && pendingResp.data.pendingOrder) {
          const order = pendingResp.data.pendingOrder;
          setCurrentOrder(order);

          await base44.functions.invoke('updateDisplayOrder', {
            order_id: order.id,
            merchant_id: merchant.id,
            session_id: sessionId,
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

      // --- Part 2: Check for status updates on the current order ---
      if (curOrder?.id) {
        const statusResp = await base44.functions.invoke('getDisplayOrders', {
          merchant_id: merchant.id,
          session_id: sessionId,
          mode: 'customer',
          current_order_id: curOrder.id
        });

        if (!statusResp.data?.success || !statusResp.data.currentOrder) {
          returnToWelcome();
          return;
        }

        const updatedOrder = statusResp.data.currentOrder;
        const statusChanged = updatedOrder.status !== curOrder.status;
        const tipChanged = updatedOrder.tip_amount !== curOrder.tip_amount;
        const paymentMethodChanged = updatedOrder.payment_method !== curOrder.payment_method;

        if (statusChanged || tipChanged || paymentMethodChanged) {
          setCurrentOrder(updatedOrder);

          if (updatedOrder.status === 'tip_selection') {
            setCurrentScreen('tip');
          } else if (updatedOrder.status === 'ready_for_payment') {
            setCurrentScreen('payment_method');
          } else if (updatedOrder.status === 'payment_in_progress') {
            if (updatedOrder.payment_method === 'solana_pay' || updatedOrder.payment_method === 'chain_link') {
              setCurrentScreen('solana_pay');
            } else if (updatedOrder.payment_method === 'card') {
              setCurrentScreen('card_payment');
            } else if (updatedOrder.payment_method === 'ebt') {
              setCurrentScreen('ebt_payment');
            }
          } else if (updatedOrder.status === 'completed' || (updatedOrder.status === 'pending' && updatedOrder.payment_method && updatedOrder.payment_method !== 'pending')) {
            setCurrentScreen('success');
            setTimeout(() => returnToWelcome(), (displayTimeout || 8) * 1000);
          } else if (updatedOrder.status === 'cancelled') {
            returnToWelcome();
          }
        }
      } else if (!curOrder && curScreen !== 'welcome') {
        if (curScreen !== 'solana_pay') {
          returnToWelcome();
        }
      }

      setConnectionLost(false);
    } catch (error) {
      console.error('useStationDisplay: Polling error:', error);
      setConnectionLost(true);
    }
  }, [merchant, stationId, sessionId, displayTimeout, returnToWelcome]);

  useEffect(() => {
    if (!merchant) return;

    const interval = setInterval(() => {
      pollForOrder();
    }, 1500);

    return () => clearInterval(interval);
  }, [merchant, pollForOrder]);

  const handleTipSelected = useCallback(async (tipAmount) => {
    const { currentOrder: curOrder } = stateRef.current;
    if (!curOrder) return;

    try {
      await base44.functions.invoke('updateDisplayOrder', {
        order_id: curOrder.id,
        merchant_id: merchant.id,
        session_id: sessionId,
        action: 'set_tip',
        tip_amount: tipAmount
      });
    } catch (error) {
      console.error('useStationDisplay: Error updating tip:', error);
    }
  }, [merchant, sessionId]);

  const handlePaymentMethodSelected = useCallback(async (method) => {
    const { currentOrder: curOrder } = stateRef.current;
    if (!curOrder) return;

    try {
      await base44.functions.invoke('updateDisplayOrder', {
        order_id: curOrder.id,
        merchant_id: merchant.id,
        session_id: sessionId,
        action: 'set_payment_method',
        payment_method: method
      });
    } catch (error) {
      console.error('useStationDisplay: Error selecting payment method:', error);
    }
  }, [merchant, sessionId]);

  const handlePaymentComplete = useCallback(async (success, details = {}) => {
    const { currentOrder: curOrder } = stateRef.current;

    if (success) {
      if (curOrder?.id) {
        try {
          await base44.functions.invoke('updateDisplayOrder', {
            order_id: curOrder.id,
            merchant_id: merchant.id,
            session_id: sessionId,
            action: 'complete',
            payment_details: details
          });
        } catch (err) {
          console.error('useStationDisplay: Error completing order:', err);
          setCurrentScreen('success');
          setTimeout(() => returnToWelcome(), (displayTimeout || 8) * 1000);
        }
      } else {
        setCurrentScreen('success');
        setTimeout(() => returnToWelcome(), (displayTimeout || 8) * 1000);
      }
    } else {
      setCurrentScreen('error');
      setTimeout(() => {
        const { currentOrder: curOrder2 } = stateRef.current;
        if (curOrder2?.payment_method === 'cash') {
          setCurrentScreen('approval');
        } else {
          setCurrentScreen('payment_method');
        }
      }, 5000);
    }
  }, [merchant, sessionId, displayTimeout, returnToWelcome]);

  const handleApprove = useCallback(async () => {
    const { currentOrder: curOrder } = stateRef.current;
    if (!curOrder) return;

    try {
      await base44.functions.invoke('updateDisplayOrder', {
        order_id: curOrder.id,
        merchant_id: merchant.id,
        session_id: sessionId,
        action: 'approve'
      });
    } catch (error) {
      console.error('useStationDisplay: Error approving order:', error);
    }
  }, [merchant, sessionId]);

  return {
    currentOrder,
    currentScreen,
    connectionLost,
    handleTipSelected,
    handlePaymentMethodSelected,
    handlePaymentComplete,
    handleApprove,
    returnToWelcome,
  };
}