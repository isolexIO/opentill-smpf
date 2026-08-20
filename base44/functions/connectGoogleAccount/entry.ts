import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jwtVerify, createRemoteJWKSet } from 'npm:jose@5';

// connectGoogleAccount — lets any logged-in user (platform session OR PIN-only
// merchant) link a Google account to their record, even when the Google email
// differs from their POS login email. The frontend renders Google Identity
// Services (GIS), which returns a signed Google ID token; this function verifies
// the token against Google's JWKS, confirms the audience + that the email is
// verified, and stores the email on the caller's User (platform) or Merchant
// (PIN session) record.

const JWT_SECRET = Deno.env.get('JWT_SECRET');
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_JWKS_URI = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

const GOOGLE_JWKS = createRemoteJWKSet(new URL(GOOGLE_JWKS_URI));

function base64UrlDecode(str: string) {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function verifyPinSession(token: string) {
  if (!JWT_SECRET || !token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;
  let payload: any;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)));
  } catch {
    return null;
  }
  if (!payload || payload.type !== 'pin_session') return null;
  if (payload.exp && Math.floor(Date.now() / 1000) >= payload.exp) return null;
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signature = base64UrlDecode(sigB64);
    const valid = await crypto.subtle.verify('HMAC', key, signature, signingInput);
    return valid ? payload : null;
  } catch {
    return null;
  }
}

function fail(error: string, status = 400) {
  return Response.json({ success: false, error }, { status });
}

async function resolveCaller(base44: any, pinSessionToken?: string) {
  // PIN session first (covers PIN-only merchants with no platform User record)
  if (pinSessionToken) {
    const session = await verifyPinSession(pinSessionToken);
    if (session && session.merchant_id) {
      return { kind: 'merchant', id: session.merchant_id };
    }
  }
  // Otherwise a real platform session
  try {
    const user = await base44.auth.me();
    if (user && user.id) return { kind: 'user', id: user.id };
  } catch {
    /* not logged in via platform */
  }
  return null;
}

async function readCurrentEmail(base44: any, caller: { kind: string; id: string }) {
  const entity = caller.kind === 'merchant' ? 'Merchant' : 'User';
  const rec = await base44.asServiceRole.entities[entity].get(caller.id);
  return (rec && rec.google_email) || null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, id_token, pin_session_token } = body || {};

    // init — return the public client id (for GIS) + currently linked email
    if (action === 'init') {
      const caller = await resolveCaller(base44, pin_session_token);
      const google_email = caller ? await readCurrentEmail(base44, caller) : null;
      return Response.json({ success: true, client_id: GOOGLE_CLIENT_ID || null, google_email });
    }

    if (action === 'disconnect') {
      const caller = await resolveCaller(base44, pin_session_token);
      if (!caller) return fail('Not authenticated', 401);
      const entity = caller.kind === 'merchant' ? 'Merchant' : 'User';
      await base44.asServiceRole.entities[entity].update(caller.id, { google_email: '' });
      return Response.json({ success: true, google_email: null });
    }

    if (action !== 'connect') {
      return fail('Unknown action: ' + action);
    }

    if (!GOOGLE_CLIENT_ID) return fail('Google Client ID is not configured', 500);
    if (!id_token) return fail('Missing Google credential', 400);

    const caller = await resolveCaller(base44, pin_session_token);
    if (!caller) return fail('Not authenticated', 401);

    // Verify the Google ID token (signature via JWKS, audience, issuer, expiry)
    const { payload } = await jwtVerify(id_token, GOOGLE_JWKS, {
      issuer: GOOGLE_ISSUERS,
      audience: GOOGLE_CLIENT_ID,
    });

    if (!payload.email_verified) return fail('Google email is not verified', 400);
    const googleEmail = String(payload.email || '').toLowerCase().trim();
    if (!googleEmail) return fail('No email in Google credential', 400);

    const entity = caller.kind === 'merchant' ? 'Merchant' : 'User';
    await base44.asServiceRole.entities[entity].update(caller.id, { google_email: googleEmail });

    return Response.json({ success: true, google_email: googleEmail });
  } catch (error) {
    console.error('connectGoogleAccount error:', error);
    return fail(String(error?.message || 'Google verification failed'), 400);
  }
});