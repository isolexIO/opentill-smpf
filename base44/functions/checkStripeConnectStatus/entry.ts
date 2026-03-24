import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import Stripe from 'npm:stripe@17.4.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dealer_id, account_id } = await req.json();

    // Retrieve account from Stripe
    const account = await stripe.accounts.retrieve(account_id);

    // Update dealer if payouts are enabled
    if (account.payouts_enabled && account.charges_enabled) {
      await base44.asServiceRole.entities.Dealer.update(dealer_id, {
        stripe_connected: true,
        billing_mode: 'dealer'
      });
    }

    return Response.json({
      success: true,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted
    });
  } catch (error) {
    console.error('Check Stripe status error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});