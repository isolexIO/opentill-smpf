import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import Stripe from 'npm:stripe@17.4.0';
import { verify as verifyJwt } from 'https://deno.land/x/djwt@v2.8/mod.ts';

const JWT_SECRET = Deno.env.get('JWT_SECRET');

// Verify an Ambassador Hub dealerToken (email / Google / wallet sessions have
// no platform User, so they can't rely on base44.auth.me()).
async function verifyDealerToken(token) {
  if (!token || !JWT_SECRET) return null;
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    return await verifyJwt(token, key);
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_CONNECT_KEY') || Deno.env.get('STRIPE_SECRET_KEY'));
    const base44 = createClientFromRequest(req);

    const { ambassador_id, dealer_id, return_url, refresh_url, token } = await req.json();

    // Authorization: either a valid Ambassador Hub dealerToken (scoped to one
    // dealer_id) or a platform admin / matching dealer_admin via base44.auth.me().
    let authDealerId = null;
    let isPlatformAdmin = false;

    if (token) {
      const payload = await verifyDealerToken(token);
      if (!payload) return Response.json({ error: 'Invalid or expired session' }, { status: 401 });
      authDealerId = payload.dealer_id;
    } else {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      isPlatformAdmin = ['admin', 'super_admin', 'root_admin'].includes(user.role);
      if (!isPlatformAdmin) authDealerId = user.dealer_id;
    }

    // Resolve the Ambassador record to operate on.
    let ambassador;

    if (ambassador_id) {
      if (!isPlatformAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });
      ambassador = await base44.asServiceRole.entities.Ambassador.get(ambassador_id);
      if (!ambassador) return Response.json({ error: 'Ambassador not found' }, { status: 404 });
    } else if (dealer_id) {
      if (!isPlatformAdmin && authDealerId !== dealer_id) {
        return Response.json({ error: 'Forbidden: cannot manage another ambassador' }, { status: 403 });
      }
      const ambassadors = await base44.asServiceRole.entities.Ambassador.filter({ legacy_dealer_id: dealer_id });
      ambassador = ambassadors && ambassadors[0];
      if (!ambassador) return Response.json({ error: 'Ambassador not found' }, { status: 404 });
    } else {
      return Response.json({ error: 'ambassador_id or dealer_id is required' }, { status: 400 });
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