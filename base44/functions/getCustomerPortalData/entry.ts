import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { phone, email, customer_id } = body;
    const base44 = createClientFromRequest(req);

    let customer = null;

    if (customer_id) {
      const customers = await base44.asServiceRole.entities.Customer.filter({ id: customer_id });
      if (customers && customers.length > 0) customer = customers[0];
    } else if (phone) {
      const customers = await base44.asServiceRole.entities.Customer.filter({ phone });
      if (customers && customers.length > 0) customer = customers[0];
    } else if (email) {
      const customers = await base44.asServiceRole.entities.Customer.filter({ email: email.toLowerCase().trim() });
      if (customers && customers.length > 0) customer = customers[0];
    }

    if (!customer) {
      return Response.json({ success: false, error: 'Customer not found' }, { status: 404 });
    }

    // Get merchant name
    let merchantName = 'Merchant';
    try {
      const merchants = await base44.asServiceRole.entities.Merchant.filter({ id: customer.merchant_id });
      if (merchants && merchants.length > 0) {
        merchantName = merchants[0].business_name || merchants[0].display_name || 'Merchant';
      }
    } catch { /* non-fatal */ }

    return Response.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        loyalty_points: customer.loyalty_points || 0,
        duc_balance: customer.duc_balance || 0,
        duc_lifetime_earned: customer.duc_lifetime_earned || 0,
        total_spent: customer.total_spent || 0,
        visit_count: customer.visit_count || 0,
        merchant_id: customer.merchant_id,
        merchant_name: merchantName,
      },
    });
  } catch (error) {
    console.error('getCustomerPortalData error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});