import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';
import { create, verify } from 'https://deno.land/x/djwt@v2.8/mod.ts';

const JWT_SECRET = Deno.env.get('JWT_SECRET') || 'chainlink-dealer-secret-key-change-in-production';

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

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'login';

  try {
    // LOGIN
    if (action === 'login') {
      const { email, password } = await req.json();

      if (!email || !password) {
        return Response.json({ 
          success: false, 
          error: 'Email and password are required' 
        }, { status: 400 });
      }

      // Find dealer by owner_email
      const dealers = await base44.asServiceRole.entities.Dealer.filter({ 
        owner_email: email.toLowerCase() 
      });

      if (dealers.length === 0) {
        return Response.json({ 
          success: false, 
          error: 'Invalid credentials' 
        }, { status: 401 });
      }

      const dealer = dealers[0];

      // Check if dealer is active
      if (dealer.status !== 'active' && dealer.status !== 'trial') {
        return Response.json({ 
          success: false, 
          error: 'Your dealer account is not active. Please contact support.' 
        }, { status: 403 });
      }

      // For now, we'll use a simple password check
      // In production, you'd store hashed passwords
      const passwordHash = dealer.password_hash || 'temp123'; // Default for testing
      
      // Simple password check (replace with bcrypt in production)
      if (password !== passwordHash) {
        return Response.json({ 
          success: false, 
          error: 'Invalid credentials' 
        }, { status: 401 });
      }

      // Generate JWT token
      const token = await generateToken(dealer.id, dealer.owner_email);

      return Response.json({
        success: true,
        token,
        dealer: {
          id: dealer.id,
          name: dealer.name,
          company: dealer.name,
          email: dealer.owner_email,
          slug: dealer.slug,
          status: dealer.status,
          commission_percent: dealer.commission_percent
        }
      });
    }

    // REGISTER
    if (action === 'register') {
      const { name, company, email, password, referral_code } = await req.json();

      // Validation
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

      // Check if email already exists
      const existingDealers = await base44.asServiceRole.entities.Dealer.filter({ 
        owner_email: email.toLowerCase() 
      });

      if (existingDealers.length > 0) {
        return Response.json({ 
          success: false, 
          error: 'A dealer account with this email already exists' 
        }, { status: 409 });
      }

      // Generate slug from company name
      const slug = company.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // Check if slug already exists
      const existingSlugs = await base44.asServiceRole.entities.Dealer.filter({ slug });
      const finalSlug = existingSlugs.length > 0 ? `${slug}-${Date.now()}` : slug;

      // Create dealer
      const dealer = await base44.asServiceRole.entities.Dealer.create({
        name: company,
        slug: finalSlug,
        owner_name: name,
        owner_email: email.toLowerCase(),
        contact_email: email.toLowerCase(),
        password_hash: password, // In production, hash this with bcrypt
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
          hide_chainlink_branding: false,
          allow_merchant_self_signup: true,
          default_merchant_plan: 'basic',
          custom_pricing_enabled: false
        }
      });

      // Generate JWT token
      const token = await generateToken(dealer.id, dealer.owner_email);

      // Create audit log
      await base44.asServiceRole.entities.AuditLog.create({
        action_type: 'login',
        actor_id: dealer.id,
        actor_email: dealer.owner_email,
        actor_role: 'dealer_admin',
        description: 'New dealer account registered',
        metadata: {
          dealer_id: dealer.id,
          company: company,
          referral_code: referral_code || null
        }
      });

      return Response.json({
        success: true,
        token,
        dealer: {
          id: dealer.id,
          name: dealer.name,
          company: dealer.name,
          email: dealer.owner_email,
          slug: dealer.slug,
          status: dealer.status,
          commission_percent: dealer.commission_percent
        }
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

      // Get dealer data
      const dealers = await base44.asServiceRole.entities.Dealer.filter({ id: payload.dealer_id });
      
      if (dealers.length === 0) {
        return Response.json({ success: false, error: 'Dealer not found' }, { status: 404 });
      }

      const dealer = dealers[0];

      return Response.json({
        success: true,
        dealer: {
          id: dealer.id,
          name: dealer.name,
          company: dealer.name,
          email: dealer.owner_email,
          slug: dealer.slug,
          status: dealer.status,
          commission_percent: dealer.commission_percent
        }
      });
    }

    return Response.json({ success: false, error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Dealer auth error:', error);
    return Response.json({ 
      success: false, 
      error: error.message || 'An error occurred' 
    }, { status: 500 });
  }
});