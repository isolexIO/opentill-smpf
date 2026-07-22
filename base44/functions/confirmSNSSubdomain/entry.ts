import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { Connection, PublicKey } from 'npm:@solana/web3.js@1.95.8';

// Verifies an SNS subdomain mint (paid/submitted by the user's wallet) and
// records it on the owner entity. Called by the client after the wallet
// submits the authority-co-signed transaction.

const PARENT_DOMAIN = 'opentill';
const HASH_PREFIX = 'SPL Name Service';
const NAME_PROGRAM_ID = new PublicKey(
  'namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX'
);
const ROOT_DOMAIN_ACCOUNT = new PublicKey(
  '58PwtjSDuFHuUkYjH9BYnnQKHfwo9reZhC2zMJv9JPkx'
);
const ZEROS32 = new Uint8Array(32);
const ENTITY_BY_TYPE = {
  ambassador: 'Ambassador',
  merchant: 'Merchant',
  builder: 'Builder',
};

async function sha256(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return new Uint8Array(digest);
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
    const txSignature = (body.tx_signature || '').toString();
    const walletAddress = (body.wallet_address || '').toString().trim();

    if (
      !ENTITY_BY_TYPE[ownerType] ||
      !ownerId ||
      !subdomain ||
      !txSignature ||
      !walletAddress
    ) {
      return Response.json(
        {
          error:
            'owner_type, owner_id, subdomain, tx_signature and wallet_address are required',
        },
        { status: 400 }
      );
    }

    if (subdomain.endsWith('.opentill.sol')) subdomain = subdomain.slice(0, -12);
    else if (subdomain.endsWith('.sol')) subdomain = subdomain.slice(0, -4);
    else if (subdomain.endsWith('.opentill')) subdomain = subdomain.slice(0, -9);

    let walletPk;
    try {
      walletPk = new PublicKey(walletAddress);
    } catch {
      return Response.json({ error: 'Invalid wallet_address' }, { status: 400 });
    }

    const entity = ENTITY_BY_TYPE[ownerType];
    const list = await base44.asServiceRole.entities[entity].filter({
      id: ownerId,
    });
    const owner = list && list[0];
    if (!owner)
      return Response.json({ error: `${ownerType} not found` }, { status: 404 });
    if (!isAdmin && !isOwnerOf(ownerType, owner, user))
      return Response.json({ error: 'Forbidden: not the owner' }, { status: 403 });

    const network = Deno.env.get('SOLANA_NETWORK') || 'devnet';
    const rpcUrl =
      network === 'mainnet'
        ? 'https://api.mainnet-beta.solana.com'
        : 'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    const subHashed = await getHashedName('\0' + subdomain);
    const parentHashed = await getHashedName(PARENT_DOMAIN);
    const parentKey = getNameAccountKey(parentHashed, undefined, ROOT_DOMAIN_ACCOUNT);
    const subKey = getNameAccountKey(subHashed, undefined, parentKey);

    const acc = await connection.getAccountInfo(subKey);
    if (!acc || !acc.owner || !acc.owner.equals(NAME_PROGRAM_ID)) {
      return Response.json(
        {
          error:
            'Subdomain not found on-chain yet. The wallet transaction may not have confirmed. Try again in a moment.',
        },
        { status: 400 }
      );
    }
    if (!acc.data || acc.data.length < 96) {
      return Response.json({ error: 'Subdomain account is invalid.' }, { status: 400 });
    }

    // NameRegistryState: parentName(0-32), owner(32-64), class(64-96)
    const parentName = new PublicKey(acc.data.slice(0, 32));
    const nameOwner = new PublicKey(acc.data.slice(32, 64));
    if (!parentName.equals(parentKey)) {
      return Response.json({ error: 'Parent domain mismatch.' }, { status: 400 });
    }
    if (!nameOwner.equals(walletPk)) {
      return Response.json(
        {
          error: 'The on-chain subdomain owner does not match the connected wallet.',
        },
        { status: 400 }
      );
    }

    await base44.asServiceRole.entities[entity].update(ownerId, {
      opentill_subdomain: subdomain,
      subdomain_status: 'active',
      subdomain_approved_at: new Date().toISOString(),
      subdomain_requested_at:
        owner.subdomain_requested_at || new Date().toISOString(),
      subdomain_wallet: walletAddress,
    });

    return Response.json({
      success: true,
      subdomain: `${subdomain}.${PARENT_DOMAIN}.sol`,
      tx_signature: txSignature,
      owner: walletAddress,
      network,
    });
  } catch (error) {
    console.error('confirmSNSSubdomain error:', error);
    return Response.json(
      { success: false, error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
});