import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';

/**
 * FeatureGate - Wraps content that requires a specific chip to be unlocked
 * 
 * Usage:
 * <FeatureGate chipName="Advanced Reports" fallback={<LockedMessage />}>
 *   <AdvancedReportsComponent />
 * </FeatureGate>
 */
export default function FeatureGate({ chipName, children, fallback }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chip, setChip] = useState(null);

  useEffect(() => {
    checkFeatureAccess();
  }, [chipName]);

  const checkFeatureAccess = async () => {
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
        // If chip doesn't exist, allow access (feature is not gated)
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

      if (response.data?.unlocked_chips?.[targetChip.id]?.unlocked) {
        setIsUnlocked(true);
      } else {
        setIsUnlocked(false);
      }
    } catch (error) {
      console.error('Feature gate error:', error);
      setIsUnlocked(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      </div>
    );
  }

  if (!isUnlocked) {
    if (fallback) {
      return fallback;
    }

    return (
      <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800">
        <Lock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        <AlertDescription className="text-orange-800 dark:text-orange-300">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold mb-1">Feature Locked: {chipName}</p>
              <p className="text-sm">
                This feature requires specific NFTs to unlock. Connect your wallet on the Motherboard to access this feature.
              </p>
              {chip && (
                <p className="text-sm mt-2">
                  Required: {chip.required_nft_count} NFT{chip.required_nft_count > 1 ? 's' : ''} from collection
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => window.location.href = createPageUrl('Motherboard')}
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Go to Motherboard
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
}