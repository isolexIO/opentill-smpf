import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import Stripe from 'npm:stripe@17.4.0';

Deno.serve(async (req) => {
  try {
    const stripeKey = Deno.env.get('STRIPE_CONNECT_KEY') || Deno.env.get('STRIPE_SECRET_KEY');
    const stripe = new Stripe(stripeKey);
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { merchant_id, return_url, refresh_url } = await req.json();
    if (!merchant_id) {
      return Response.json({ error: 'merchant_id is required' }, { status: 400 });
    }

    // Authorization: platform admin or the merchant themselves.
    if (user.role !== 'admin' && user.merchant_id !== merchant_id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const merchant = await base44.asServiceRole.entities.Merchant.get(merchant_id);
    if (!merchant) {
      return Response.json({ error: 'Merchant not found' }, { status: 404 });
    }

    // Reuse an existing connected account if we already created one, otherwise
    // create a new Express account for this merchant.
    let accountId = merchant.settings?.payment_gateways?.stripe?.account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: merchant.owner_email || undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'company',
        company: {
          name: merchant.business_name || 'openTILL Merchant',
        },
        metadata: {
          merchant_id,
          entity_type: 'merchant',
          entity_name: merchant.business_name || 'openTILL Merchant',
        },
      });
      accountId = account.id;

      // Persist the connected account id and enable the Stripe gateway.
      await base44.asServiceRole.entities.Merchant.update(merchant_id, {
        settings: {
          ...merchant.settings,
          payment_gateways: {
            ...merchant.settings?.payment_gateways,
            stripe: {
              ...merchant.settings?.payment_gateways?.stripe,
              account_id: accountId,
              enabled: true,
            },
          },
        },
      });
    }

    // Generate (or refresh) the onboarding link.
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refresh_url || return_url,
      return_url,
      type: 'account_onboarding',
    });

    return Response.json({
      success: true,
      account_id: accountId,
      onboarding_url: accountLink.url,
    });
  } catch (error) {
    console.error('createMerchantStripeConnect error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});