import { base44 } from '@/api/base44Client';

// Resolves the active merchant ID, working correctly during impersonation
// (pinLoggedInUser in localStorage) as well as normal auth.
export default async function getMerchantId() {
  // During impersonation, pinLoggedInUser holds the impersonated merchant's context
  try {
    const pinUserJSON = localStorage.getItem('pinLoggedInUser');
    if (pinUserJSON) {
      const pinUser = JSON.parse(pinUserJSON);
      if (pinUser?.merchant_id) return pinUser.merchant_id;
    }
  } catch { /* ignore */ }
  // Fall back to the authenticated platform user
  try {
    const me = await base44.auth.me();
    if (me?.merchant_id) return me.merchant_id;
  } catch { /* ignore */ }
  return null;
}