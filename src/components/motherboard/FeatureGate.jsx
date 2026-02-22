import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { useFeatureAccess } from './useFeatureAccess';

/**
 * FeatureGate - Wraps content that requires specific feature flags
 * 
 * Usage:
 * <FeatureGate requiredFlags={['advanced_analytics']} fallback={<LockedMessage />}>
 *   <AdvancedReportsComponent />
 * </FeatureGate>
 */
export default function FeatureGate({ requiredFlags = [], children, fallback }) {
  const { hasAccess, loading, missingFlags } = useFeatureAccess(requiredFlags);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      </div>
    );
  }

  if (!hasAccess) {
    if (fallback) {
      return fallback;
    }

    return (
      <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800">
        <Lock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        <AlertDescription className="text-orange-800 dark:text-orange-300">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold mb-1">Premium Feature Locked</p>
              <p className="text-sm">
                This feature requires a chip with the following flags: {missingFlags.join(', ')}
              </p>
              <p className="text-sm mt-2">
                Visit the Marketplace to purchase required chips with $DUC.
              </p>
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