import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import Stripe from 'npm:stripe@17.4.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { merchant_id, label, registration_code, reader_type } = await req.json();
    if (!merchant_id) {
      return Response.json({ error: 'merchant_id is required' }, { status: 400 });
    }

    if (user.role !== 'admin' && user.merchant_id !== merchant_id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const merchant = await base44.asServiceRole.entities.Merchant.get(merchant_id);
    if (!merchant) {
      return Response.json({ error: 'Merchant not found' }, { status: 404 });
    }

    let connectedAccountId = merchant.settings?.payment_gateways?.stripe?.account_id;
    if (!connectedAccountId && merchant.dealer_id) {
      const dealers = await base44.asServiceRole.entities.Dealer.filter({ id: merchant.dealer_id });
      if (dealers && dealers.length > 0) connectedAccountId = dealers[0].stripe_account_id;
    }
    const locationId = merchant.settings?.payment_gateways?.stripe?.terminal_location_id;

    if (!connectedAccountId || !locationId) {
      return Response.json({
        error: 'Provision a Stripe Terminal location first (call setupStripeTerminal).'
      }, { status: 400 });
    }

    // Register an internet-connected reader (e.g. Verifone P400 / Stripe M2 /
    // Smart POS) to the merchant's provisioned location, on their connected
    // account. Bluetooth readers (B250M, WisePad 3) are paired client-side via
    // the Stripe Terminal JS SDK using this same location id.
    const reader = await stripe.terminal.readers.create({
      location: locationId,
      registration_code: registration_code || undefined,
      label: label || merchant.business_name || 'openTILL Reader',
      type: reader_type || 'verifone_p400',
    }, { stripeAccount: connectedAccountId });

    return Response.json({ success: true, reader });
  } catch (error) {
    console.error('registerStripeReader error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});