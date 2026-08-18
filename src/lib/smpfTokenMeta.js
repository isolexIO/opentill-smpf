// Fetches token metadata (name, symbol, image) for Solana SPL mints.
// Uses on-chain Metaplex Token Metadata (no API key required), then follows the
// off-chain JSON URI for the image/logo. Results are cached per mint.

import { Connection, PublicKey } from '@solana/web3.js';
import { getNetworkRpcList, withTimeout } from '@/lib/smpfRpc';

const METAPLEX_METADATA_PROGRAM_ID = new PublicKey(
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
);

const cache = new Map(); // mint -> { name, symbol, image, uri }
const TTL = 10 * 60 * 1000;

// Decode a Borsh length-prefixed UTF-8 string from a Buffer at the given offset.
// Returns [string, nextOffset].
function readBorshString(buf, offset) {
  if (offset + 4 > buf.length) return ['', offset];
  const len = buf.readUInt32LE(offset);
  offset += 4;
  if (offset + len > buf.length) return ['', offset];
  const str = buf.slice(offset, offset + len).toString('utf8').replace(/\0/g, '').trim();
  return [str, offset + len];
}

// Derive the Metaplex metadata PDA for a mint.
function metadataPda(mint) {
  const [pda] = PublicKey.findProgramAddressSync(
    [new TextEncoder().encode('metadata'), METAPLEX_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    METAPLEX_METADATA_PROGRAM_ID,
  );
  return pda;
}

// Fetch on-chain Metaplex metadata (name, symbol, uri) for a mint.
async function fetchOnchainMeta(conn, mint) {
  const pda = metadataPda(mint);
  const acc = await withTimeout(conn.getAccountInfo(pda), 8000, 'meta-account');
  if (!acc || !acc.data) return null;
  const data = acc.data;
  // Layout: key(1) + updateAuth(32) + mint(32) = 65, then name/symbol/uri borsh strings.
  let offset = 65;
  let name, symbol, uri;
  [name, offset] = readBorshString(data, offset);
  [symbol, offset] = readBorshString(data, offset);
  [uri, offset] = readBorshString(data, offset);
  return { name, symbol, uri };
}

// Fetch the off-chain JSON metadata (image, description) from the URI.
async function fetchOffchainJson(uri) {
  if (!uri) return null;
  try {
    const res = await fetch(uri, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const j = await res.json();
    return {
      image: j.image || j.logoURI || j.logo || null,
      description: j.description || null,
    };
  } catch {
    return null;
  }
}

// Public: get token metadata for a mint. Returns { name, symbol, image, uri } or null.
export async function getTokenMeta(mintStr, settings) {
  if (!mintStr) return null;
  const now = Date.now();
  const c = cache.get(mintStr);
  if (c && now - c.ts < TTL) return c.value;
  try {
    const mint = new PublicKey(mintStr);
    const rpcs = getNetworkRpcList(settings);
    let onchain = null;
    for (const rpc of rpcs) {
      try {
        const conn = new Connection(rpc, 'confirmed');
        onchain = await fetchOnchainMeta(conn, mint);
        if (onchain) break;
      } catch (e) { /* try next rpc */ }
    }
    let offchain = null;
    if (onchain?.uri) offchain = await fetchOffchainJson(onchain.uri);
    const value = {
      name: onchain?.name || null,
      symbol: onchain?.symbol || null,
      image: offchain?.image || null,
      uri: onchain?.uri || null,
    };
    cache.set(mintStr, { value, ts: now });
    return value;
  } catch {
    return null;
  }
}

// Batch fetch metadata for many mints (best-effort, non-blocking).
export async function getTokenMetas(mintStrs, settings) {
  const entries = await Promise.all(
    mintStrs.map(async (m) => [m, await getTokenMeta(m, settings)]),
  );
  return Object.fromEntries(entries);
}