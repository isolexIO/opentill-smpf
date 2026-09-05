import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';

// EBT/SNAP payment processing. Supports two modes:
//  - "manual": cashier runs the EBT card on a standalone terminal, then
//    confirms the transaction in the POS with the approval code. No external
//    API call is made; the transaction is recorded for audit/reconciliation.
//  - integrated providers (fis, first_data, worldpay, clover): the function
//    calls the configured EBT gateway (EBT_GATEWAY_URL + EBT_API_KEY /
//    EBT_API_SECRET secrets) to authorize / refund / void the transaction.
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
    // Call the configured EBT gateway. Credentials live in platform secrets,
    // never on the merchant entity.
    const gatewayUrl = Deno.env.get('EBT_GATEWAY_URL');
    const apiKey = Deno.env.get('EBT_API_KEY');
    const apiSecret = Deno.env.get('EBT_API_SECRET');

    if (!gatewayUrl || !apiKey) {
      return Response.json({
        success: false,
        error: 'EBT processor not configured. Set EBT_GATEWAY_URL and EBT_API_KEY secrets to use integrated EBT.',
      }, { status: 500 });
    }

    // Load + validate the order for purchase/refund
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

    const billableAmount = action === 'purchase' && order
      ? Number(order.ebt_eligible_total || order.total || 0)
      : Number(amount || 0);

    if ((action === 'purchase' || action === 'refund') && (!Number.isFinite(billableAmount) || billableAmount <= 0)) {
      return Response.json({ success: false, error: 'Invalid amount' }, { status: 400 });
    }

    // Enforce per-merchant max transaction limit if configured
    if (ebtConfig.max_transaction_amount && ebtConfig.max_transaction_amount > 0 && billableAmount > ebtConfig.max_transaction_amount) {
      return Response.json({
        success: false,
        error: `Amount exceeds the configured EBT maximum ($${ebtConfig.max_transaction_amount})`,
      }, { status: 400 });
    }

    const payload = {
      provider: ebtConfig.provider,
      merchant_id: ebtConfig.merchant_id,
      terminal_id: ebtConfig.terminal_id,
      store_number: ebtConfig.store_number || null,
      test_mode: !!ebtConfig.test_mode,
      action,
      amount: Math.round(billableAmount * 100), // cents
      card: ebtCardNumber || null,
      pin: pin || null,
      transaction_id: transactionId || null,
      order_id: orderId || null,
    };

    const gatewayRes = await fetch(`${gatewayUrl.replace(/\/$/, '')}/ebt/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...(apiSecret ? { 'X-Api-Secret': apiSecret } : {}),
      },
      body: JSON.stringify(payload),
    });

    const gatewayData = await gatewayRes.json().catch(() => ({}));

    if (!gatewayRes.ok) {
      return Response.json({
        success: false,
        error: gatewayData?.error || gatewayData?.message || `EBT gateway returned ${gatewayRes.status}`,
        gateway_status: gatewayRes.status,
      }, { status: 502 });
    }

    // Record the successful EBT transaction on the order
    if (order && action === 'purchase') {
      await base44.asServiceRole.entities.Order.update(orderId, {
        payment_method: 'ebt',
        ebt_amount: billableAmount,
        payment_details: {
          ...(order.payment_details || {}),
          ebt: {
            mode: 'integrated',
            provider: ebtConfig.provider,
            action,
            amount: billableAmount,
            transaction_id: gatewayData.transaction_id || gatewayData.id || null,
            approval_code: gatewayData.approval_code || null,
            balance: gatewayData.balance || null,
            card_last_4: ebtCardNumber || null,
            processed_at: new Date().toISOString(),
          },
        },
        status: 'completed',
      });
    }

    return Response.json({
      success: true,
      mode: 'integrated',
      action,
      amount: billableAmount,
      transaction_id: gatewayData.transaction_id || gatewayData.id || null,
      approval_code: gatewayData.approval_code || null,
      balance: gatewayData.balance || null,
    });
  } catch (error) {
    console.error('processEBTPayment error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});