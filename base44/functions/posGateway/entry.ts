import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// posGateway (rev 2) — a secure data gateway for the POS when the operator is a
// PIN-only / magic-link merchant admin (no platform User record, therefore
// no platform session and no RLS context). The frontend POS proxy routes
// `base44.entities.<Entity>.<method>(...)` calls here when a pin_session_token
// is present in localStorage. This function verifies the HMAC-signed JWT
// (using built-in Web Crypto, no external deps), extracts the merchant_id,
// and performs the operation with the service role strictly scoped to that
// merchant so a cashier can never read or mutate another merchant's data.

const JWT_SECRET = Deno.env.get('JWT_SECRET');

const SUPPORTED_ENTITIES = new Set([
  'Merchant',
  'Product',
  'Customer',
  'Department',
  'Order',
  'OnlineOrder',
  'Station',
]);

const MERCHANT_SCOPED = new Set([
  'Product',
  'Customer',
  'Department',
  'Order',
  'OnlineOrder',
  'Station',
]);

function base64UrlDecode(str) {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function verifySession(token) {
  if (!JWT_SECRET || !token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;

  let payload;
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
    if (!valid) return null;
    return payload;
  } catch (e) {
    console.warn('posGateway: token verify failed:', e?.message);
    return null;
  }
}

function ok(result) {
  return Response.json({ success: true, result });
}

function fail(error, status = 400) {
  return Response.json({ success: false, error }, { status });
}

function scopeQuery(entity, merchantId, query) {
  const q = { ...(query || {}) };
  if (entity === 'Merchant') {
    q.id = merchantId;
  } else if (MERCHANT_SCOPED.has(entity)) {
    q.merchant_id = merchantId;
  }
  return q;
}

function scopeCreate(entity, merchantId, dealerId, data) {
  const d = { ...(data || {}) };
  if (entity === 'Merchant') return d;
  if (MERCHANT_SCOPED.has(entity)) {
    d.merchant_id = merchantId;
    if (dealerId && d.dealer_id === undefined) d.dealer_id = dealerId;
  }
  return d;
}

async function assertOwnsId(base44, entity, id, merchantId) {
  if (entity === 'Merchant') {
    if (id !== merchantId) throw new Error('Forbidden: merchant mismatch');
    return;
  }
  const rec = await base44.asServiceRole.entities[entity].get(id);
  if (!rec) throw new Error('Record not found');
  if (MERCHANT_SCOPED.has(entity) && rec.merchant_id !== merchantId) {
    throw new Error('Forbidden: record does not belong to this merchant');
  }
}

async function handleEntity(base44, entity, method, args, merchantId, dealerId) {
  if (!SUPPORTED_ENTITIES.has(entity)) {
    throw new Error('Unsupported entity: ' + entity);
  }
  const sr = base44.asServiceRole.entities[entity];

  switch (method) {
    case 'list': {
      const [sort, limit] = args || [];
      return await sr.filter(scopeQuery(entity, merchantId, {}), sort, limit);
    }
    case 'filter': {
      const [query, sort, limit] = args || [];
      return await sr.filter(scopeQuery(entity, merchantId, query), sort, limit);
    }
    case 'get': {
      const [id] = args || [];
      const rec = await sr.get(id);
      if (!rec) return rec;
      if (entity === 'Merchant') {
        if (rec.id !== merchantId) throw new Error('Forbidden: merchant mismatch');
      } else if (MERCHANT_SCOPED.has(entity) && rec.merchant_id !== merchantId) {
        throw new Error('Forbidden: record does not belong to this merchant');
      }
      return rec;
    }
    case 'create': {
      const [data] = args || [];
      return await sr.create(scopeCreate(entity, merchantId, dealerId, data));
    }
    case 'update': {
      const [id, data] = args || [];
      await assertOwnsId(base44, entity, id, merchantId);
      return await sr.update(id, data || {});
    }
    case 'delete': {
      const [id] = args || [];
      await assertOwnsId(base44, entity, id, merchantId);
      return await sr.delete(id);
    }
    default:
      throw new Error('Unsupported method: ' + method);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { operation, pin_session_token } = body || {};

    const session = await verifySession(pin_session_token);
    if (!session) return fail('Unauthorized', 401);

    const merchantId = session.merchant_id;
    if (!merchantId) return fail('No merchant context in session', 403);
    const dealerId = session.dealer_id || null;

    if (operation === 'entity') {
      const { entity, method, args } = body;
      const result = await handleEntity(base44, entity, method, args, merchantId, dealerId);
      return ok(result);
    }

    return fail('Unknown operation: ' + operation);
  } catch (error) {
    console.error('posGateway error:', error);
    const msg = String(error?.message || '');
    const status = msg.startsWith('Forbidden') ? 403
      : msg.startsWith('Unauthorized') ? 401 : 500;
    return fail(msg || 'Gateway error', status);
  }
});