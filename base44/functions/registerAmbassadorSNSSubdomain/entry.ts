import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  Keypair,
  SystemProgram,
} from 'npm:@solana/web3.js@1.95.8';

// ---- Solana Name Service constants (mirrors @bonfida/spl-name-service) ----
const PARENT_DOMAIN = 'opentill'; // the parent .sol domain (without .sol)
const HASH_PREFIX = 'SPL Name Service';
const NAME_PROGRAM_ID = new PublicKey(
  'namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX'
);
// The .sol TLD name account — parent of every top-level .sol domain.
const ROOT_DOMAIN_ACCOUNT = new PublicKey(
  '58PwtjSDuFHuUkYjH9BYnnQKHfwo9reZhC2zMJv9JPkx'
);
const HEADER_LEN = 96; // NameRegistryState.HEADER_LEN
const SPACE = 2000; // subdomain data space (matches SDK default)

// ---- SNS hashing / derivation (raw, no SDK dependency) ----
const ZEROS32 = new Uint8Array(32);

async function sha256(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return new Uint8Array(digest);
}

function u32le(n) {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n >>> 0, true);
  return b;
}

function u64le(n) {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setBigUint64(0, BigInt(n), true);
  return b;
}

function concat(...arrs) {
  let len = 0;
  for (const a of arrs) len += a.length;
  const out = new Uint8Array(len);
  let o = 0;
  for (const a of arrs) {
    out.set(a, o);
    o += a.length;
  }
  return out;
}

// getHashedNameSync(name) = sha256("SPL Name Service" + name)
async function getHashedName(name) {
  const input = new TextEncoder().encode(HASH_PREFIX + name);
  return sha256(input);
}

// getNameAccountKeySync(hashedName, nameClass?, nameParent?)
function getNameAccountKey(hashedName, nameClass, nameParent) {
  const seeds = [
    hashedName,
    nameClass ? nameClass.toBytes() : ZEROS32,
    nameParent ? nameParent.toBytes() : ZEROS32,
  ];
  const [key] = PublicKey.findProgramAddressSync(seeds, NAME_PROGRAM_ID);
  return key;
}

// getDomainKeySync for "label.parent" subdomain → returns { parent, pubkey }
async function getSubdomainKeys(label, parentLabel) {
  const parentHashed = await getHashedName(parentLabel);
  const parentKey = getNameAccountKey(parentHashed, undefined, ROOT_DOMAIN_ACCOUNT);

  // subdomain leaf name is "\0" + label (the SDK prepends a 0-byte prefix)
  const subHashed = await getHashedName('\0' + label);
  const subKey = getNameAccountKey(subHashed, undefined, parentKey);
  return { parentKey, subKey, subHashed };
}

// Build the SPL Name Service Create (instruction 0) instruction.
function buildCreateInstruction({
  payer,
  nameKey,
  nameOwner,
  hashedName,
  lamports,
  space,
  parentKey,
  parentOwner,
}) {
  const data = concat(
    new Uint8Array([0]), // instruction discriminator
    u32le(hashedName.length),
    hashedName,
    u64le(lamports),
    u32le(space)
  );

  const keys = [
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system program
    { pubkey: payer, isSigner: true, isWritable: true }, // fee payer
    { pubkey: nameKey, isSigner: false, isWritable: true }, // new name account (PDA)
    { pubkey: nameOwner, isSigner: false, isWritable: false }, // owner of the new name
    { pubkey: new PublicKey(ZEROS32), isSigner: false, isWritable: false }, // class (none)
    { pubkey: parentKey, isSigner: false, isWritable: false }, // parent name
    { pubkey: parentOwner, isSigner: true, isWritable: false }, // parent owner (signs)
  ];

  return new TransactionInstruction({
    keys,
    programId: NAME_PROGRAM_ID,
    data,
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const isAdmin =
      user.role === 'admin' || user.role === 'super_admin' || user.role === 'root_admin';
    if (!isAdmin && user.role !== 'dealer_admin' && user.role !== 'ambassador') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const ambassador_id = body.ambassador_id;
    let subdomain = (body.subdomain || '').toString().toLowerCase().trim();

    if (!ambassador_id || !subdomain) {
      return Response.json(
        { error: 'ambassador_id and subdomain are required' },
        { status: 400 }
      );
    }

    // Strip any parent/TLD suffix the client may have included.
    if (subdomain.endsWith('.opentill.sol')) subdomain = subdomain.slice(0, -12);
    else if (subdomain.endsWith('.sol')) subdomain = subdomain.slice(0, -4);
    else if (subdomain.endsWith('.opentill')) subdomain = subdomain.slice(0, -9);

    if (!/^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(subdomain)) {
      return Response.json(
        {
          error:
            'Subdomain must be 3-32 chars: lowercase letters, numbers, and hyphens (no leading/trailing hyphen).',
        },
        { status: 400 }
      );
    }

    // Load ambassador (service role bypasses RLS; we enforce authorization manually).
    const ambassadors = await base44.asServiceRole.entities.Ambassador.filter({
      id: ambassador_id,
    });
    if (!ambassadors || ambassadors.length === 0) {
      return Response.json({ error: 'Ambassador not found' }, { status: 404 });
    }
    const ambassador = ambassadors[0];

    const isOwner =
      (ambassador.owner_email &&
        user.email &&
        ambassador.owner_email.toLowerCase() === user.email.toLowerCase()) ||
      (ambassador.legacy_dealer_id &&
        user.dealer_id &&
        ambassador.legacy_dealer_id === user.dealer_id);
    if (!isAdmin && !isOwner) {
      return Response.json({ error: 'Forbidden: not the ambassador owner' }, { status: 403 });
    }

    // Uniqueness across ambassadors.
    const existing = await base44.asServiceRole.entities.Ambassador.filter({
      opentill_subdomain: subdomain,
    });
    if (existing && existing.some((a) => a.id !== ambassador_id)) {
      return Response.json(
        { error: `Subdomain "${subdomain}.opentill.sol" is already taken.` },
        { status: 409 }
      );
    }

    // Solana connection.
    const network = Deno.env.get('SOLANA_NETWORK') || 'devnet';
    const rpcUrl =
      network === 'mainnet'
        ? 'https://api.mainnet-beta.solana.com'
        : 'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    // Authority keypair (parent domain owner / fee payer).
    const authoritySecretKey = Deno.env.get('SOLANA_AUTHORITY_PRIVATE_KEY');
    if (!authoritySecretKey) {
      return Response.json(
        { error: 'Server missing SOLANA_AUTHORITY_PRIVATE_KEY' },
        { status: 500 }
      );
    }
    const trimmed = authoritySecretKey.trim();
    let authoritySecretKeyBytes;
    if (trimmed.startsWith('[')) {
      authoritySecretKeyBytes = new Uint8Array(JSON.parse(trimmed));
    } else {
      const bs58 = await import('npm:bs58@5.0.0');
      authoritySecretKeyBytes = new Uint8Array(
        bs58.default ? bs58.default.decode(trimmed) : bs58.decode(trimmed)
      );
    }
    const authorityKeypair = Keypair.fromSecretKey(authoritySecretKeyBytes);

    // Derive parent + subdomain keys, verify the parent domain exists and is owned by the authority.
    const { parentKey, subKey, subHashed } = await getSubdomainKeys(subdomain, PARENT_DOMAIN);

    const parentInfo = await connection.getAccountInfo(parentKey);
    if (!parentInfo || !parentInfo.data || parentInfo.data.length < 64) {
      return Response.json(
        {
          error: `Parent domain ${PARENT_DOMAIN}.sol is not registered on ${network}. Register it with the authority wallet first.`,
        },
        { status: 400 }
      );
    }
    // NameRegistryState header: parentName(32) | owner(32) | class(32)
    const parentOwner = new PublicKey(parentInfo.data.slice(32, 64));
    if (!parentOwner.equals(authorityKeypair.publicKey)) {
      return Response.json(
        {
          error: `The authority wallet does not own ${PARENT_DOMAIN}.sol. Subdomain registration is not permitted.`,
        },
        { status: 403 }
      );
    }

    // Rent-exempt lamports for the subdomain name account (space + header).
    const lamports = await connection.getMinimumBalanceForRentExemption(SPACE + HEADER_LEN);

    const ix = buildCreateInstruction({
      payer: authorityKeypair.publicKey,
      nameKey: subKey,
      nameOwner: authorityKeypair.publicKey,
      hashedName: subHashed,
      lamports,
      space: SPACE,
      parentKey,
      parentOwner,
    });

    const transaction = new Transaction().add(ix);
    const signature = await connection.sendTransaction(transaction, [authorityKeypair]);
    await connection.confirmTransaction(signature);

    await base44.asServiceRole.entities.Ambassador.update(ambassador_id, {
      opentill_subdomain: subdomain,
      subdomain_status: 'active',
      subdomain_approved_at: new Date().toISOString(),
      subdomain_requested_at: ambassador.subdomain_requested_at || new Date().toISOString(),
      subdomain_wallet: authorityKeypair.publicKey.toBase58(),
    });

    return Response.json({
      success: true,
      subdomain: `${subdomain}.${PARENT_DOMAIN}.sol`,
      tx_signature: signature,
      owner: authorityKeypair.publicKey.toBase58(),
      network,
    });
  } catch (error) {
    console.error('registerAmbassadorSNSSubdomain error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});