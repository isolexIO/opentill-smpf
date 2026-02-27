import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Central feature access hook.
 * Returns a set of enabled feature keys for the current merchant.
 * 
 * Access is granted if ANY of:
 *  1. User is super_admin / admin / root_admin / demo merchant
 *  2. Feature is in merchant.features_enabled (manually granted by super admin)
 *  3. Merchant has an active MotherboardInstall for a chip that grants the feature flag
 */
export function useMerchantFeatures() {
  const [features, setFeatures] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    try {
      // Try PIN user first (merchant staff)
      let pinUser = null;
      try {
        const json = localStorage.getItem('pinLoggedInUser');
        if (json) pinUser = JSON.parse(json);
      } catch (_) {}

      const user = pinUser || await base44.auth.me();

      // Admins get everything
      if (['admin', 'root_admin', 'super_admin'].includes(user?.role)) {
        setIsAdmin(true);
        setFeatures(new Set(['all']));
        setLoading(false);
        return;
      }

      const merchantId = user?.merchant_id;
      if (!merchantId) {
        setLoading(false);
        return;
      }

      // Load merchant record
      const merchants = await base44.entities.Merchant.filter({ id: merchantId });
      const merchant = merchants?.[0];

      if (!merchant) { setLoading(false); return; }

      // Demo merchants get everything
      if (merchant.is_demo) {
        setFeatures(new Set(['all']));
        setLoading(false);
        return;
      }

      // Start with merchant.features_enabled (base set)
      const enabled = new Set(merchant.features_enabled || ['pos']);

      // Add features unlocked by installed chips
      try {
        const installs = await base44.entities.MotherboardInstall.filter({
          owner_type: 'merchant',
          owner_id: merchantId,
          is_active: true
        });

        if (installs.length > 0) {
          const chipIds = installs.map(i => i.chip_id);
          const chips = await base44.entities.Chip.filter({
            id: { $in: chipIds },
            is_active: true
          });

          for (const chip of chips) {
            // Check payment (mints or subs)
            let paid = false;
            if (chip.billing_type === 'FREE') {
              paid = true;
            } else if (chip.billing_type === 'ONE_TIME') {
              const mints = await base44.entities.ChipMint.filter({ chip_id: chip.id, user_id: user.id });
              paid = mints.length > 0;
            } else if (chip.billing_type === 'RECURRING') {
              const subs = await base44.entities.ChipSubscription.filter({
                chip_id: chip.id, owner_type: 'merchant', owner_id: merchantId, status: 'ACTIVE'
              });
              paid = subs.length > 0;
            }

            if (paid && chip.feature_flags) {
              chip.feature_flags.forEach(f => enabled.add(f));
            }
          }
        }
      } catch (_) {}

      setFeatures(enabled);
    } catch (error) {
      console.error('useMerchantFeatures error:', error);
      // Fallback: only basic POS
      setFeatures(new Set(['pos']));
    } finally {
      setLoading(false);
    }
  };

  const hasFeature = (feature) => {
    if (isAdmin) return true;
    return features.has('all') || features.has(feature);
  };

  return { features, hasFeature, loading, isAdmin, refresh: loadFeatures };
}