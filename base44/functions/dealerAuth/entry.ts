import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import bcrypt from 'npm:bcryptjs@2.4.3';
import { create, verify } from 'https://deno.land/x/djwt@v2.8/mod.ts';

const JWT_SECRET = Deno.env.get('JWT_SECRET');

if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not configured');
  throw new Error('Server configuration error. Contact administrator to set JWT_SECRET.');
}

// The Dealer entity has been consolidated into Ambassador. The "dealer_id" that
// flows through JWTs, user records, and child-entity foreign keys is the
// Ambassador's `legacy_dealer_id` (the original Dealer id for migrated records,
// or the Ambassador's own id for new records).
async function generateToken(dealerId, email) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const payload = {
    dealer_id: dealerId,
    email: email,
    exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days
  };

  return await create({ alg: 'HS256', typ: 'JWT' }, payload, key);
}

async function verifyToken(token) {
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const payload = await verify(token, key);
    return payload;
  } catch (e) {
    return null;
  }
}

function publicAmbassador(record) {
  const id = record.legacy_dealer_id || record.id;
  return {
    id,
    name: record.name,
    company: record.name,
    email: record.owner_email,
    slug: record.slug,
    status: record.status,
    commission_percent: record.commission_percent
  };
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const body = await req.json();
    const action = body.action || 'login';

    // LOGIN
    if (action === 'login') {
      const { email, password } = body;

      if (!email || !password) {
        return Response.json({
          success: false,
          error: 'Email and password are required'
        }, { status: 400 });
      }

      const ambassadors = await base44.asServiceRole.entities.Ambassador.filter({
        owner_email: email.toLowerCase()
      });

      if (ambassadors.length === 0) {
        return Response.json({
          success: false,
          error: 'Invalid credentials'
        }, { status: 401 });
      }

      const ambassador = ambassadors[0];

      if (ambassador.status !== 'active' && ambassador.status !== 'trial') {
        return Response.json({
          success: false,
          error: 'Your ambassador account is not active. Please contact support.'
        }, { status: 403 });
      }

      if (!ambassador.password_hash) {
        return Response.json({
          success: false,
          error: 'Invalid credentials'
        }, { status: 401 });
      }

      const isValidPassword = bcrypt.compareSync(password, ambassador.password_hash);

      if (!isValidPassword) {
        return Response.json({
          success: false,
          error: 'Invalid credentials'
        }, { status: 401 });
      }

      const dealerId = ambassador.legacy_dealer_id || ambassador.id;
      const token = await generateToken(dealerId, ambassador.owner_email);

      return Response.json({
        success: true,
        token,
        dealer: publicAmbassador(ambassador)
      });
    }

    // REGISTER
    if (action === 'register') {
      const { name, company, email, password, referral_code } = body;

      if (!name || !company || !email || !password) {
        return Response.json({
          success: false,
          error: 'All fields are required'
        }, { status: 400 });
      }

      if (password.length < 8) {
        return Response.json({
          success: false,
          error: 'Password must be at least 8 characters'
        }, { status: 400 });
      }

      const existing = await base44.asServiceRole.entities.Ambassador.filter({
        owner_email: email.toLowerCase()
      });

      if (existing.length > 0) {
        return Response.json({
          success: false,
          error: 'An ambassador account with this email already exists'
        }, { status: 409 });
      }

      const slug = company.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const existingSlugs = await base44.asServiceRole.entities.Ambassador.filter({ slug });
      const finalSlug = existingSlugs.length > 0 ? `${slug}-${Date.now()}` : slug;

      const passwordHash = bcrypt.hashSync(password, 10);

      const ambassador = await base44.asServiceRole.entities.Ambassador.create({
        name: company,
        slug: finalSlug,
        owner_name: name,
        owner_email: email.toLowerCase(),
        contact_email: email.toLowerCase(),
        password_hash: passwordHash,
        status: 'trial',
        trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        primary_color: '#7B2FD6',
        secondary_color: '#0FD17A',
        commission_percent: 15,
        platform_fee_monthly: 99,
        payout_method: 'stripe_connect',
        payout_minimum: 20,
        payout_cadence: 'monthly',
        payout_enabled: false,
        billing_mode: 'root_fallback',
        stripe_connected: false,
        total_merchants: 0,
        total_revenue_generated: 0,
        commission_earned: 0,
        commission_paid_out: 0,
        commission_pending: 0,
        settings: {
          hide_opentill_branding: false,
          allow_merchant_self_signup: true,
          default_merchant_plan: 'basic',
          custom_pricing_enabled: false
        }
      });

      // Bridge legacy dealer_id foreign keys to this ambassador.
      await base44.asServiceRole.entities.Ambassador.update(ambassador.id, { legacy_dealer_id: ambassador.id });

      const dealerId = ambassador.id;
      const token = await generateToken(dealerId, ambassador.owner_email);

      await base44.asServiceRole.entities.AuditLog.create({
        action_type: 'login',
        actor_id: dealerId,
        actor_email: ambassador.owner_email,
        actor_role: 'dealer_admin',
        description: 'New ambassador account registered',
        metadata: {
          ambassador_id: ambassador.id,
          company: company,
          referral_code: referral_code || null
        }
      });

      return Response.json({
        success: true,
        token,
        dealer: publicAmbassador(ambassador)
      });
    }

    // VERIFY TOKEN
    if (action === 'verify') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return Response.json({ success: false, error: 'No token provided' }, { status: 401 });
      }

      const token = authHeader.replace('Bearer ', '');
      const payload = await verifyToken(token);

      if (!payload) {
        return Response.json({ success: false, error: 'Invalid or expired token' }, { status: 401 });
      }

      const ambassadors = await base44.asServiceRole.entities.Ambassador.filter({ legacy_dealer_id: payload.dealer_id });

      if (ambassadors.length === 0) {
        return Response.json({ success: false, error: 'Ambassador not found' }, { status: 404 });
      }

      return Response.json({
        success: true,
        dealer: publicAmbassador(ambassadors[0])
      });
    }

    return Response.json({ success: false, error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Ambassador auth error:', error);
    return Response.json({
      success: false,
      error: error.message || 'An error occurred'
    }, { status: 500 });
  }
});