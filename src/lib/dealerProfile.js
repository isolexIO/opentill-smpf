import { base44 } from '@/api/base44Client';

// Updates the Ambassador profile for the currently authenticated dealer session.
// Ambassador Hub sessions (email / Google / wallet) have no platform User, so
// they can't pass the Ambassador RLS update rule via the client. When a
// dealerToken is present we route through the token-authenticated service-role
// `update_profile` action; platform admin sessions fall back to the client.
export async function updateAmbassadorProfile(dealer, updates) {
  const token = localStorage.getItem('dealerToken');
  if (token) {
    const { data } = await base44.functions.invoke('dealerAuth', {
      action: 'update_profile',
      token,
      updates,
    });
    if (!data?.success) throw new Error(data?.error || 'Failed to update profile');
    return data.dealer;
  }
  return await base44.entities.Ambassador.update(dealer.id, updates);
}