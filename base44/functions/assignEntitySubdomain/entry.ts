import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Assigns / regenerates / disables the auto <businessName>.openTILL.io DNS
// subdomain for a merchant, ambassador, or builder. This is the single
// subdomain system for openTILL identity — no on-chain mint required.

const PARENT_DOMAIN = 'openTILL.io';
const ENTITY_BY_TYPE = {
  merchant: 'Merchant',
  ambassador: 'Ambassador',
  builder: 'Builder',
};

function slugifyName(name) {
  return (
    (name || '')
      .toLowerCase()
      .trim()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 32) || 'site'
  );
}

async function isSubdomainTaken(base44, slug, excludeId) {
  for (const entity of Object.values(ENTITY_BY_TYPE)) {
    const matches = await base44.asServiceRole.entities[entity].filter({
      opentill_subdomain: slug,
    });
    if (matches && matches.some((m) => m.id !== excludeId)) return true;
  }
  return false;
}

async function assignUnique(base44, entityType, entityId, name) {
  const entity = ENTITY_BY_TYPE[entityType];
  const base = slugifyName(name);
  let slug = base;
  let counter = 1;
  while (await isSubdomainTaken(base44, slug, entityId)) {
    slug = `${base}-${counter}`.substring(0, 32);
    counter++;
    if (counter > 50) break;
  }
  const now = new Date().toISOString();
  await base44.asServiceRole.entities[entity].update(entityId, {
    opentill_subdomain: slug,
    subdomain_status: 'active',
    subdomain_requested_at: now,
    subdomain_approved_at: now,
  });
  return slug;
}

function isOwnerOf(entityType, owner, user) {
  if (entityType === 'ambassador') {
    return (
      (owner.owner_email &&
        user.email &&
        owner.owner_email.toLowerCase() === user.email.toLowerCase()) ||
      (owner.legacy_dealer_id &&
        user.dealer_id &&
        owner.legacy_dealer_id === user.dealer_id)
    );
  }
  if (entityType === 'merchant') {
    return (
      (owner.owner_email &&
        user.email &&
        owner.owner_email.toLowerCase() === user.email.toLowerCase()) ||
      (user.merchant_id && user.merchant_id === owner.id)
    );
  }
  if (entityType === 'builder') {
    return (
      owner.user_email &&
      user.email &&
      owner.user_email.toLowerCase() === user.email.toLowerCase()
    );
  }
  return false;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const isAdmin = ['admin', 'super_admin', 'root_admin'].includes(user.role);

    let body = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const { entity_type, entity_id, force, disable } = body;
    if (!ENTITY_BY_TYPE[entity_type] || !entity_id) {
      return Response.json(
        {
          error:
            'entity_type (merchant|ambassador|builder) and entity_id are required',
        },
        { status: 400 }
      );
    }

    const entity = ENTITY_BY_TYPE[entity_type];
    const list = await base44.asServiceRole.entities[entity].filter({
      id: entity_id,
    });
    const owner = list && list[0];
    if (!owner)
      return Response.json({ error: `${entity_type} not found` }, { status: 404 });
    if (!isAdmin && !isOwnerOf(entity_type, owner, user)) {
      return Response.json({ error: 'Forbidden: not the owner' }, { status: 403 });
    }

    // Disable path (admin only): mark the existing subdomain disabled.
    if (disable) {
      if (!isAdmin)
        return Response.json({ error: 'Admin required to disable' }, { status: 403 });
      await base44.asServiceRole.entities[entity].update(entity_id, {
        subdomain_status: 'disabled',
      });
      return Response.json({
        success: true,
        subdomain: owner.opentill_subdomain
          ? `${owner.opentill_subdomain}.${PARENT_DOMAIN}`
          : null,
        status: 'disabled',
      });
    }

    // Idempotent: if an active subdomain already exists and we're not forcing,
    // just return it.
    if (owner.opentill_subdomain && owner.subdomain_status === 'active' && !force) {
      return Response.json({
        success: true,
        subdomain: `${owner.opentill_subdomain}.${PARENT_DOMAIN}`,
        status: 'active',
      });
    }

    const name =
      entity_type === 'builder'
        ? owner.company_name || owner.full_name
        : owner.business_name || owner.name;
    const slug = await assignUnique(base44, entity_type, entity_id, name);
    return Response.json({
      success: true,
      subdomain: `${slug}.${PARENT_DOMAIN}`,
      status: 'active',
    });
  } catch (error) {
    console.error('assignEntitySubdomain error:', error);
    return Response.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
});