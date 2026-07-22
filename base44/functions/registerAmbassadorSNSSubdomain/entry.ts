import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  Keypair,
  SystemProgram,
} from 'npm:@solana/web3.js@1.95.8';

// ---- Solana Name Service constants ----
const PARENT_DOMAIN = 'opentill'; // parent .sol domain (without .sol)
const HASH_PREFIX = 'SPL Name Service';
const NAME_PROGRAM_ID = new PublicKey(
  'namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX'
);
const ROOT_DOMAIN_ACCOUNT = new PublicKey(
  '58PwtjSDuFHuUkYjH9BYnnQKHfwo9reZhC2zMJv9JPkx'
);
const HEADER_LEN = 96; // NameRegistryState.HEADER_LEN
// Ownership-only subdomain (header only). Rent is paid by the user's wallet.
const SPACE = 0;
const ZEROS32 = new Uint8Array(32);

const ENTITY_BY_TYPE = {
  ambassador: 'Ambassador',
  merchant: 'Merchant',
  builder: 'Builder',
};

// ---- SNS hashing / derivation (raw) ----
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
async function getHashedName(name) {
  return sha256(new TextEncoder().encode(HASH_PREFIX + name));
}
function getNameAccountKey(hashedName, nameClass, nameParent) {
  const seeds = [
    hashedName,
    nameClass ? nameClass.toBytes() : ZEROS32,
    nameParent ? nameParent.toBytes() : ZEROS32,
  ];
  const [key] = PublicKey.findProgramAddressSync(seeds, NAME_PROGRAM_ID);
  return key;
}
async function getSubdomainKeys(label, parentLabel) {
  const parentHashed = await getHashedName(parentLabel);
  const parentKey = getNameAccountKey(parentHashed, undefined, ROOT_DOMAIN_ACCOUNT);
  const subHashed = await getHashedName('\0' + label);
  const subKey = getNameAccountKey(subHashed, undefined, parentKey);
  return { parentKey, subKey, subHashed };
}
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
    new Uint8Array([0]),
    u32le(hashedName.length),
    hashedName,
    u64le(lamports),
    u32le(space)
  );
  const keys = [
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: nameKey, isSigner: false, isWritable: true },
    { pubkey: nameOwner, isSigner: false, isWritable: false },
    { pubkey: new PublicKey(ZEROS32), isSigner: false, isWritable: false },
    { pubkey: parentKey, isSigner: false, isWritable: false },
    { pubkey: parentOwner, isSigner: true, isWritable: false },
  ];
  return new TransactionInstruction({ keys, programId: NAME_PROGRAM_ID, data });
}
function toBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function validateSubdomain(s) {
  if (!s) return 'Subdomain is required.';
  if (/[.\s\u0000-\u001F]/.test(s))
    return 'Subdomain cannot contain dots, spaces, or control characters.';
  const chars = Array.from(s);
  if (chars.length < 3 || chars.length > 32)
    return 'Subdomain must be 3-32 characters (emojis count).';
  if (s.startsWith('-') || s.endsWith('-'))
    return 'Subdomain cannot start or end with a hyphen.';
  return null;
}

function isOwnerOf(ownerType, owner, user) {
  if (ownerType === 'ambassador') {
    return (
      (owner.owner_email &&
        user.email &&
        owner.owner_email.toLowerCase() === user.email.toLowerCase()) ||
      (owner.legacy_dealer_id &&
        user.dealer_id &&
        owner.legacy_dealer_id === user.dealer_id)
    );
  }
  if (ownerType === 'merchant') {
    return (
      (owner.owner_email &&
        user.email &&
        owner.owner_email.toLowerCase() === user.email.toLowerCase()) ||
      (user.merchant_id && user.merchant_id === owner.id)
    );
  }
  if (ownerType === 'builder') {
    return (
      owner.user_email &&
      user.email &&
      owner.user_email.toLowerCase() === user.email.toLowerCase()
    );
  }
  return false;
}

async function isSubdomainTaken(base44, subdomain, excludeOwnerId) {
  for (const entity of Object.values(ENTITY_BY_TYPE)) {
    const matches = await base44.asServiceRole.entities[entity].filter({
      opentill_subdomain: subdomain,
    });
    if (matches && matches.some((m) => m.id !== excludeOwnerId)) return true;
  }
  return false;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const isAdmin =
      user.role === 'admin' ||
      user.role === 'super_admin' ||
      user.role === 'root_admin';

    let body = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const ownerType = body.owner_type || (body.ambassador_id ? 'ambassador' : '');
    const ownerId = body.owner_id || body.ambassador_id;
    let subdomain = (body.subdomain || '').toString().toLowerCase().trim();
    const walletAddress = (body.wallet_address || '').toString().trim();

    if (!ENTITY_BY_TYPE[ownerType] || !ownerId || !subdomain || !walletAddress) {
      return Response.json(
        {
          error:
            'owner_type, owner_id, subdomain and wallet_address are required',
        },
        { status: 400 }
      );
    }

    let userWallet;
    try {
      userWallet = new PublicKey(walletAddress);
    } catch {
      return Response.json(
        { error: 'Invalid wallet_address' },
        { status: 400 }
      );
    }

    if (subdomain.endsWith('.opentill.sol')) subdomain = subdomain.slice(0, -12);
    else if (subdomain.endsWith('.sol')) subdomain = subdomain.slice(0, -4);
    else if (subdomain.endsWith('.opentill')) subdomain = subdomain.slice(0, -9);

    const vErr = validateSubdomain(subdomain);
    if (vErr) return Response.json({ error: vErr }, { status: 400 });

    const entity = ENTITY_BY_TYPE[ownerType];
    const list = await base44.asServiceRole.entities[entity].filter({
      id: ownerId,
    });
    const owner = list && list[0];
    if (!owner)
      return Response.json({ error: `${ownerType} not found` }, { status: 404 });
    if (!isAdmin && !isOwnerOf(ownerType, owner, user))
      return Response.json({ error: 'Forbidden: not the owner' }, { status: 403 });

    if (await isSubdomainTaken(base44, subdomain, ownerId)) {
      return Response.json(
        {
          error: `Subdomain "${subdomain}.${PARENT_DOMAIN}.sol" is already taken.`,
        },
        { status: 409 }
      );
    }

    const network = Deno.env.get('SOLANA_NETWORK') || 'devnet';
    const rpcUrl =
      network === 'mainnet'
        ? 'https://api.mainnet-beta.solana.com'
        : 'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    const authoritySecretKey = Deno.env.get('SOLANA_AUTHORITY_PRIVATE_KEY');
    if (!authoritySecretKey)
      return Response.json(
        { error: 'Server missing SOLANA_AUTHORITY_PRIVATE_KEY' },
        { status: 500 }
      );
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

    const { parentKey, subKey, subHashed } = await getSubdomainKeys(
      subdomain,
      PARENT_DOMAIN
    );

    const parentInfo = await connection.getAccountInfo(parentKey);
    if (!parentInfo || !parentInfo.data || parentInfo.data.length < 64) {
      return Response.json(
        {
          error: `Parent domain ${PARENT_DOMAIN}.sol is not registered on ${network}.`,
        },
        { status: 400 }
      );
    }
    const parentOwner = new PublicKey(parentInfo.data.slice(32, 64));
    if (!parentOwner.equals(authorityKeypair.publicKey)) {
      return Response.json(
        {
          error: `The authority wallet does not own ${PARENT_DOMAIN}.sol.`,
        },
        { status: 403 }
      );
    }

    const existing = await connection.getAccountInfo(subKey);
    if (existing) {
      return Response.json(
        {
          error: `Subdomain "${subdomain}.${PARENT_DOMAIN}.sol" is already registered on-chain.`,
        },
        { status: 409 }
      );
    }

    const lamports = await connection.getMinimumBalanceForRentExemption(
      SPACE + HEADER_LEN
    );

    const ix = buildCreateInstruction({
      payer: userWallet, // user's wallet pays rent + fee
      nameKey: subKey,
      nameOwner: userWallet, // user's wallet owns the subdomain
      hashedName: subHashed,
      lamports,
      space: SPACE,
      parentKey,
      parentOwner: authorityKeypair.publicKey, // platform vault co-signs as parent owner
    });

    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    const transaction = new Transaction({
      feePayer: userWallet,
      recentBlockhash: blockhash,
    });
    transaction.add(ix);
    // Authority (platform vault) co-signs server-side. User signs on the client.
    transaction.partialSign(authorityKeypair);

    const serialized = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    return Response.json({
      success: true,
      transaction: toBase64(serialized),
      subdomain: `${subdomain}.${PARENT_DOMAIN}.sol`,
      parent_domain: `${PARENT_DOMAIN}.sol`,
      network,
      authority: authorityKeypair.publicKey.toBase58(),
      wallet_address: userWallet.toBase58(),
      // entity is NOT updated here; confirmed after the wallet submits.
    });
  } catch (error) {
    console.error('registerAmbassadorSNSSubdomain (prepare) error:', error);
    return Response.json(
      { success: false, error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
});