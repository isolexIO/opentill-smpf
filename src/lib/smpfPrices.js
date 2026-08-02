// Mint-based fiat price estimates via Jupiter's public price API.
// Never blocks wallet actions when prices are unavailable.
const WSOL = 'So11111111111111111111111111111111111111111112';
const cache = new Map();
const TTL = 60000;

export async function getPrice(mint) {
  if (!mint) return null;
  const now = Date.now();
  const c = cache.get(mint);
  if (c && now - c.ts < TTL) return c.price;
  try {
    const res = await fetch(`https://api.jup.club/price/v2?ids=${mint}`);
    const j = await res.json();
    const p = j?.data?.[mint]?.price ?? null;
    cache.set(mint, { price: p, ts: now });
    return p;
  } catch {
    return null;
  }
}

export async function getSolUsdPrice() {
  return getPrice(WSOL);
}

export { WSOL };