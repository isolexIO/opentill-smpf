import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Calendar, BarChart3, Settings, ShieldAlert } from 'lucide-react';
import PayoutOverview from './payout/PayoutOverview';
import PayoutScheduler from './payout/PayoutScheduler';
import CommissionBreakdown from './CommissionBreakdown';
import PayoutMethodSettings from './PayoutMethodSettings';
import IdentityVerificationCard from '@/components/shared/IdentityVerificationCard';

export default function PayoutDashboard({ dealer, onUpdate }) {
  const identityVerified = !!dealer?.stripe_identity_verified;

  return (
    <div className="space-y-6">
      {!identityVerified && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-amber-900">Payouts Blocked — Identity Verification Required</h3>
          </div>
          <p className="text-sm text-amber-700 mb-4">
            Complete Stripe Identity verification to unlock payouts. You'll need a government-issued ID and a selfie.
          </p>
          <IdentityVerificationCard
            entityType="ambassador"
            entityId={dealer.id}
            businessName={dealer.name}
            ownerEmail={dealer.owner_email || dealer.contact_email}
            ownerName={dealer.owner_name || dealer.name}
            verified={identityVerified}
            onVerified={onUpdate}
          />
        </div>
      )}

      {identityVerified && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-green-600" />
          <div>
            <p className="font-bold text-green-900 text-sm">Identity Verified</p>
            <p className="text-xs text-green-700">Your identity has been verified with Stripe. Payouts are enabled.</p>
          </div>
        </div>
      )}

    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="bg-gray-100 dark:bg-gray-800 p-1 flex-wrap h-auto gap-1">
        <TabsTrigger value="overview" className="flex items-center gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
          <DollarSign className="w-4 h-4" /> Overview
        </TabsTrigger>
        <TabsTrigger value="schedule" className="flex items-center gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
          <Calendar className="w-4 h-4" /> Schedule
        </TabsTrigger>
        <TabsTrigger value="breakdown" className="flex items-center gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
          <BarChart3 className="w-4 h-4" /> Commission
        </TabsTrigger>
        <TabsTrigger value="methods" className="flex items-center gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
          <Settings className="w-4 h-4" /> Methods
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <PayoutOverview dealer={dealer} onUpdate={onUpdate} />
      </TabsContent>

      <TabsContent value="schedule">
        <PayoutScheduler dealer={dealer} onUpdate={onUpdate} />
      </TabsContent>

      <TabsContent value="breakdown">
        <CommissionBreakdown dealer={dealer} />
      </TabsContent>

      <TabsContent value="methods">
        <PayoutMethodSettings dealer={dealer} onUpdate={onUpdate} />
      </TabsContent>
    </Tabs>
    </div>
  );
}