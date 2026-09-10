import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import Stripe from 'npm:stripe@17.4.0';

// Creates a Stripe-hosted Checkout Session for an in-POS wallet payment
// (Apple Pay / Google Pay). Because Checkout runs on Stripe's own verified
// domain, Apple Pay / Google Pay appear automatically — no per-merchant
// Apple Pay domain verification and no client publishable key are required.
// Each merchant pays through their OWN Stripe Connect account.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId, merchantId, returnUrl } = await req.json();
    if (!orderId || !merchantId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Authorize: platform admin or the merchant that owns the order.
    if (user.role !== 'admin' && user.merchant_id !== merchantId) {
      return Response.json({ error: 'Forbidden: Access denied' }, { status: 403 });
    }

    const merchant = await base44.asServiceRole.entities.Merchant.get(merchantId);
    if (!merchant) {
      return Response.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const stripeSettings = merchant.settings?.payment_gateways?.stripe;
    if (!stripeSettings || !stripeSettings.enabled) {
      return Response.json({ error: 'Stripe is not enabled for this merchant' }, { status: 400 });
    }

    const stripeSecretKey = Deno.env.get('STRIPE_CONNECT_KEY') || Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return Response.json({ error: 'Payment processor not configured' }, { status: 500 });
    }

    // Resolve the merchant's own Stripe Connect account (parent dealer fallback).
    let connectedAccountId = stripeSettings.account_id;
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
      return Response.json({ error: 'No Stripe Connect account found. Complete Stripe Connect onboarding before accepting wallet payments.' }, { status: 400 });
    }

    // SECURITY: never trust a client-supplied amount — bill the stored order total.
    const orderResults = await base44.asServiceRole.entities.Order.filter({ id: orderId });
    if (!orderResults || orderResults.length === 0) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }
    const order = orderResults[0];
    if (order.merchant_id !== merchantId) {
      return Response.json({ error: 'Forbidden: Order does not belong to this merchant' }, { status: 403 });
    }
    if (order.status === 'completed' || order.status === 'refunded') {
      return Response.json({ error: 'Order is already paid' }, { status: 400 });
    }
    const billableAmount = Number(order.total);
    if (!Number.isFinite(billableAmount) || billableAmount <= 0) {
      return Response.json({ error: 'Invalid order total' }, { status: 400 });
    }

    const currency = (merchant.settings?.currency || 'usd').toLowerCase();
    const stripe = new Stripe(stripeSecretKey);

    // Return the customer to the POS after paying. Prefer the caller-supplied
    // return URL (the POS page), falling back to /POS on the request origin.
    const origin = req.headers.get('origin') || `https://${req.headers.get('host') || 'opentill.base44.app'}`;
    const baseReturnUrl = (returnUrl && String(returnUrl).startsWith('http')) ? String(returnUrl) : `${origin}/POS`;
    const sep = baseReturnUrl.includes('?') ? '&' : '?';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        quantity: 1,
        price_data: {
          currency,
          unit_amount: Math.round(billableAmount * 100),
          product_data: {
            name: `openTILL Order ${order.order_number || ''}`.trim(),
          },
        },
      }],
      client_reference_id: orderId,
      success_url: `${baseReturnUrl}${sep}wallet_paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseReturnUrl}${sep}wallet_canceled=1`,
      metadata: {
        order_id: orderId,
        merchant_id: merchantId,
      },
    }, { stripeAccount: connectedAccountId });

    return Response.json({ url: session.url, session_id: session.id });
  } catch (error) {
    console.error('createWalletCheckoutSession error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});