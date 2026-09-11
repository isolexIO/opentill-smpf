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

    const { merchant_id } = await req.json();
    if (!merchant_id) return Response.json({ error: 'merchant_id is required' }, { status: 400 });

    // Only platform admins can process the non-return fee
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }

    const merchant = await base44.asServiceRole.entities.Merchant.get(merchant_id);
    if (!merchant) return Response.json({ error: 'Merchant not found' }, { status: 404 });

    const readerProgram = merchant.settings?.reader_program;
    if (!readerProgram?.payment_method_id) {
      return Response.json({ error: 'No card on file for this merchant' }, { status: 400 });
    }
    if (readerProgram.fee_charged) {
      return Response.json({ error: 'Non-return fee already charged' }, { status: 400 });
    }
    if (readerProgram.reader_returned) {
      return Response.json({ error: 'Reader was returned — no fee applicable' }, { status: 400 });
    }

    // Charge the saved card $100.00 (10000 cents)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 10000,
      currency: 'usd',
      payment_method: readerProgram.payment_method_id,
      customer: readerProgram.customer_id || undefined,
      confirm: true,
      off_session: true,
      description: 'Stripe Reader M2 non-return fee',
      metadata: {
        merchant_id,
        purpose: 'reader_non_return_fee',
        merchant_name: merchant.business_name || '',
      },
    });

    // Update merchant record to record the charge
    await base44.asServiceRole.entities.Merchant.update(merchant_id, {
      settings: {
        ...merchant.settings,
        reader_program: {
          ...readerProgram,
          fee_charged: true,
          fee_charged_at: new Date().toISOString(),
          fee_payment_intent_id: paymentIntent.id,
        },
      },
    });

    return Response.json({
      success: true,
      payment_intent_id: paymentIntent.id,
      amount: 10000,
      message: 'Reader non-return fee charged successfully',
    });
  } catch (error) {
    console.error('processReaderDepositFee error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});