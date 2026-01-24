import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Hook to check if a specific chip/feature is unlocked
 * 
 * Usage:
 * const { isUnlocked, loading, chip } = useChipAccess('Advanced Reports');
 * 
 * if (loading) return <Spinner />;
 * if (!isUnlocked) return <LockedMessage />;
 * return <AdvancedReports />;
 */
export function useChipAccess(chipName) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chip, setChip] = useState(null);

  useEffect(() => {
    if (!chipName) {
      setLoading(false);
      setIsUnlocked(true);
      return;
    }

    checkAccess();
  }, [chipName]);

  const checkAccess = async () => {
    try {
      const user = await base44.auth.me();
      
      if (!user?.wallet_address) {
        setIsUnlocked(false);
        setLoading(false);
        return;
      }

      // Load chip by name
      const chips = await base44.entities.Chip.filter({ 
        name: chipName,
        is_active: true 
      });

      if (chips.length === 0) {
        // If chip doesn't exist, allow access
        setIsUnlocked(true);
        setLoading(false);
        return;
      }

      const targetChip = chips[0];
      setChip(targetChip);

      // Verify NFT ownership
      const response = await base44.functions.invoke('verifyNFTOwnership', {
        wallet_address: user.wallet_address,
        chips: [{
          id: targetChip.id,
          collection: targetChip.required_nft_collection,
          required_count: targetChip.required_nft_count
        }]
      });

      setIsUnlocked(response.data?.unlocked_chips?.[targetChip.id]?.unlocked || false);
    } catch (error) {
      console.error('Chip access check error:', error);
      setIsUnlocked(false);
    } finally {
      setLoading(false);
    }
  };

  return { isUnlocked, loading, chip, refresh: checkAccess };
}

/**
 * Hook to check multiple chips at once
 * 
 * Usage:
 * const { unlockedChips, loading } = useMultipleChipAccess(['Advanced Reports', 'Multi-Location']);
 */
export function useMultipleChipAccess(chipNames) {
  const [unlockedChips, setUnlockedChips] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chipNames || chipNames.length === 0) {
      setLoading(false);
      return;
    }

    checkMultipleAccess();
  }, [JSON.stringify(chipNames)]);

  const checkMultipleAccess = async () => {
    try {
      const user = await base44.auth.me();
      
      if (!user?.wallet_address) {
        const result = {};
        chipNames.forEach(name => result[name] = false);
        setUnlockedChips(result);
        setLoading(false);
        return;
      }

      // Load all chips by names
      const chips = await base44.entities.Chip.filter({ 
        name: { $in: chipNames },
        is_active: true 
      });

      if (chips.length === 0) {
        const result = {};
        chipNames.forEach(name => result[name] = true);
        setUnlockedChips(result);
        setLoading(false);
        return;
      }

      // Verify NFT ownership for all chips
      const response = await base44.functions.invoke('verifyNFTOwnership', {
        wallet_address: user.wallet_address,
        chips: chips.map(c => ({
          id: c.id,
          collection: c.required_nft_collection,
          required_count: c.required_nft_count
        }))
      });

      const result = {};
      chips.forEach(chip => {
        result[chip.name] = response.data?.unlocked_chips?.[chip.id]?.unlocked || false;
      });

      // Add chips that don't exist (allow access)
      chipNames.forEach(name => {
        if (!(name in result)) {
          result[name] = true;
        }
      });

      setUnlockedChips(result);
    } catch (error) {
      console.error('Multiple chip access check error:', error);
      const result = {};
      chipNames.forEach(name => result[name] = false);
      setUnlockedChips(result);
    } finally {
      setLoading(false);
    }
  };

  return { unlockedChips, loading, refresh: checkMultipleAccess };
}