import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import Stripe from 'npm:stripe@17.4.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'dealer_admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { account_id, return_url, refresh_url } = await req.json();

    // Create new account link
    const accountLink = await stripe.accountLinks.create({
      account: account_id,
      refresh_url: refresh_url || return_url,
      return_url: return_url,
      type: 'account_onboarding',
    });

    return Response.json({
      success: true,
      onboarding_url: accountLink.url
    });
  } catch (error) {
    console.error('Refresh onboarding error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});