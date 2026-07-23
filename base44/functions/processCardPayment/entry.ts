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
    
    const { orderId, paymentMethodId, merchantId } = await req.json();

    if (!orderId || !paymentMethodId || !merchantId) {
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

    // SECURITY: Never trust a client-supplied amount. Load the authoritative
    // Order from the database and bill its stored total, preventing price
    // tampering / underpayment attacks.
    const orderResults = await base44.asServiceRole.entities.Order.filter({ id: orderId });
    if (!orderResults || orderResults.length === 0) {
      return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    }
    const order = orderResults[0];
    if (order.merchant_id !== merchantId) {
      return new Response(JSON.stringify({ error: "Forbidden: Order does not belong to this merchant" }), { status: 403, headers: { "Content-Type": "application/json" } });
    }
    if (order.status === 'completed' || order.status === 'refunded') {
      return new Response(JSON.stringify({ error: "Order is already paid" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    const billableAmount = Number(order.total);
    if (!Number.isFinite(billableAmount) || billableAmount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid order total" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    const currency = (merchant.settings?.currency || 'usd').toLowerCase();

    const stripe = new Stripe(stripeSettings.secret_key);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(billableAmount * 100), // Amount in cents, from DB order total
      currency: currency,
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