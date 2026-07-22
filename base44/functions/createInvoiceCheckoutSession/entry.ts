import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import Stripe from 'npm:stripe@17.4.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { invoice_id, token } = await req.json();
    if (!invoice_id || !token) {
      return Response.json({ error: 'Missing invoice_id or token' }, { status: 400 });
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
      return Response.json({ error: 'Invoice already paid' }, { status: 400 });
    }
    if (invoice.status === 'void') {
      return Response.json({ error: 'Invoice is void' }, { status: 400 });
    }

    const merchant = await base44.asServiceRole.entities.Merchant.get(invoice.merchant_id);
    const accountId = merchant?.settings?.payment_gateways?.stripe?.account_id;
    if (!accountId) {
      return Response.json({ error: 'Merchant payments are not configured' }, { status: 400 });
    }

    const stripeKey = Deno.env.get('STRIPE_CONNECT_KEY') || Deno.env.get('STRIPE_SECRET_KEY');
    const stripe = new Stripe(stripeKey);

    const origin = req.headers.get('origin') || `https://${req.headers.get('host') || 'opentill-pos.sol'}`;
    const currency = (invoice.currency || 'USD').toLowerCase();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        quantity: 1,
        price_data: {
          currency,
          unit_amount: Math.round((invoice.amount || 0) * 100),
          product_data: {
            name: `Invoice ${invoice.invoice_number}`,
            description: invoice.notes ? invoice.notes.slice(0, 140) : undefined
          }
        }
      }],
      customer_email: invoice.customer_email || undefined,
      client_reference_id: invoice_id,
      success_url: `${origin}/PayInvoice?invoice=${invoice_id}&token=${token}&paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/PayInvoice?invoice=${invoice_id}&token=${token}&canceled=1`,
      metadata: {
        invoice_id,
        merchant_id: invoice.merchant_id
      }
    }, { stripeAccount: accountId });

    const nextStatus = invoice.status === 'draft' ? 'sent' : invoice.status;
    await base44.asServiceRole.entities.Invoice.update(invoice_id, {
      stripe_checkout_session_id: session.id,
      status: nextStatus,
      sent_at: invoice.sent_at || new Date().toISOString()
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('createInvoiceCheckoutSession error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});