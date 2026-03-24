import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only super admins can generate invoices
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { merchantId, newPlan, currentPlan } = await req.json();

    if (!merchantId || !newPlan) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get subscription plans
    const plans = await base44.entities.SubscriptionPlan.filter({});
    const newPlanData = plans.find(p => p.plan_id === newPlan);
    const currentPlanData = currentPlan ? plans.find(p => p.plan_id === currentPlan) : null;

    if (!newPlanData) {
      return Response.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Get merchant
    const merchants = await base44.entities.Merchant.filter({ id: merchantId });
    if (!merchants || merchants.length === 0) {
      return Response.json({ error: 'Merchant not found' }, { status: 404 });
    }
    const merchant = merchants[0];

    // Calculate pricing
    const monthlyPrice = newPlanData.price_monthly || 0;
    const yearlyPrice = newPlanData.price_yearly || 0;
    const billingCycle = 'monthly'; // Can be configurable

    // Generate invoice data
    const invoiceData = {
      invoice_number: `INV-${Date.now()}`,
      merchant_id: merchantId,
      merchant_name: merchant.business_name,
      merchant_email: merchant.owner_email,
      from_plan: currentPlanData?.name || 'Free',
      to_plan: newPlanData.name,
      monthly_amount: monthlyPrice,
      yearly_amount: yearlyPrice,
      billing_cycle: billingCycle,
      amount: billingCycle === 'monthly' ? monthlyPrice : yearlyPrice,
      status: 'pending_approval',
      description: `Upgrade from ${currentPlanData?.name || 'Free'} to ${newPlanData.name}`,
      created_at: new Date().toISOString(),
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    };

    return Response.json({
      success: true,
      invoice: invoiceData
    });
  } catch (error) {
    console.error('Error generating invoice:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});