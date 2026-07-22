import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import Stripe from 'npm:stripe@17.4.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { invoice_id, token, session_id } = await req.json();
    if (!invoice_id || !token) {
      return Response.json({ error: 'Missing parameters' }, { status: 400 });
    }

    let invoice;
    try {
      invoice = await base44.asServiceRole.entities.Invoice.get(invoice_id);
    } catch (_e) {
      return Response.json({ error: 'Invalid invoice' }, { status: 404 });
    }
    if (!invoice || invoice.pay_token !== token) {
      return Response.json({ error: 'Invalid invoice' }, { status: 404 });
    }
    if (invoice.status === 'paid') {
      return Response.json({ status: 'paid' });
    }

    const merchant = await base44.asServiceRole.entities.Merchant.get(invoice.merchant_id);
    const accountId = merchant?.settings?.payment_gateways?.stripe?.account_id;

    const stripeKey = Deno.env.get('STRIPE_CONNECT_KEY') || Deno.env.get('STRIPE_SECRET_KEY');
    const stripe = new Stripe(stripeKey);

    if (!session_id) {
      return Response.json({ status: 'unpaid' });
    }

    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(session_id, {}, accountId ? { stripeAccount: accountId } : undefined);
    } catch (_e) {
      return Response.json({ error: 'Unable to verify payment' }, { status: 400 });
    }

    if (session.payment_status === 'paid') {
      await base44.asServiceRole.entities.Invoice.update(invoice_id, {
        status: 'paid',
        paid_at: new Date().toISOString(),
        stripe_payment_intent_id: session.payment_intent || undefined
      });
      return Response.json({ status: 'paid' });
    }

    return Response.json({ status: session.payment_status || 'unpaid' });
  } catch (error) {
    console.error('confirmInvoicePayment error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});