import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Hook to check if user has access to specific features via installed chips
 * @param {string[]} requiredFlags - Array of feature flags needed
 * @returns {{ hasAccess: boolean, loading: boolean, missingFlags: string[] }}
 */
export function useFeatureAccess(requiredFlags = []) {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [missingFlags, setMissingFlags] = useState([]);

  useEffect(() => {
    checkAccess();
  }, [requiredFlags]);

  const checkAccess = async () => {
    try {
      // Try PIN user first (merchant staff may not have a platform session)
      let pinUser = null;
      try {
        const json = localStorage.getItem('pinLoggedInUser');
        if (json) pinUser = JSON.parse(json);
      } catch (_) {}

      let user = pinUser || await base44.auth.me();

      // Super admin has access to everything
      if (user?.role === 'admin' || user?.role === 'root_admin' || user?.role === 'super_admin') {
        setHasAccess(true);
        setMissingFlags([]);
        setLoading(false);
        return;
      }

      if (!user?.merchant_id && !user?.ambassador_id) {
        setHasAccess(false);
        setMissingFlags(requiredFlags);
        setLoading(false);
        return;
      }

      // Build the set of enabled feature flags, mirroring useMerchantFeatures
      const enabledFlags = new Set();
      const ownerType = user.merchant_id ? 'merchant' : 'ambassador';
      const ownerId = user.merchant_id || user.ambassador_id;

      if (user?.merchant_id) {
        try {
          const merchants = await base44.entities.Merchant.filter({ id: user.merchant_id });
          const merchant = merchants?.[0];

          // Demo merchants get full access to all features
          if (merchant?.is_demo) {
            setHasAccess(true);
            setMissingFlags([]);
            setLoading(false);
            return;
          }

          // Start with merchant.features_enabled (base set granted by super admin)
          (merchant?.features_enabled || []).forEach(f => enabledFlags.add(f));
        } catch (_) {}
      }

      // Add features unlocked by installed chips
      try {
        const installs = await base44.entities.MotherboardInstall.filter({
          owner_type: ownerType,
          owner_id: ownerId,
          is_active: true
        });

        if (installs.length > 0) {
          const chipIds = installs.map(i => i.chip_id);
          const chips = await base44.entities.Chip.filter({
            id: { $in: chipIds },
            is_active: true
          });

          const mints = await base44.entities.ChipMint.filter({ user_id: user.id });
          const subs = await base44.entities.ChipSubscription.filter({
            owner_type: ownerType,
            owner_id: ownerId
          });

          for (const chip of chips) {
            let hasChipAccess = false;

            if (chip.billing_type === 'FREE') {
              hasChipAccess = true;
            } else if (chip.billing_type === 'ONE_TIME') {
              hasChipAccess = mints.some(m => m.chip_id === chip.id);
            } else if (chip.billing_type === 'RECURRING') {
              const activeSub = subs.find(s => s.chip_id === chip.id && s.status === 'ACTIVE');
              if (activeSub) {
                hasChipAccess = chip.require_chip_nft ? mints.some(m => m.chip_id === chip.id) : true;
              }
            }

            if (hasChipAccess && chip.feature_flags) {
              chip.feature_flags.forEach(f => enabledFlags.add(f));
            }
          }
        }
      } catch (_) {}

      // Check if all required flags are present
      const missing = requiredFlags.filter(flag => !enabledFlags.has(flag));
      setMissingFlags(missing);
      setHasAccess(missing.length === 0);

    } catch (error) {
      console.error('Feature access check error:', error);
      setHasAccess(false);
      setMissingFlags(requiredFlags);
    } finally {
      setLoading(false);
    }
  };

  return { hasAccess, loading, missingFlags };
}