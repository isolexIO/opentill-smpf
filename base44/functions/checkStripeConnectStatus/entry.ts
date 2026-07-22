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
    const { dealer_id, account_id, token } = await req.json();

    // Authorization: Ambassador Hub dealerToken, or platform admin / matching
    // dealer_admin via base44.auth.me(). Prevents IDOR on another dealer's
    // Stripe connection state.
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

    if (!isPlatformAdmin && authDealerId !== dealer_id) {
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