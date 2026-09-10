import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import Stripe from 'npm:stripe@17.4.0';

// Confirms a wallet (Apple Pay / Google Pay) payment after the customer returns
// from Stripe-hosted Checkout. Retrieves the session on the merchant's own
// Stripe Connect account, verifies it was paid, and finalizes the order.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId, merchantId } = await req.json();
    if (!sessionId || !merchantId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (user.role !== 'admin' && user.merchant_id !== merchantId) {
      return Response.json({ error: 'Forbidden: Access denied' }, { status: 403 });
    }

    const merchant = await base44.asServiceRole.entities.Merchant.get(merchantId);
    if (!merchant) {
      return Response.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const stripeSecretKey = Deno.env.get('STRIPE_CONNECT_KEY') || Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return Response.json({ error: 'Payment processor not configured' }, { status: 500 });
    }
    const stripe = new Stripe(stripeSecretKey);

    // Resolve the merchant's own Stripe Connect account (parent dealer fallback).
    let connectedAccountId = merchant.settings?.payment_gateways?.stripe?.account_id;
    if (!connectedAccountId && merchant.dealer_id) {
      try {
        const dealers = await base44.asServiceRole.entities.Ambassador.filter({ legacy_dealer_id: merchant.dealer_id });
        if (dealers && dealers.length > 0) {
          connectedAccountId = dealers[0].stripe_account_id;
        }
      } catch (e) {
        console.log('Could not load dealer for Stripe fallback:', e);
      }
    }
    if (!connectedAccountId) {
      return Response.json({ error: 'No Stripe Connect account found for this merchant.' }, { status: 400 });
    }

    // Retrieve the Checkout Session scoped to the connected account.
    const session = await stripe.checkout.sessions.retrieve(sessionId, { stripeAccount: connectedAccountId });
    if (session.payment_status !== 'paid') {
      return Response.json({ error: 'Payment was not completed', payment_status: session.payment_status }, { status: 400 });
    }

    const orderId = session.client_reference_id;
    if (!orderId) {
      return Response.json({ error: 'Session has no linked order' }, { status: 400 });
    }

    const orderResults = await base44.asServiceRole.entities.Order.filter({ id: orderId });
    if (!orderResults || orderResults.length === 0) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }
    const order = orderResults[0];
    if (order.merchant_id !== merchantId) {
      return Response.json({ error: 'Forbidden: Order does not belong to this merchant' }, { status: 403 });
    }

    // Idempotent: if the order is already completed/refunded, don't double-process.
    if (order.status === 'completed' || order.status === 'refunded') {
      return Response.json({ success: true, order_id: orderId, already_completed: true, status: order.status });
    }

    // Capture the real card funding type for surcharge reconciliation/audit.
    let cardFundingType = 'unknown';
    let cardLast4 = null;
    try {
      if (session.payment_intent) {
        const pi = await stripe.paymentIntents.retrieve(session.payment_intent as string, { stripeAccount: connectedAccountId });
        if (pi.payment_method) {
          const pm = await stripe.paymentMethods.retrieve(pi.payment_method as string, { stripeAccount: connectedAccountId });
          cardFundingType = pm?.card?.funding || 'unknown';
          cardLast4 = pm?.card?.last4 || null;
        }
      }
    } catch (e) {
      console.warn('Could not retrieve card funding type:', e.message);
    }

    const isKitchenEnabled = merchant.settings?.kitchen_display?.enabled !== false;

    await base44.asServiceRole.entities.Order.update(orderId, {
      payment_method: 'card',
      payment_details: {
        ...(order.payment_details || {}),
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent || null,
        card_funding_type: cardFundingType,
        card_last_4: cardLast4,
        wallet_provider: 'stripe_checkout',
      },
      status: isKitchenEnabled ? 'pending' : 'completed',
      sent_to_kitchen: isKitchenEnabled,
      sent_to_customer_display: true,
    });

    // Snapshot a SurchargeSettlement record for reconciliation/audit (mirrors card flow).
    try {
      const calculatedFeeCents = Math.round(Number(order.surcharge_amount || 0) * 100);
      await base44.asServiceRole.entities.SurchargeSettlement.create({
        order_id: orderId,
        merchant_id: merchantId,
        calculated_fee_cents: calculatedFeeCents,
        actual_fee_cents: calculatedFeeCents,
        customer_adjustment_cents: calculatedFeeCents,
        recoverable_fee_cents: calculatedFeeCents,
        merchant_absorbed_cents: 0,
        variance_cents: 0,
        variance_type: cardFundingType === 'credit' ? 'none' : 'cap_absorption',
        calc_version: 'engine-v1',
        settlement_date: new Date().toISOString(),
        flagged: false,
      });
    } catch (e) {
      console.warn('Could not create surcharge settlement snapshot:', e.message);
    }

    return Response.json({ success: true, order_id: orderId, status: isKitchenEnabled ? 'pending' : 'completed' });
  } catch (error) {
    console.error('confirmWalletCheckout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});