import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import Stripe from 'npm:stripe@17.4.0';

/**
 * Confirms a Stripe Identity verification session and persists the verified
 * status on the matching Ambassador or Builder entity.
 *
 * Called by the IdentityVerificationCard after the user is redirected back
 * from Stripe's hosted verification page.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { entity_type, entity_id, session_id } = await req.json();

    if (!entity_type || !entity_id || !session_id) {
      return Response.json({ error: 'entity_type, entity_id, and session_id are required' }, { status: 400 });
    }

    if (!['ambassador', 'builder'].includes(entity_type)) {
      return Response.json({ error: 'Invalid entity_type' }, { status: 400 });
    }

    const stripeKey = Deno.env.get('STRIPE_CONNECT_KEY') || Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    }
    const stripe = new Stripe(stripeKey);

    // Retrieve the actual session status from Stripe — never trust the
    // redirect URL alone, since it can be replayed.
    const session = await stripe.identity.verificationSessions.retrieve(session_id);
    const verified = session.status === 'verified';

    if (!verified) {
      return Response.json({
        success: true,
        status: session.status,
        verified: false,
      });
    }

    if (entity_type === 'ambassador') {
      const ambassadors = await base44.asServiceRole.entities.Ambassador.filter({ id: entity_id });
      if (!ambassadors || ambassadors.length === 0) {
        return Response.json({ error: 'Ambassador not found' }, { status: 404 });
      }
      const ambassador = ambassadors[0];
      const isOwner =
        user.dealer_id === ambassador.legacy_dealer_id ||
        user.email === ambassador.owner_email ||
        user.email === ambassador.contact_email ||
        ['admin', 'super_admin', 'root_admin'].includes(user.role);
      if (!isOwner) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      await base44.asServiceRole.entities.Ambassador.update(entity_id, {
        stripe_identity_verified: true,
        stripe_verification_session_id: session_id,
      });
    } else {
      const builders = await base44.asServiceRole.entities.Builder.filter({ id: entity_id });
      if (!builders || builders.length === 0) {
        return Response.json({ error: 'Builder not found' }, { status: 404 });
      }
      const builder = builders[0];
      const isOwner =
        user.email === builder.user_email ||
        ['admin', 'super_admin', 'root_admin'].includes(user.role);
      if (!isOwner) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      await base44.asServiceRole.entities.Builder.update(entity_id, {
        stripe_identity_verified: true,
        stripe_verification_session_id: session_id,
      });
    }

    return Response.json({
      success: true,
      status: 'verified',
      verified: true,
    });
  } catch (error) {
    console.error('verifyEntityIdentity error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});