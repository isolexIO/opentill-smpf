import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
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
    if (user.role !== 'admin' && user.merchant_id !== merchant_id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const merchant = await base44.asServiceRole.entities.Merchant.get(merchant_id);
    if (!merchant) {
      return Response.json({ error: 'Merchant not found' }, { status: 404 });
    }

    // Resolve the connected Stripe account id (merchant's own, or parent dealer's).
    let connectedAccountId = merchant.settings?.payment_gateways?.stripe?.account_id;
    if (!connectedAccountId && merchant.dealer_id) {
      try {
        const dealers = await base44.asServiceRole.entities.Ambassador.filter({ legacy_dealer_id: merchant.dealer_id });
        if (dealers && dealers.length > 0) {
          connectedAccountId = dealers[0].stripe_account_id;
        }
      } catch (e) {
        console.log('Could not load dealer for connection token fallback:', e);
      }
    }

    if (!connectedAccountId) {
      return Response.json({
        error: 'No Stripe Connect account found. Complete Stripe Connect onboarding first.'
      }, { status: 400 });
    }

    // Issue a Terminal connection token scoped to the connected account.
    const token = await stripe.terminal.connectionTokens.create(
      {},
      { stripeAccount: connectedAccountId }
    );

    return Response.json({
      success: true,
      connection_token: token.secret,
      account_id: connectedAccountId,
    });
  } catch (error) {
    console.error('createTerminalConnectionToken error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});