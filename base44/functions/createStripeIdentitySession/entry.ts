import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import Stripe from 'npm:stripe@17.4.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { business_name, owner_email, owner_name, return_url, entity_type, entity_id } = body;

    if (!business_name || !owner_email) {
      return Response.json({
        error: 'business_name and owner_email are required'
      }, { status: 400 });
    }

    const stripeKey = Deno.env.get('STRIPE_CONNECT_KEY') || Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    }
    const stripe = new Stripe(stripeKey);

    // Create a Stripe Identity VerificationSession.
    // This returns a client_secret that the frontend uses to embed the
    // Stripe-hosted ID + selfie verification modal.
    const session = await stripe.identity.verificationSessions.create({
      type: 'document',
      options: {
        document: {
          allowed_types: ['driving_license', 'passport', 'id_card'],
          require_live_capture: true,
          require_matching_selfie_photo: true,
        },
      },
      metadata: {
        business_name,
        owner_email,
        owner_name: owner_name || '',
        source: 'opentill_merchant_onboarding',
        entity_type: entity_type || '',
        entity_id: entity_id || '',
      },
      provided_info: {
        email: owner_email,
      },
      ...(return_url ? { return_url } : {}),
    });

    return Response.json({
      success: true,
      client_secret: session.client_secret,
      session_id: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('createStripeIdentitySession error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});