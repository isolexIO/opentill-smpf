import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, TrendingUp, Target, BarChart3, Plus } from 'lucide-react';
import ContentGenerator from './ContentGenerator';
import CampaignManager from './CampaignManager';
import PerformanceAnalytics from './PerformanceAnalytics';

export default function AIMarketingTools({ dealerId }) {
  const [merchants, setMerchants] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalContent: 0,
    avgEngagement: 0
  });

  useEffect(() => {
    loadData();
  }, [dealerId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load dealer's merchants
      const merchantList = await base44.entities.Merchant.filter({ dealer_id: dealerId });
      setMerchants(merchantList);

      // Load marketing campaigns
      const campaignList = await base44.entities.MarketingCampaign.filter({ dealer_id: dealerId });
      setCampaigns(campaignList);

      // Load marketing content
      const contentList = await base44.entities.MarketingContent.filter({ dealer_id: dealerId });

      // Calculate stats
      const activeCampaigns = campaignList.filter(c => c.status === 'active').length;
      const totalEngagement = contentList.reduce((sum, c) => {
        const perf = c.performance || {};
        return sum + (perf.views || 0) + (perf.likes || 0) + (perf.clicks || 0);
      }, 0);

      setStats({
        totalCampaigns: campaignList.length,
        activeCampaigns,
        totalContent: contentList.length,
        avgEngagement: contentList.length > 0 ? Math.round(totalEngagement / contentList.length) : 0
      });

    } catch (error) {
      console.error('Error loading marketing data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Campaigns
            </CardTitle>
            <Target className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCampaigns}</div>
            <p className="text-xs text-green-600 mt-1">
              {stats.activeCampaigns} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Content Generated
            </CardTitle>
            <Sparkles className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalContent}</div>
            <p className="text-xs text-gray-500 mt-1">AI-powered content</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Avg. Engagement
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgEngagement}</div>
            <p className="text-xs text-gray-500 mt-1">Per content piece</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Merchants
            </CardTitle>
            <BarChart3 className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{merchants.length}</div>
            <p className="text-xs text-gray-500 mt-1">Available for marketing</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="generate" className="space-y-4">
        <TabsList>
          <TabsTrigger value="generate">
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Content
          </TabsTrigger>
          <TabsTrigger value="campaigns">
            <Target className="w-4 h-4 mr-2" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate">
          <ContentGenerator 
            dealerId={dealerId} 
            merchants={merchants}
            onContentGenerated={loadData}
          />
        </TabsContent>

        <TabsContent value="campaigns">
          <CampaignManager 
            dealerId={dealerId}
            merchants={merchants}
            campaigns={campaigns}
            onUpdate={loadData}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <PerformanceAnalytics 
            dealerId={dealerId}
            campaigns={campaigns}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}