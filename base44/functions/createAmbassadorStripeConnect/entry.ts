import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import Stripe from 'npm:stripe@17.4.0';

Deno.serve(async (req) => {
  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_CONNECT_KEY') || Deno.env.get('STRIPE_SECRET_KEY'));
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const isAdmin = user.role === 'admin' || user.role === 'super_admin' || user.role === 'root_admin';

    const { ambassador_id, dealer_id, return_url, refresh_url } = await req.json();

    // Resolve the Ambassador record to operate on.
    let ambassador;

    if (ambassador_id) {
      // Explicit ambassador_id — platform admins only (no dealer context to authorize against).
      if (!isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });
      ambassador = await base44.asServiceRole.entities.Ambassador.get(ambassador_id);
      if (!ambassador) return Response.json({ error: 'Ambassador not found' }, { status: 404 });
    } else if (dealer_id) {
      // Originated from the Dealer Dashboard — allow the owning dealer_admin or any platform admin.
      if (!isAdmin && user.dealer_id !== dealer_id) {
        return Response.json({ error: 'Forbidden: cannot manage another dealer' }, { status: 403 });
      }
      const dealers = await base44.asServiceRole.entities.Dealer.filter({ id: dealer_id });
      const dealer = dealers && dealers[0];
      if (!dealer) return Response.json({ error: 'Dealer not found' }, { status: 404 });

      // Find-or-create the matching Ambassador by owner_email.
      const existing = await base44.asServiceRole.entities.Ambassador.filter({ owner_email: dealer.owner_email });
      ambassador = existing && existing[0];
      if (!ambassador) {
        ambassador = await base44.asServiceRole.entities.Ambassador.create({
          name: dealer.name || 'openTILL Ambassador',
          slug: dealer.slug,
          owner_name: dealer.owner_name,
          owner_email: dealer.owner_email,
          contact_email: dealer.contact_email || dealer.owner_email,
          contact_phone: dealer.contact_phone,
          primary_color: dealer.primary_color,
          secondary_color: dealer.secondary_color,
          logo_url: dealer.logo_url,
          domain: dealer.domain,
          commission_percent: dealer.commission_percent || 0,
          payout_method: dealer.payout_method || 'stripe_connect',
          payout_minimum: dealer.payout_minimum || 20,
          status: dealer.status || 'trial',
        });
      }
    } else {
      return Response.json({ error: 'ambassador_id or dealer_id is required' }, { status: 400 });
    }

    // Reuse an existing connected account if one was already created.
    let accountId = ambassador.stripe_account_id;

    // If the dealer already has a Stripe account but the Ambassador doesn't yet, reuse it.
    if (!accountId && dealer_id) {
      const dealers = await base44.asServiceRole.entities.Dealer.filter({ id: dealer_id });
      const dealer = dealers && dealers[0];
      if (dealer && dealer.stripe_account_id) {
        accountId = dealer.stripe_account_id;
        await base44.asServiceRole.entities.Ambassador.update(ambassador.id, {
          stripe_account_id: accountId,
          stripe_connected: dealer.stripe_connected || false,
          payout_method: 'stripe_connect',
        });
      }
    }

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
          dealer_id: dealer_id || '',
          entity_type: 'ambassador',
          entity_name: ambassador.name || 'openTILL Ambassador',
        },
      });
      accountId = account.id;

      await base44.asServiceRole.entities.Ambassador.update(ambassador.id, {
        stripe_account_id: accountId,
        stripe_connected: false,
        payout_method: 'stripe_connect',
      });

      // Mirror onto the Dealer record so existing payout/terminal flows keep working.
      if (dealer_id) {
        try {
          await base44.asServiceRole.entities.Dealer.update(dealer_id, {
            stripe_account_id: accountId,
            stripe_connected: false,
          });
        } catch (e) {
          console.warn('Mirror stripe account to Dealer failed:', e);
        }
      }
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
      ambassador_id: ambassador.id,
      onboarding_url: accountLink.url,
    });
  } catch (error) {
    console.error('createAmbassadorStripeConnect error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});