import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Custom hook to check NFT-based chip access
 * Automatically refreshes every 5 minutes to detect new NFT acquisitions
 */
export function useChipAccess(chipName) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState(null);

  const checkAccess = async () => {
    try {
      setLoading(true);

      // Get current user
      const user = await base44.auth.me();
      if (!user || !user.wallet_address) {
        setIsUnlocked(false);
        setWalletAddress(null);
        return;
      }

      setWalletAddress(user.wallet_address);

      // Get chip info
      const chips = await base44.entities.Chip.filter({ name: chipName });
      if (!chips || chips.length === 0) {
        setIsUnlocked(false);
        return;
      }

      const chip = chips[0];

      // Verify NFT ownership
      const { data: verificationResult } = await base44.functions.invoke('verifyNFTOwnership', {
        wallet_address: user.wallet_address,
        nft_requirements: [{
          collection: chip.required_nft_collection,
          required_count: chip.required_nft_count || 1
        }]
      });

      // Check if this specific chip is unlocked
      const unlocked = verificationResult.unlocked_chips?.some(
        c => c.collection === chip.required_nft_collection
      );

      setIsUnlocked(unlocked || false);
    } catch (error) {
      console.error('Error checking chip access:', error);
      setIsUnlocked(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAccess();

    // Refresh access check every 5 minutes
    const interval = setInterval(checkAccess, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [chipName]);

  return { isUnlocked, loading, walletAddress, refreshAccess: checkAccess };
}