import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

/**
 * Build a query string (?ref=CODE or ?dealer_id=SLUG) from a referral object.
 * Returns '' when there is no referral.
 */
export function buildRefParam(ref) {
  if (!ref || !ref.code) return '';
  if (ref.type === 'dealer') return `?dealer_id=${encodeURIComponent(ref.code)}`;
  return `?ref=${encodeURIComponent(ref.code)}`;
}

/**
 * Append a referral param string (?ref=CODE) to a base URL, preserving any
 * existing query string.
 */
export function appendRefParam(baseUrl, refParam) {
  if (!refParam) return baseUrl;
  const query = refParam.startsWith('?') ? refParam.slice(1) : refParam;
  const sep = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${sep}${query}`;
}

/**
 * Resolve the current viewer's referral identity.
 *
 * Priority:
 *   1. Explicit URL params (when the page itself was shared with a ref)
 *   2. An explicit merchantId prop (e.g. a customer sharing their merchant's link)
 *   3. The logged-in user's own merchant referral_code or ambassador slug
 *
 * Returns { type: 'merchant' | 'dealer', code } or null.
 */
export async function resolveReferral({ merchantId } = {}) {
  // 1. URL params
  const params = new URLSearchParams(window.location.search);
  const urlDealer = params.get('dealer_id') || params.get('dealerid') || params.get('dealer');
  const urlRef = params.get('ref') || params.get('referral') || params.get('code');
  if (urlDealer) return { type: 'dealer', code: urlDealer };
  if (urlRef) return { type: 'merchant', code: urlRef.toUpperCase() };

  // 2. Explicit merchant id (customer portal context — uses the public,
  //    service-role endpoint so it works without a base44 session)
  if (merchantId) {
    try {
      const { data } = await base44.functions.invoke('getPublicMerchant', { merchant_id: merchantId });
      if (data?.success && data.merchant?.referral_code) {
        return { type: 'merchant', code: data.merchant.referral_code };
      }
    } catch { /* ignore */ }
    // Fallback: direct entity read (works when the viewer is base44-authed)
    try {
      const merchants = await base44.entities.Merchant.filter({ id: merchantId });
      if (merchants?.[0]?.referral_code) {
        return { type: 'merchant', code: merchants[0].referral_code };
      }
    } catch { /* ignore */ }
  }

  // 3. Logged-in user
  try {
    const user = await base44.auth.me();
    if (user?.merchant_id) {
      try {
        const merchants = await base44.entities.Merchant.filter({ id: user.merchant_id });
        if (merchants?.[0]?.referral_code) {
          return { type: 'merchant', code: merchants[0].referral_code };
        }
      } catch { /* ignore */ }
    }
    if (user?.dealer_id) {
      try {
        const ambassadors = await base44.entities.Ambassador.filter({ legacy_dealer_id: user.dealer_id });
        if (ambassadors?.[0]) {
          return { type: 'dealer', code: ambassadors[0].slug || user.dealer_id };
        }
      } catch { /* ignore */ }
      return { type: 'dealer', code: user.dealer_id };
    }
  } catch { /* not logged in — public viewer */ }

  return null;
}

/** Convenience: the full shareable brochure URL for a referral param. */
export function brochureUrlFor(refParam) {
  const base = `${window.location.origin}${createPageUrl('Brochure')}`;
  return appendRefParam(base, refParam);
}