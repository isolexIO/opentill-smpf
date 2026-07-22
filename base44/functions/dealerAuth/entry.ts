import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import bcrypt from 'npm:bcryptjs@2.4.3';
import { create, verify } from 'https://deno.land/x/djwt@v2.8/mod.ts';
import { PublicKey } from 'npm:@solana/web3.js@1.95.8';
import nacl from 'npm:tweetnacl@1.0.3';

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

// Build a user-like object so the frontend (DealerDashboard) can treat the
// ambassador session the same way it treats a platform User stored in
// pinLoggedInUser. Role is 'ambassador' and dealer_id is bridged so the
// dashboard can load the ambassador's record.
function buildUser(ambassador) {
  const dealerId = ambassador.legacy_dealer_id || ambassador.id;
  return {
    id: ambassador.id,
    email: ambassador.owner_email,
    full_name: ambassador.owner_name || ambassador.name,
    role: 'ambassador',
    dealer_id: dealerId
  };
}

function makeSlug(seed) {
  const base = (seed || 'ambassador')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 30) || 'ambassador';
  return `${base}-${Date.now().toString(36)}`;
}

const DEFAULT_AMBASSADOR_FIELDS = {
  status: 'active',
  primary_color: '#7B2FD6',
  secondary_color: '#0FD17A',
  commission_percent: 15,
  platform_fee_monthly: 0,
  payout_method: 'stripe_connect',
  payout_minimum: 20,
  payout_cadence: 'monthly',
  payout_hold_days: 7,
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
};

async function verifySolanaSignature(walletAddress, signatureData) {
  if (!signatureData || !signatureData.message) {
    return { ok: false, error: 'signature_data with message is required' };
  }
  // Freshness / replay protection
  const FRESHNESS_WINDOW_MS = 5 * 60 * 1000;
  const tsMatch = typeof signatureData.message === 'string'
    && signatureData.message.match(/Timestamp:\s*(\d+)/);
  if (!tsMatch) {
    return { ok: false, error: 'Missing timestamp in signed message' };
  }
  const msgTime = parseInt(tsMatch[1], 10);
  if (!Number.isFinite(msgTime) || Math.abs(Date.now() - msgTime) > FRESHNESS_WINDOW_MS) {
    return { ok: false, error: 'Signature timestamp expired or invalid' };
  }
  const walletMatch = typeof signatureData.message === 'string'
    && signatureData.message.match(/Wallet:\s*([A-Za-z0-9]+)/);
  if (walletMatch && walletMatch[1].toLowerCase() !== walletAddress.toLowerCase()) {
    return { ok: false, error: 'Signed message does not bind to this wallet' };
  }
  try {
    const publicKey = new PublicKey(walletAddress);
    const messageBytes = new TextEncoder().encode(signatureData.message);
    const signatureBytes = new Uint8Array(signatureData.signature);
    const valid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKey.toBytes());
    if (!valid) return { ok: false, error: 'Invalid wallet signature' };
    return { ok: true };
  } catch (e) {
    console.error('Solana signature verification error:', e);
    return { ok: false, error: 'Invalid wallet signature' };
  }
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
          error: 'No password set for this account. Use Google or wallet sign-in, or ask an admin to set a password.'
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
        dealer: publicAmbassador(ambassador),
        user: buildUser(ambassador)
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
        ...DEFAULT_AMBASSADOR_FIELDS,
        name: company,
        slug: finalSlug,
        owner_name: name,
        owner_email: email.toLowerCase(),
        contact_email: email.toLowerCase(),
        password_hash: passwordHash
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
        dealer: publicAmbassador(ambassador),
        user: buildUser(ambassador)
      });
    }

    // GOOGLE AUTH (sign-in or sign-up)
    // Called after the platform Google OAuth flow completes; relies on
    // base44.auth.me() to identify the Google user.
    if (action === 'google_auth') {
      let me;
      try {
        me = await base44.auth.me();
      } catch {
        me = null;
      }
      if (!me || !me.email) {
        return Response.json({
          success: false,
          error: 'Google authentication required. Please sign in with Google first.'
        }, { status: 401 });
      }

      const email = me.email.toLowerCase().trim();
      const ambassadors = await base44.asServiceRole.entities.Ambassador.filter({
        owner_email: email
      });

      let ambassador;
      let isNew = false;

      if (ambassadors.length > 0) {
        ambassador = ambassadors[0];
      } else {
        // Sign-up via Google — create a new ambassador record
        const company = me.full_name ? `${me.full_name}'s POS` : 'Ambassador';
        const slug = makeSlug(company);
        const existingSlugs = await base44.asServiceRole.entities.Ambassador.filter({ slug });
        const finalSlug = existingSlugs.length > 0 ? `${slug}-${Date.now().toString(36)}` : slug;

        ambassador = await base44.asServiceRole.entities.Ambassador.create({
          ...DEFAULT_AMBASSADOR_FIELDS,
          name: company,
          slug: finalSlug,
          owner_name: me.full_name || '',
          owner_email: email,
          contact_email: email
        });
        await base44.asServiceRole.entities.Ambassador.update(ambassador.id, {
          legacy_dealer_id: ambassador.id
        });
        isNew = true;
      }

      if (ambassador.status !== 'active' && ambassador.status !== 'trial') {
        return Response.json({
          success: false,
          error: 'Your ambassador account is not active. Please contact support.'
        }, { status: 403 });
      }

      const dealerId = ambassador.legacy_dealer_id || ambassador.id;
      const token = await generateToken(dealerId, ambassador.owner_email);

      return Response.json({
        success: true,
        token,
        dealer: publicAmbassador(ambassador),
        user: buildUser(ambassador),
        is_new_user: isNew
      });
    }

    // SOLANA WALLET AUTH (sign-in or sign-up)
    if (action === 'wallet_auth') {
      const { wallet_address, wallet_type, signature_data } = body;

      if (!wallet_address) {
        return Response.json({
          success: false,
          error: 'wallet_address is required'
        }, { status: 400 });
      }

      const verifyResult = await verifySolanaSignature(wallet_address, signature_data || {});
      if (!verifyResult.ok) {
        return Response.json({
          success: false,
          error: verifyResult.error
        }, { status: 401 });
      }

      // Look up ambassador by linked Solana wallet
      let ambassadors = await base44.asServiceRole.entities.Ambassador.filter({
        solana_wallet_address: wallet_address
      });

      let ambassador;
      let isNew = false;

      if (ambassadors.length > 0) {
        ambassador = ambassadors[0];
      } else {
        // Sign-up via wallet — create a new ambassador record linked to this wallet
        const pseudoEmail = `${wallet_address.toLowerCase()}@solana.opentill`;
        const byEmail = await base44.asServiceRole.entities.Ambassador.filter({
          owner_email: pseudoEmail
        });
        if (byEmail.length > 0) {
          ambassador = byEmail[0];
          // ensure wallet is linked
          if (!ambassador.solana_wallet_address) {
            await base44.asServiceRole.entities.Ambassador.update(ambassador.id, {
              solana_wallet_address: wallet_address
            });
            ambassador.solana_wallet_address = wallet_address;
          }
        } else {
          const slug = makeSlug('solana-ambassador');
          ambassador = await base44.asServiceRole.entities.Ambassador.create({
            ...DEFAULT_AMBASSADOR_FIELDS,
            name: 'Solana Ambassador',
            slug,
            owner_name: 'Solana Ambassador',
            owner_email: pseudoEmail,
            contact_email: pseudoEmail,
            solana_wallet_address: wallet_address
          });
          await base44.asServiceRole.entities.Ambassador.update(ambassador.id, {
            legacy_dealer_id: ambassador.id
          });
          isNew = true;
        }
      }

      if (ambassador.status !== 'active' && ambassador.status !== 'trial') {
        return Response.json({
          success: false,
          error: 'Your ambassador account is not active. Please contact support.'
        }, { status: 403 });
      }

      const dealerId = ambassador.legacy_dealer_id || ambassador.id;
      const token = await generateToken(dealerId, ambassador.owner_email);

      return Response.json({
        success: true,
        token,
        dealer: publicAmbassador(ambassador),
        user: buildUser(ambassador),
        is_new_user: isNew
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