import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import Stripe from 'npm:stripe@17.4.0';

const stripe = new Stripe(Deno.env.get('STRIPE_CONNECT_KEY') || Deno.env.get('STRIPE_SECRET_KEY'));

// Validate that a Stripe onboarding redirect URL points only to this app's
// own origin. External/invalid values fall back to the app root to prevent
// open-redirect / phishing via attacker-supplied return_url / refresh_url.
function safeRedirectUrl(candidate, appOrigin) {
  if (!candidate) return appOrigin + '/';
  try {
    const u = new URL(candidate, appOrigin);
    if (u.origin === appOrigin) return u.toString();
  } catch { /* invalid url */ }
  return appOrigin + '/';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Allow platform admins or dealer_admins. dealer_admins may only act on
    // their own dealer (IDOR protection); admins are exempt.
    const isAdmin = user.role === 'admin' || user.role === 'super_admin' || user.role === 'root_admin';
    if (!user || (user.role !== 'dealer_admin' && !isAdmin)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dealer_id, business_name, business_email, return_url, refresh_url } = await req.json();

    if (!isAdmin && user.dealer_id !== dealer_id) {
      return Response.json({ error: 'Forbidden: cannot create Stripe account for another dealer' }, { status: 403 });
    }

    // Create Stripe Connect account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: business_email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'company',
      company: {
        name: business_name,
      },
      metadata: {
        entity_type: 'dealer',
        entity_name: business_name,
        dealer_id,
      },
    });

    // Create account link for onboarding (redirect URLs restricted to app origin)
    const appOrigin = new URL(req.url).origin;
    const safeReturn = safeRedirectUrl(return_url, appOrigin);
    const safeRefresh = safeRedirectUrl(refresh_url, appOrigin);
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: safeRefresh,
      return_url: safeReturn,
      type: 'account_onboarding',
    });

    // Update ambassador with Stripe account ID (resolve by legacy dealer_id FK)
    const ambassadors = await base44.asServiceRole.entities.Ambassador.filter({ legacy_dealer_id: dealer_id });
    if (ambassadors && ambassadors.length > 0) {
      await base44.asServiceRole.entities.Ambassador.update(ambassadors[0].id, {
        stripe_account_id: account.id,
        stripe_connected: false // Will be true after onboarding
      });
    }

    return Response.json({
      success: true,
      account_id: account.id,
      onboarding_url: accountLink.url
    });
  } catch (error) {
    console.error('Stripe Connect error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});