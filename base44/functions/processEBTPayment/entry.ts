import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';

// EBT/SNAP payment processing. Manual mode only: the cashier runs the EBT
// card on a standalone terminal and confirms the transaction in the POS with
// the approval code. No external API call is made; the transaction is
// recorded for audit/reconciliation. Integrated gateway mode is not enabled
// on this platform.
//
// Actions: 'balance' (balance inquiry), 'purchase', 'refund', 'void'.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const {
      merchantId,
      orderId,
      action,          // 'balance' | 'purchase' | 'refund' | 'void'
      amount,          // dollars for purchase/refund
      ebtCardNumber,   // last 4 or token for manual; full/PAN for integrated
      approvalCode,    // manual mode: from the standalone terminal
      pin,             // integrated mode: cardholder PIN (never stored)
      transactionId,  // for void/refund of a prior transaction
    } = await req.json();

    if (!merchantId) {
      return Response.json({ success: false, error: 'merchantId is required' }, { status: 400 });
    }
    if (!['balance', 'purchase', 'refund', 'void'].includes(action)) {
      return Response.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    // Verify the caller has access to this merchant
    if (user.role !== 'admin' && user.merchant_id !== merchantId) {
      return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const merchant = await base44.asServiceRole.entities.Merchant.get(merchantId);
    if (!merchant) {
      return Response.json({ success: false, error: 'Merchant not found' }, { status: 404 });
    }

    const ebtConfig = merchant.settings?.payment_gateways?.ebt;
    if (!ebtConfig || !ebtConfig.enabled) {
      return Response.json({
        success: false,
        error: 'EBT is not enabled. Enable it in Settings → Payment Gateways.',
      }, { status: 400 });
    }

    // ---- Manual mode -------------------------------------------------------
    // Cashier processes on a standalone EBT terminal and records the result.
    if (ebtConfig.provider === 'manual' || ebtConfig.manual_entry_mode) {
      if (action === 'purchase' && !approvalCode) {
        return Response.json({
          success: false,
          error: 'Approval code from the EBT terminal is required for manual purchase',
        }, { status: 400 });
      }

      // For purchase/refund against an order, load and validate the order.
      let order = null;
      if (orderId) {
        const orders = await base44.asServiceRole.entities.Order.filter({ id: orderId });
        if (!orders || orders.length === 0) {
          return Response.json({ success: false, error: 'Order not found' }, { status: 404 });
        }
        order = orders[0];
        if (order.merchant_id !== merchantId) {
          return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }
      }

      const recordedAmount = action === 'purchase' && order
        ? Number(order.ebt_eligible_total || order.total || 0)
        : Number(amount || 0);

      // Record the EBT transaction on the order's payment_details.
      if (order) {
        await base44.asServiceRole.entities.Order.update(orderId, {
          payment_method: action === 'refund' ? order.payment_method : 'ebt',
          ebt_amount: action === 'purchase' ? recordedAmount : (order.ebt_amount || 0),
          payment_details: {
            ...(order.payment_details || {}),
            ebt: {
              mode: 'manual',
              provider: 'manual',
              action,
              approval_code: approvalCode || null,
              amount: recordedAmount,
              transaction_id: transactionId || null,
              card_last_4: ebtCardNumber || null,
              recorded_at: new Date().toISOString(),
              recorded_by: user.email || user.id,
            },
          },
          status: action === 'purchase' ? 'completed' : order.status,
        });
      }

      return Response.json({
        success: true,
        mode: 'manual',
        action,
        amount: recordedAmount,
        approval_code: approvalCode || null,
        transaction_id: transactionId || `manual-${Date.now()}`,
      });
    }

    // ---- Integrated mode ---------------------------------------------------
    // Integrated EBT gateway credentials are not configured on this platform
    // (manual mode is the supported EBT fulfillment path). Any non-manual
    // request is rejected here without referencing external secrets.
    return Response.json({
      success: false,
      error: 'Integrated EBT is not available. Set the merchant EBT provider to "manual" and record the approval code from your standalone EBT terminal.',
    }, { status: 501 });
  } catch (error) {
    console.error('processEBTPayment error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});