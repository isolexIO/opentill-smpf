import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import Stripe from 'npm:stripe@17.4.0';

Deno.serve(async (req) => {
  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    const stripe = new Stripe(stripeKey);
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { merchant_id, return_url } = await req.json();
    if (!merchant_id) return Response.json({ error: 'merchant_id is required' }, { status: 400 });

    // Authorization: platform admin or the merchant themselves
    if (user.role !== 'admin' && user.merchant_id !== merchant_id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const merchant = await base44.asServiceRole.entities.Merchant.get(merchant_id);
    if (!merchant) return Response.json({ error: 'Merchant not found' }, { status: 404 });

    // Require openTILL Payments to be connected first
    const stripeAccountId = merchant.settings?.payment_gateways?.stripe?.account_id;
    if (!stripeAccountId) {
      return Response.json({ error: 'Connect your openTILL Payments account first.' }, { status: 400 });
    }

    // Don't allow re-enrollment if already has a card on file
    if (merchant.settings?.reader_program?.payment_method_id) {
      return Response.json({ error: 'A card is already on file for the reader program.' }, { status: 400 });
    }

    // Validate redirect URL against app origin
    const appOrigin = new URL(req.url).origin;
    const safeUrl = (u) => {
      if (!u || typeof u !== 'string') return null;
      try {
        const parsed = new URL(u, appOrigin);
        return parsed.origin === appOrigin ? parsed.href : null;
      } catch { return null; }
    };
    const safeReturnUrl = safeUrl(return_url) || `${appOrigin}/OpenTILLPayments?tab=connection`;

    // Create a Stripe Checkout Session in setup mode to collect card details
    // The card is saved for later off-session charge if the reader is not returned
    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      payment_method_types: ['card'],
      success_url: `${safeReturnUrl}${safeReturnUrl.includes('?') ? '&' : '?'}reader_deposit=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${safeReturnUrl}${safeReturnUrl.includes('?') ? '&' : '?'}reader_deposit=cancelled`,
      metadata: {
        merchant_id,
        purpose: 'reader_deposit',
      },
      customer_email: merchant.owner_email || undefined,
      description: 'Card on file for free Stripe Reader M2 — $100 fee applies if not returned within 30 days of cancellation',
    });

    return Response.json({
      success: true,
      checkout_url: session.url,
      session_id: session.id,
    });
  } catch (error) {
    console.error('setupReaderDeposit error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});