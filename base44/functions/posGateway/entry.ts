import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { verify } from 'https://deno.land/x/djwt@v2.8/mod.ts';

// posGateway — a secure data gateway for the POS when the operator is a
// PIN-only / magic-link merchant admin (no platform User record, therefore
// no platform session and no RLS context). The frontend POS proxy routes
// `base44.entities.<Entity>.<method>(...)` calls here when a pin_session_token
// is present in localStorage. This function verifies the HMAC-signed JWT,
// extracts the merchant_id, and performs the operation with the service role
// strictly scoped to that merchant so a cashier can never read or mutate
// another merchant's data.

const JWT_SECRET = Deno.env.get('JWT_SECRET');

// Entities the POS is allowed to touch through this gateway. Anything else
// is rejected so the endpoint can't be abused as a generic data API.
const SUPPORTED_ENTITIES = new Set([
  'Merchant',
  'Product',
  'Customer',
  'Department',
  'Order',
  'OnlineOrder',
  'Station',
]);

// Entities that carry a merchant_id field used for scoping.
const MERCHANT_SCOPED = new Set([
  'Product',
  'Customer',
  'Department',
  'Order',
  'OnlineOrder',
  'Station',
]);

async function verifySession(token) {
  if (!JWT_SECRET || !token) return null;
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const payload = await verify(token, key);
    if (!payload || payload.type !== 'pin_session') return null;
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

// Force the merchant scope onto a query so a client can never read another
// merchant's rows by omitting/overriding merchant_id.
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
  if (entity === 'Merchant') {
    return d; // Merchant creates are not initiated from the POS.
  }
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
      const query = scopeQuery(entity, merchantId, {});
      return await sr.filter(query, sort, limit);
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
    const status = String(error?.message || '').startsWith('Forbidden') ? 403
      : String(error?.message || '').startsWith('Unauthorized') ? 401 : 500;
    return fail(error?.message || 'Gateway error', status);
  }
});