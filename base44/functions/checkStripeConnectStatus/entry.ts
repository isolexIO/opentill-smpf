import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import Stripe from 'npm:stripe@17.4.0';

const stripe = new Stripe(Deno.env.get('STRIPE_CONNECT_KEY') || Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dealer_id, account_id } = await req.json();

    // SECURITY: Prevent IDOR — only the dealer's own admin (or a platform
    // admin) may update a dealer's Stripe connection state.
    if (user.role !== 'admin' && user.dealer_id !== dealer_id) {
      return Response.json({ error: 'Forbidden: cannot modify another dealer' }, { status: 403 });
    }

    // Retrieve account from Stripe
    const account = await stripe.accounts.retrieve(account_id);

    // Update ambassador if payouts are enabled
    if (account.payouts_enabled && account.charges_enabled) {
      try {
        const ambassadors = await base44.asServiceRole.entities.Ambassador.filter({ legacy_dealer_id: dealer_id });
        if (ambassadors && ambassadors[0]) {
          await base44.asServiceRole.entities.Ambassador.update(ambassadors[0].id, {
            stripe_connected: true,
            billing_mode: 'dealer'
          });
        }
      } catch (e) {
        console.warn('Update ambassador stripe_connected failed:', e);
      }
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