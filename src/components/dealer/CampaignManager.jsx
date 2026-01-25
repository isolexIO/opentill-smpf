import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Target, TrendingUp, Lightbulb } from 'lucide-react';

export default function CampaignManager({ dealerId, merchants, campaigns, onUpdate }) {
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [newCampaign, setNewCampaign] = useState({
    campaign_name: '',
    campaign_type: 'social_media',
    target_segment: 'all',
    budget: 0
  });

  const handleGenerateSuggestions = async () => {
    setGeneratingSuggestions(true);
    try {
      // Analyze merchant data to generate campaign suggestions
      const merchantStats = merchants.map(m => ({
        name: m.business_name,
        revenue: m.total_revenue || 0,
        status: m.status
      }));

      const prompt = `Analyze these merchant statistics and suggest 3 targeted marketing campaigns:

Merchants: ${JSON.stringify(merchantStats, null, 2)}

For each campaign suggestion, provide:
1. Campaign name
2. Target segment (high_performers, new_merchants, struggling, or all)
3. Campaign type (social_media, email, multi_channel)
4. Description of the strategy
5. Expected impact
6. Recommended budget

Return as JSON array.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            campaigns: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  campaign_name: { type: 'string' },
                  target_segment: { type: 'string' },
                  campaign_type: { type: 'string' },
                  description: { type: 'string' },
                  expected_impact: { type: 'string' },
                  recommended_budget: { type: 'number' }
                }
              }
            }
          }
        }
      });

      setSuggestions(response.campaigns || []);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      alert('Failed to generate suggestions');
    } finally {
      setGeneratingSuggestions(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!newCampaign.campaign_name) {
      alert('Please enter a campaign name');
      return;
    }

    setCreating(true);
    try {
      await base44.entities.MarketingCampaign.create({
        dealer_id: dealerId,
        ...newCampaign,
        status: 'draft',
        target_merchants: newCampaign.target_segment === 'all' 
          ? merchants.map(m => m.id) 
          : []
      });

      alert('Campaign created successfully!');
      setShowCreate(false);
      setNewCampaign({
        campaign_name: '',
        campaign_type: 'social_media',
        target_segment: 'all',
        budget: 0
      });
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Failed to create campaign');
    } finally {
      setCreating(false);
    }
  };

  const useSuggestion = (suggestion) => {
    setNewCampaign({
      campaign_name: suggestion.campaign_name,
      campaign_type: suggestion.campaign_type,
      target_segment: suggestion.target_segment,
      budget: suggestion.recommended_budget
    });
    setSuggestions(null);
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      scheduled: 'bg-blue-100 text-blue-800',
      active: 'bg-green-100 text-green-800',
      completed: 'bg-purple-100 text-purple-800',
      paused: 'bg-yellow-100 text-yellow-800'
    };
    return colors[status] || colors.draft;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Campaign Management</h3>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleGenerateSuggestions} disabled={generatingSuggestions}>
            {generatingSuggestions ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Lightbulb className="w-4 h-4 mr-2" />
                Get AI Suggestions
              </>
            )}
          </Button>

          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Marketing Campaign</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Campaign Name</Label>
                  <Input
                    placeholder="e.g., Spring 2026 Promotion"
                    value={newCampaign.campaign_name}
                    onChange={(e) => setNewCampaign({...newCampaign, campaign_name: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Campaign Type</Label>
                  <Select value={newCampaign.campaign_type} onValueChange={(v) => setNewCampaign({...newCampaign, campaign_type: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="social_media">Social Media</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="multi_channel">Multi-Channel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Target Segment</Label>
                  <Select value={newCampaign.target_segment} onValueChange={(v) => setNewCampaign({...newCampaign, target_segment: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Merchants</SelectItem>
                      <SelectItem value="high_performers">High Performers</SelectItem>
                      <SelectItem value="new_merchants">New Merchants</SelectItem>
                      <SelectItem value="struggling">Struggling</SelectItem>
                      <SelectItem value="seasonal">Seasonal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Budget ($)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={newCampaign.budget}
                    onChange={(e) => setNewCampaign({...newCampaign, budget: parseFloat(e.target.value) || 0})}
                  />
                </div>

                <Button onClick={handleCreateCampaign} disabled={creating} className="w-full">
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Campaign'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* AI Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <Card className="border-2 border-purple-200 bg-purple-50 dark:bg-purple-900/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-900 dark:text-purple-100">
              <Lightbulb className="w-5 h-5" />
              AI-Powered Campaign Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {suggestions.map((suggestion, idx) => (
              <Card key={idx}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-semibold text-lg mb-1">{suggestion.campaign_name}</h4>
                      <div className="flex gap-2 mb-2">
                        <Badge>{suggestion.target_segment}</Badge>
                        <Badge variant="outline">{suggestion.campaign_type}</Badge>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => useSuggestion(suggestion)}>
                      Use This
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{suggestion.description}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Expected Impact:</span>
                      <p className="text-gray-600 dark:text-gray-400">{suggestion.expected_impact}</p>
                    </div>
                    <div>
                      <span className="font-medium">Budget:</span>
                      <p className="text-gray-600 dark:text-gray-400">${suggestion.recommended_budget}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Campaign List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {campaigns.length === 0 ? (
          <Card className="md:col-span-2">
            <CardContent className="text-center py-12">
              <Target className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">No campaigns yet. Create your first campaign to get started!</p>
            </CardContent>
          </Card>
        ) : (
          campaigns.map(campaign => (
            <Card key={campaign.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{campaign.campaign_name}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">{campaign.campaign_type}</p>
                  </div>
                  <Badge className={getStatusColor(campaign.status)}>
                    {campaign.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Target:</span>
                    <span className="font-medium">{campaign.target_segment}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Budget:</span>
                    <span className="font-medium">${campaign.budget || 0}</span>
                  </div>
                  {campaign.performance_metrics && (
                    <div className="pt-2 border-t">
                      <div className="flex justify-between text-xs">
                        <span>Clicks: {campaign.performance_metrics.clicks || 0}</span>
                        <span>Conversions: {campaign.performance_metrics.conversions || 0}</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}