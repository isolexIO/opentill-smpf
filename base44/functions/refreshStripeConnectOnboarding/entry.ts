import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import Stripe from 'npm:stripe@17.4.0';
import { verify as verifyJwt } from 'https://deno.land/x/djwt@v2.8/mod.ts';

const JWT_SECRET = Deno.env.get('JWT_SECRET');
const stripe = new Stripe(Deno.env.get('STRIPE_CONNECT_KEY') || Deno.env.get('STRIPE_SECRET_KEY'));

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
    const base44 = createClientFromRequest(req);
    const { account_id, return_url, refresh_url, token } = await req.json();

    // Authorization: Ambassador Hub dealerToken, or platform admin / matching
    // dealer_admin via base44.auth.me(). (Account refresh must use the same
    // Stripe key the account was created under — STRIPE_CONNECT_KEY.)
    let isPlatformAdmin = false;
    let authDealerId = null;

    if (token) {
      const payload = await verifyDealerToken(token);
      if (!payload) return Response.json({ error: 'Invalid or expired session' }, { status: 401 });
      authDealerId = payload.dealer_id;
    } else {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      isPlatformAdmin = ['admin', 'super_admin', 'root_admin'].includes(user.role);
      if (!isPlatformAdmin) {
        if (user.role !== 'dealer_admin') {
          return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        authDealerId = user.dealer_id;
      }
    }

    // If a dealerToken or dealer_admin session is used, bind the refresh to
    // their own ambassador account id so they can't refresh another dealer's
    // onboarding link.
    if (!isPlatformAdmin && authDealerId) {
      const ambassadors = await base44.asServiceRole.entities.Ambassador.filter({ legacy_dealer_id: authDealerId });
      const own = ambassadors && ambassadors[0];
      if (!own || own.stripe_account_id !== account_id) {
        return Response.json({ error: 'Forbidden: account does not belong to this ambassador' }, { status: 403 });
      }
    }

    // Create new account link
    const accountLink = await stripe.accountLinks.create({
      account: account_id,
      refresh_url: refresh_url || return_url,
      return_url: return_url,
      type: 'account_onboarding',
    });

    return Response.json({
      success: true,
      onboarding_url: accountLink.url
    });
  } catch (error) {
    console.error('Refresh onboarding error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});