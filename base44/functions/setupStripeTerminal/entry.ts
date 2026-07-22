import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import Stripe from 'npm:stripe@17.4.0';

// Parse a free-form merchant address string (e.g. "123 Main St, Toledo, OH 43604"
// or "123 Main St\nToledo, OH 43604") into the structured address Stripe Terminal
// requires. Falls back to Toledo, OH when the merchant has no usable address.
function parseMerchantAddress(raw) {
  const fallback = {
    line1: '1 Seagate',
    city: 'Toledo',
    state: 'OH',
    postal_code: '43604',
    country: 'US',
  };
  if (!raw || typeof raw !== 'string') return fallback;

  const parts = raw.split(/\n|,/).map((s) => s.trim()).filter(Boolean);
  const cityStateZip = /^(.+?)\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\s*$/;

  for (let i = 0; i < parts.length; i++) {
    const m = parts[i].match(cityStateZip);
    if (m) {
      return {
        line1: parts.slice(0, i).join(', ') || fallback.line1,
        city: m[1].trim(),
        state: m[2],
        postal_code: m[3],
        country: 'US',
      };
    }
  }
  return { ...fallback, line1: raw };
}

// Geolocate the requesting client by IP and return a US-formatted address.
// Used so a Stripe Terminal location reflects the merchant's actual location
// without requiring a structured address. Returns null on any failure.
async function geolocateRequest(req, line1Fallback) {
  const ip =
    (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip');
  if (!ip || ip === '127.0.0.1') return null;
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`);
    const data = await res.json();
    if (!data || data.success === false) return null;
    if (!data.city || !data.region_code || !data.postal) return null;
    return {
      line1: line1Fallback || `${data.city} Business Location`,
      city: data.city,
      state: data.region_code,
      postal_code: String(data.postal),
      country: (data.country_code || 'US').toUpperCase(),
    };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const stripeKey = Deno.env.get('STRIPE_CONNECT_KEY') || Deno.env.get('STRIPE_SECRET_KEY');
    const stripe = new Stripe(stripeKey);
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
        const dealers = await base44.asServiceRole.entities.Ambassador.filter({ legacy_dealer_id: merchant.dealer_id });
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
      const address =
        (await geolocateRequest(req, merchant.address)) ||
        parseMerchantAddress(merchant.address);
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