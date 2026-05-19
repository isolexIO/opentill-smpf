import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Calendar, Store, BarChart3, Settings } from 'lucide-react';
import PayoutOverview from './payout/PayoutOverview';
import PayoutScheduler from './payout/PayoutScheduler';
import MerchantPayoutControls from './payout/MerchantPayoutControls';
import CommissionBreakdown from './CommissionBreakdown';
import PayoutMethodSettings from './PayoutMethodSettings';

export default function PayoutDashboard({ dealer, onUpdate }) {
  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="bg-gray-100 dark:bg-gray-800 p-1 flex-wrap h-auto gap-1">
        <TabsTrigger value="overview" className="flex items-center gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
          <DollarSign className="w-4 h-4" /> Overview
        </TabsTrigger>
        <TabsTrigger value="merchants" className="flex items-center gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
          <Store className="w-4 h-4" /> Merchant Payouts
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

      <TabsContent value="merchants">
        <MerchantPayoutControls dealer={dealer} />
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
  );
}