import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Parent domain owned by the openTILL authority wallet on Solana Name Service.
const PARENT_DOMAIN = 'opentill.sol';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const isAdmin = user.role === 'admin' || user.role === 'super_admin' || user.role === 'root_admin';
    if (!isAdmin && user.role !== 'dealer_admin' && user.role !== 'ambassador') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body = {};
    try { body = await req.json(); } catch { body = {}; }
    const ambassador_id = body.ambassador_id;
    let subdomain = (body.subdomain || '').toString().toLowerCase().trim();

    if (!ambassador_id || !subdomain) {
      return Response.json({ error: 'ambassador_id and subdomain are required' }, { status: 400 });
    }

    const suffix = '.' + PARENT_DOMAIN;
    if (subdomain.endsWith(suffix)) subdomain = subdomain.slice(0, -suffix.length);
    if (subdomain.endsWith('.sol')) subdomain = subdomain.slice(0, -4);

    if (!/^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(subdomain)) {
      return Response.json({
        error: 'Subdomain must be 3-32 chars: lowercase letters, numbers, and hyphens (no leading/trailing hyphen).'
      }, { status: 400 });
    }

    const ambassadors = await base44.asServiceRole.entities.Ambassador.filter({ id: ambassador_id });
    if (!ambassadors || ambassadors.length === 0) {
      return Response.json({ error: 'Ambassador not found' }, { status: 404 });
    }
    const ambassador = ambassadors[0];

    const isOwner =
      (ambassador.owner_email && user.email && ambassador.owner_email.toLowerCase() === user.email.toLowerCase()) ||
      (ambassador.legacy_dealer_id && user.dealer_id && ambassador.legacy_dealer_id === user.dealer_id);
    if (!isAdmin && !isOwner) {
      return Response.json({ error: 'Forbidden: not the ambassador owner' }, { status: 403 });
    }

    const existing = await base44.asServiceRole.entities.Ambassador.filter({ opentill_subdomain: subdomain });
    if (existing && existing.some((a) => a.id !== ambassador_id)) {
      return Response.json({ error: `Subdomain "${subdomain}.${PARENT_DOMAIN}" is already taken.` }, { status: 409 });
    }

    const network = Deno.env.get('SOLANA_NETWORK') || 'devnet';
    const rpcUrl = network === 'mainnet' ? 'https://api.mainnet-beta.solana.com' : 'https://api.devnet.solana.com';

    // Heavy Solana deps load at runtime so they stay out of build-time analysis.
    const web3 = await import('npm:@solana/web3.js@1.95.8');
    const connection = new web3.Connection(rpcUrl, 'confirmed');

    const authoritySecretKey = Deno.env.get('SOLANA_AUTHORITY_PRIVATE_KEY');
    if (!authoritySecretKey) {
      return Response.json({ error: 'Server missing SOLANA_AUTHORITY_PRIVATE_KEY' }, { status: 500 });
    }
    const trimmed = authoritySecretKey.trim();
    let authoritySecretKeyBytes;
    if (trimmed.startsWith('[')) {
      authoritySecretKeyBytes = new Uint8Array(JSON.parse(trimmed));
    } else {
      const bs58 = await import('npm:bs58@5.0.0');
      authoritySecretKeyBytes = new Uint8Array(bs58.default ? bs58.default.decode(trimmed) : bs58.decode(trimmed));
    }
    const authorityKeypair = web3.Keypair.fromSecretKey(authoritySecretKeyBytes);

    const sns = await import('npm:@bonfida/spl-name-service@3.0.26');
    const { pubkey: parentKey } = sns.getDomainKeySync(PARENT_DOMAIN);
    const parentInfo = await connection.getAccountInfo(parentKey);
    if (!parentInfo) {
      return Response.json({
        error: `Parent domain ${PARENT_DOMAIN} is not registered on ${network}. Register it with the authority wallet first.`
      }, { status: 400 });
    }

    const fullSubdomain = `${subdomain}.${PARENT_DOMAIN}`;
    const ix = await sns.createSubdomain(connection, fullSubdomain, authorityKeypair.publicKey);

    const transaction = new web3.Transaction().add(ix);
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
      subdomain: fullSubdomain,
      tx_signature: signature,
      owner: authorityKeypair.publicKey.toBase58(),
      network,
    });
  } catch (error) {
    console.error('registerAmbassadorSNSSubdomain error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});