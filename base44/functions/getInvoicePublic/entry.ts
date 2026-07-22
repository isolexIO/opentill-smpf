import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

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
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }
    if (!invoice || invoice.pay_token !== token) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    let merchant_name = 'Merchant';
    try {
      const merchant = await base44.asServiceRole.entities.Merchant.get(invoice.merchant_id);
      if (merchant?.business_name) merchant_name = merchant.business_name;
    } catch (_e) {
      // ignore — fall back to generic label
    }

    return Response.json({
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        customer_name: invoice.customer_name,
        customer_email: invoice.customer_email,
        amount: invoice.amount,
        currency: invoice.currency || 'USD',
        status: invoice.status,
        due_date: invoice.due_date,
        notes: invoice.notes,
        created_date: invoice.created_date
      },
      merchant_name
    });
  } catch (error) {
    console.error('getInvoicePublic error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});