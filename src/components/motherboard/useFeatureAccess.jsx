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
      const user = await base44.auth.me();
      
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

      // Get installed chips
      const ownerType = user.merchant_id ? 'merchant' : 'ambassador';
      const ownerId = user.merchant_id || user.ambassador_id;

      const installs = await base44.entities.MotherboardInstall.filter({
        owner_type: ownerType,
        owner_id: ownerId,
        is_active: true
      });

      // Get all chips for those installs
      const chipIds = installs.map(i => i.chip_id);
      if (chipIds.length === 0) {
        setHasAccess(false);
        setMissingFlags(requiredFlags);
        setLoading(false);
        return;
      }

      const chips = await base44.entities.Chip.filter({
        id: { $in: chipIds },
        is_active: true
      });

      // Get mints and subscriptions
      const mints = await base44.entities.ChipMint.filter({
        user_id: user.id
      });

      const subs = await base44.entities.ChipSubscription.filter({
        owner_type: ownerType,
        owner_id: ownerId
      });

      // Build enabled feature flags
      const enabledFlags = [];
      
      for (const chip of chips) {
        let hasChipAccess = false;

        if (chip.billing_type === 'ONE_TIME') {
          hasChipAccess = mints.some(m => m.chip_id === chip.id);
        } else if (chip.billing_type === 'RECURRING') {
          const activeSub = subs.find(s => 
            s.chip_id === chip.id && 
            s.status === 'ACTIVE'
          );
          
          if (activeSub) {
            if (chip.require_chip_nft) {
              hasChipAccess = mints.some(m => m.chip_id === chip.id);
            } else {
              hasChipAccess = true;
            }
          }
        }

        if (hasChipAccess && chip.feature_flags) {
          enabledFlags.push(...chip.feature_flags);
        }
      }

      // Check if all required flags are present
      const missing = requiredFlags.filter(flag => !enabledFlags.includes(flag));
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