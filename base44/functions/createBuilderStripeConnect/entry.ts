import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import Stripe from 'npm:stripe@17.4.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { return_url, refresh_url } = await req.json();
    const redirectUrl = return_url || (typeof location !== 'undefined' ? location.href : '');
    const refreshUrl = refresh_url || redirectUrl;

    const stripe = new Stripe(Deno.env.get('STRIPE_CONNECT_KEY') || Deno.env.get('STRIPE_SECRET_KEY'));

    // Find the builder profile for the logged-in user
    const builders = await base44.asServiceRole.entities.Builder.filter({ user_email: user.email });
    if (!builders || builders.length === 0) {
      return Response.json({ error: 'Builder profile not found' }, { status: 404 });
    }
    const builder = builders[0];

    let accountId = builder.stripe_connect_id;

    // No account yet — create an Express account
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: { builder_id: builder.id, user_email: user.email },
      });
      accountId = account.id;
      await base44.asServiceRole.entities.Builder.update(builder.id, {
        stripe_connect_id: accountId,
        stripe_connected: false,
        payout_enabled: false,
      });
    }

    // Sync onboarding/payout status from Stripe
    let connected = builder.stripe_connected;
    let payoutEnabled = builder.payout_enabled;
    try {
      const account = await stripe.accounts.retrieve(accountId);
      connected = !!account.details_submitted;
      payoutEnabled = !!account.charges_enabled;
      await base44.asServiceRole.entities.Builder.update(builder.id, {
        stripe_connected: connected,
        payout_enabled: payoutEnabled,
      });
    } catch (syncErr) {
      console.warn('Stripe status sync failed:', syncErr.message);
    }

    // If onboarding isn't finished, generate a fresh account link
    let onboardingUrl = null;
    if (!connected) {
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: redirectUrl,
        type: 'account_onboarding',
      });
      onboardingUrl = accountLink.url;
    }

    return Response.json({
      success: true,
      connected,
      payout_enabled: payoutEnabled,
      account_id: accountId,
      onboarding_url: onboardingUrl,
    });
  } catch (error) {
    console.error('Builder Stripe Connect error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});