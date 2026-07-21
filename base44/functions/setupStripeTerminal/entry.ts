import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import Stripe from 'npm:stripe@17.4.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
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

    // Resolve the connected Stripe account ID. Prefer the merchant's own
    // Connect account; fall back to the parent dealer's account so terminal
    // provisioning works for merchants onboarded under a dealer.
    let connectedAccountId = merchant.settings?.payment_gateways?.stripe?.account_id;
    if (!connectedAccountId && merchant.dealer_id) {
      try {
        const dealers = await base44.asServiceRole.entities.Dealer.filter({ id: merchant.dealer_id });
        if (dealers && dealers.length > 0) {
          connectedAccountId = dealers[0].stripe_account_id;
        }
      } catch (e) {
        console.log('Could not load dealer for Stripe fallback:', e);
      }
    }

    if (!connectedAccountId) {
      return Response.json({
        error: 'No Stripe Connect account found. Complete Stripe Connect onboarding before provisioning a terminal location.'
      }, { status: 400 });
    }

    // Reuse an existing Terminal Location if we already created one.
    let locationId = merchant.settings?.payment_gateways?.stripe?.terminal_location_id;
    let location = null;
    if (locationId) {
      try {
        location = await stripe.terminal.locations.retrieve(locationId, {
          stripeAccount: connectedAccountId,
        });
      } catch (e) {
        // Stale/invalid location id — recreate below.
        location = null;
        locationId = null;
      }
    }

    if (!location) {
      const address = {
        line1: merchant.address || '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        postal_code: '94107',
        country: 'US',
      };
      location = await stripe.terminal.locations.create({
        display_name: merchant.business_name || 'openTILL Terminal',
        address,
      }, { stripeAccount: connectedAccountId });
      locationId = location.id;

      // Persist the location id + account id on the merchant's settings.
      await base44.asServiceRole.entities.Merchant.update(merchant_id, {
        settings: {
          ...merchant.settings,
          payment_gateways: {
            ...merchant.settings?.payment_gateways,
            stripe: {
              ...merchant.settings?.payment_gateways?.stripe,
              account_id: connectedAccountId,
              terminal_location_id: locationId,
            },
          },
        },
      });
    }

    // List readers registered at this location.
    const readers = await stripe.terminal.readers.list(
      { location: locationId, limit: 50 },
      { stripeAccount: connectedAccountId }
    );

    return Response.json({
      success: true,
      account_id: connectedAccountId,
      location_id: locationId,
      location,
      readers: readers.data,
    });
  } catch (error) {
    console.error('setupStripeTerminal error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});