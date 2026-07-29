import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import Stripe from 'npm:stripe@17.4.0';

Deno.serve(async (req) => {
  try {
    const stripeKey = Deno.env.get('STRIPE_CONNECT_KEY') || Deno.env.get('STRIPE_SECRET_KEY');
    const stripe = new Stripe(stripeKey);
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { merchant_id } = await req.json();
    if (!merchant_id) {
      return Response.json({ error: 'merchant_id is required' }, { status: 400 });
    }

    // Authorization: platform admin or the merchant themselves.
    if (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'root_admin' && user.merchant_id !== merchant_id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const merchant = await base44.asServiceRole.entities.Merchant.get(merchant_id);
    if (!merchant) {
      return Response.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const accountId = merchant.settings?.payment_gateways?.stripe?.account_id;
    if (!accountId) {
      return Response.json({ error: 'No Stripe account connected' }, { status: 400 });
    }

    // Create a login link so the merchant can access their Stripe Express dashboard.
    const loginLink = await stripe.accounts.createLoginLink(accountId);

    return Response.json({
      success: true,
      dashboard_url: loginLink.url,
      account_id: accountId,
    });
  } catch (error) {
    console.error('getStripeDashboardLink error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});