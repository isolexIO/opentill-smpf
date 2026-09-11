import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import Stripe from 'npm:stripe@17.4.0';

Deno.serve(async (req) => {
  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    const stripe = new Stripe(stripeKey);
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { session_id, merchant_id } = await req.json();
    if (!session_id || !merchant_id) {
      return Response.json({ error: 'session_id and merchant_id are required' }, { status: 400 });
    }

    // Authorization
    if (user.role !== 'admin' && user.merchant_id !== merchant_id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const merchant = await base44.asServiceRole.entities.Merchant.get(merchant_id);
    if (!merchant) return Response.json({ error: 'Merchant not found' }, { status: 404 });

    // Retrieve the checkout session and validate it belongs to this merchant
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (!session || session.metadata?.merchant_id !== merchant_id) {
      return Response.json({ error: 'Invalid session for this merchant' }, { status: 400 });
    }
    if (session.status !== 'complete') {
      return Response.json({ error: 'Setup was not completed' }, { status: 400 });
    }

    // Retrieve the SetupIntent to get the payment method
    const setupIntentId = session.setup_intent as string;
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
    const paymentMethodId = setupIntent.payment_method as string;

    if (!paymentMethodId) {
      return Response.json({ error: 'No payment method found in setup session' }, { status: 400 });
    }

    // Retrieve payment method details for display (last 4, brand)
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);

    // Store the reader deposit info on the merchant settings
    await base44.asServiceRole.entities.Merchant.update(merchant_id, {
      settings: {
        ...merchant.settings,
        reader_program: {
          offered: true,
          agreed_at: new Date().toISOString(),
          setup_intent_id: setupIntentId,
          payment_method_id: paymentMethodId,
          customer_id: session.customer as string || null,
          card_last4: pm?.card?.last4 || null,
          card_brand: pm?.card?.brand || null,
          reader_shipped: false,
          reader_returned: false,
          fee_charged: false,
        },
      },
    });

    return Response.json({
      success: true,
      payment_method_id: paymentMethodId,
      card_last4: pm?.card?.last4 || null,
      card_brand: pm?.card?.brand || null,
      message: 'Card saved for reader deposit',
    });
  } catch (error) {
    console.error('confirmReaderDeposit error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});