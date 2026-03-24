import { createClientFromRequest } from "npm:@base44/sdk@0.7.1";
import Stripe from "npm:stripe@14.14.0";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    
    const { orderId, amount, currency, paymentMethodId, merchantId } = await req.json();

    if (!orderId || !amount || !currency || !paymentMethodId || !merchantId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    
    // Verify user has access to this merchant
    if (user.role !== 'admin' && user.merchant_id !== merchantId) {
      return new Response(JSON.stringify({ error: "Forbidden: Access denied" }), { status: 403, headers: { "Content-Type": "application/json" } });
    }
    const merchant = await base44.asServiceRole.entities.Merchant.get(merchantId);

    if (!merchant) {
      return new Response(JSON.stringify({ error: "Merchant not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    const stripeSettings = merchant.settings?.payment_gateways?.stripe;
    if (!stripeSettings || !stripeSettings.enabled || !stripeSettings.secret_key) {
      return new Response(JSON.stringify({ error: "Stripe not configured for this merchant" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const stripe = new Stripe(stripeSettings.secret_key);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Amount in cents
      currency: currency.toLowerCase(),
      payment_method: paymentMethodId,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
      metadata: {
        order_id: orderId,
        merchant_id: merchantId,
      }
    });

    // Update the order with payment intent details
    await base44.asServiceRole.entities.Order.update(orderId, {
      payment_details: {
        ...(merchant.payment_details || {}),
        stripe_payment_intent_id: paymentIntent.id,
        status: paymentIntent.status,
      },
    });

    return new Response(JSON.stringify({
      status: paymentIntent.status,
      client_secret: paymentIntent.client_secret,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Stripe payment error:", error);
    return new Response(JSON.stringify({ error: error.message, status: 'failed' }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});