import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import Stripe from 'npm:stripe@17.4.0';

Deno.serve(async (req) => {
  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_CONNECT_KEY') || Deno.env.get('STRIPE_SECRET_KEY'));
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Only platform admins may create a Stripe Connect account for an ambassador.
    if (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'root_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { ambassador_id, return_url, refresh_url } = await req.json();
    if (!ambassador_id) {
      return Response.json({ error: 'ambassador_id is required' }, { status: 400 });
    }

    const ambassador = await base44.asServiceRole.entities.Ambassador.get(ambassador_id);
    if (!ambassador) {
      return Response.json({ error: 'Ambassador not found' }, { status: 404 });
    }

    // Reuse an existing connected account if one was already created.
    let accountId = ambassador.stripe_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: ambassador.owner_email || ambassador.contact_email || undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'company',
        company: {
          name: ambassador.name || 'openTILL Ambassador',
        },
        metadata: {
          ambassador_id,
          entity_type: 'ambassador',
          entity_name: ambassador.name || 'openTILL Ambassador',
        },
      });
      accountId = account.id;

      await base44.asServiceRole.entities.Ambassador.update(ambassador_id, {
        stripe_account_id: accountId,
        stripe_connected: false,
        payout_method: 'stripe_connect',
      });
    }

    const redirectUrl = return_url || (typeof location !== 'undefined' ? location.href : '');
    const refreshUrl = refresh_url || redirectUrl;

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: redirectUrl,
      type: 'account_onboarding',
    });

    return Response.json({
      success: true,
      account_id: accountId,
      onboarding_url: accountLink.url,
    });
  } catch (error) {
    console.error('createAmbassadorStripeConnect error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});