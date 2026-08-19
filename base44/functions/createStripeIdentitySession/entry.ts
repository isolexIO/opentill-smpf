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

    // The merchant onboarding flow is anonymous by design, so a logged-in
    // user is not required. When one is present (ambassador/builder portals),
    // record it for traceability.
    let user = null;
    try { user = await base44.auth.me(); } catch { /* anonymous onboarding */ }

    // Determine the app's frontend origin for return_url validation.
    // req.url's origin is the function host (e.g. the Base44 backend), NOT
    // the app the user sees — so it must never be used as the allowed origin.
    // Try in order: STRIPE_REDIRECT_URI secret (canonical app origin), the
    // browser's Origin header, the Referer header, and finally the return_url's
    // own origin (the frontend builds it from window.location.origin, so it
    // is trustworthy even when headers are unavailable).
    const _secretRedirect = Deno.env.get('STRIPE_REDIRECT_URI');
    const _secretOrigin = _secretRedirect ? (() => { try { return new URL(_secretRedirect).origin; } catch { return null; } })() : null;
    const _headerOrigin = req.headers.get('origin');
    const _referer = req.headers.get('referer');
    const _refererOrigin = _referer ? (() => { try { return new URL(_referer).origin; } catch { return null; } })() : null;
    let safeReturnUrl = null;
    if (return_url) {
      try {
        const u = new URL(return_url, 'https://placeholder.invalid');
        const allowed = [_secretOrigin, _headerOrigin, _refererOrigin].filter(Boolean);
        // If we have a known allowed origin, require a match; otherwise trust
        // the return_url's own origin (frontend-built, inherently safe).
        if (allowed.length === 0 || allowed.includes(u.origin)) {
          safeReturnUrl = u.toString();
        }
      } catch { /* invalid url */ }
    }

    // Use STRIPE_CONNECT_KEY (restricted key) for Identity. It must have the
    // identity_product_write permission enabled in the Stripe dashboard.
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
          require_matching_selfie: true,
        },
      },
      metadata: {
        business_name,
        owner_email,
        owner_name: owner_name || '',
        source: 'opentill_merchant_onboarding',
        entity_type: entity_type || '',
        entity_id: entity_id || '',
        requested_by_user_id: user?.id || '',
        requested_by_email: user?.email || '',
      },
      provided_details: {
        email: owner_email,
      },
      ...(safeReturnUrl ? { return_url: safeReturnUrl } : {}),
    });

    return Response.json({
      success: true,
      client_secret: session.client_secret,
      session_id: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('createStripeIdentitySession error:', error);
    // Surface a clear message when the Stripe key lacks Identity permissions
    if (error.message?.includes('identity_product_write') || error.message?.includes('identity_product_read')) {
      return Response.json({
        error: 'Stripe Identity permissions not enabled. Go to your Stripe Dashboard → API Keys → edit the restricted key and enable "Identity Verification Results" (Read & Write).',
      }, { status: 500 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
});