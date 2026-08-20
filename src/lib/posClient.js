import { base44 } from "@/api/base44Client";

// posClient — wraps the Base44 SDK so the POS page can operate under a
// PIN-only / magic-link virtual session (which has no platform User record
// and therefore no RLS context). When a `pinSessionToken` is present in
// localStorage, entity calls are routed through the `posGateway` backend
// function, which verifies the JWT and runs the operation with the service
// role scoped to the token's merchant_id. When no token is present (a real
// platform session exists, e.g. Google login), calls fall through to the
// normal SDK unchanged.
//
// Usage in POS.jsx: `import { posBase44 as base44 } from "@/lib/posClient";`
// All existing `base44.entities.<Entity>.<method>(...)` call sites work
// without modification.

const GATEWAY_ENTITIES = [
  'Merchant',
  'Product',
  'Customer',
  'Department',
  'Order',
  'OnlineOrder',
  'Station',
];

const INTERCEPTED_METHODS = new Set(['list', 'filter', 'get', 'create', 'update', 'delete']);

function getToken() {
  try {
    return localStorage.getItem('pinSessionToken');
  } catch {
    return null;
  }
}

async function gatewayInvoke(entity, method, args) {
  const pin_session_token = getToken();
  if (!pin_session_token) return null; // signal: fall through to real SDK
  const res = await base44.functions.invoke('posGateway', {
    operation: 'entity',
    pin_session_token,
    entity,
    method,
    args,
  });
  if (!res.data || !res.data.success) {
    throw new Error((res.data && res.data.error) || 'POS data operation failed');
  }
  return res.data.result;
}

function makeEntityProxy(name) {
  return new Proxy(
    {},
    {
      get(_target, method) {
        if (typeof method !== 'string') return undefined;
        if (INTERCEPTED_METHODS.has(method)) {
          return (...args) => {
            const token = getToken();
            if (token) {
              return gatewayInvoke(name, method, args);
            }
            // No virtual session — use the real SDK (platform session path).
            return base44.entities[name][method](...args);
          };
        }
        // Non-intercepted property access (e.g. schema()) — delegate to real SDK.
        return base44.entities[name][method];
      },
    }
  );
}

const entitiesProxy = new Proxy(base44.entities, {
  get(target, name) {
    if (GATEWAY_ENTITIES.includes(name)) {
      return makeEntityProxy(name);
    }
    return target[name];
  },
});

// Use a Proxy (not a spread) so getters like `asServiceRole` are only accessed
// when explicitly called — spreading base44 would eagerly invoke them and
// throw "Service token is required" because the client has no serviceToken.
export const posBase44 = new Proxy(base44, {
  get(target, prop) {
    if (prop === 'entities') return entitiesProxy;
    return target[prop];
  },
});