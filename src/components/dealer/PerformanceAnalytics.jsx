import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, Lightbulb, RefreshCw } from 'lucide-react';

export default function PerformanceAnalytics({ dealerId, campaigns }) {
  const [loading, setLoading] = useState(false);
  const [generatingRecommendations, setGeneratingRecommendations] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [analytics, setAnalytics] = useState({
    totalImpressions: 0,
    totalClicks: 0,
    totalConversions: 0,
    avgEngagementRate: 0,
    totalRevenue: 0,
    topPerformer: null,
    lowestPerformer: null
  });

  useEffect(() => {
    analyzePerformance();
  }, [campaigns]);

  const analyzePerformance = () => {
    if (!campaigns || campaigns.length === 0) return;

    const totalImpressions = campaigns.reduce((sum, c) => sum + (c.performance_metrics?.impressions || 0), 0);
    const totalClicks = campaigns.reduce((sum, c) => sum + (c.performance_metrics?.clicks || 0), 0);
    const totalConversions = campaigns.reduce((sum, c) => sum + (c.performance_metrics?.conversions || 0), 0);
    const totalRevenue = campaigns.reduce((sum, c) => sum + (c.performance_metrics?.revenue_generated || 0), 0);

    const engagementRates = campaigns.map(c => c.performance_metrics?.engagement_rate || 0);
    const avgEngagementRate = engagementRates.length > 0 
      ? engagementRates.reduce((sum, r) => sum + r, 0) / engagementRates.length 
      : 0;

    // Find top and lowest performers
    const activeCampaigns = campaigns.filter(c => c.performance_metrics);
    const topPerformer = activeCampaigns.reduce((best, c) => 
      (!best || (c.performance_metrics?.conversions || 0) > (best.performance_metrics?.conversions || 0)) ? c : best
    , null);
    const lowestPerformer = activeCampaigns.reduce((worst, c) => 
      (!worst || (c.performance_metrics?.conversions || 0) < (worst.performance_metrics?.conversions || 0)) ? c : worst
    , null);

    setAnalytics({
      totalImpressions,
      totalClicks,
      totalConversions,
      avgEngagementRate: avgEngagementRate.toFixed(2),
      totalRevenue,
      topPerformer,
      lowestPerformer
    });
  };

  const generateOptimizationRecommendations = async () => {
    setGeneratingRecommendations(true);
    try {
      const campaignData = campaigns.map(c => ({
        name: c.campaign_name,
        type: c.campaign_type,
        segment: c.target_segment,
        status: c.status,
        budget: c.budget,
        spent: c.actual_spend,
        metrics: c.performance_metrics
      }));

      const prompt = `Analyze these marketing campaign performances and provide 5 specific optimization recommendations:

Campaign Data: ${JSON.stringify(campaignData, null, 2)}

For each recommendation provide:
1. Title (brief recommendation)
2. Description (detailed explanation)
3. Priority (high, medium, low)
4. Expected impact (percentage improvement estimate)
5. Implementation steps (array of actions)

Return as JSON array.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            recommendations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  priority: { type: 'string' },
                  expected_impact: { type: 'string' },
                  implementation_steps: { type: 'array', items: { type: 'string' } }
                }
              }
            }
          }
        }
      });

      setRecommendations(response.recommendations || []);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      alert('Failed to generate recommendations');
    } finally {
      setGeneratingRecommendations(false);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-blue-100 text-blue-800'
    };
    return colors[priority?.toLowerCase()] || colors.medium;
  };

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Engagement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalImpressions.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">Impressions</p>
            <div className="text-sm text-gray-600 mt-2">
              {analytics.totalClicks.toLocaleString()} clicks • {analytics.totalConversions} conversions
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Avg. Engagement Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.avgEngagementRate}%</div>
            <p className="text-xs text-gray-500 mt-1">Across all campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Revenue Generated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">From campaigns</p>
          </CardContent>
        </Card>
      </div>

      {/* Top & Bottom Performers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {analytics.topPerformer && (
          <Card className="border-2 border-green-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Top Performer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <h4 className="font-semibold mb-2">{analytics.topPerformer.campaign_name}</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Conversions:</span>
                  <p className="font-bold text-green-600">
                    {analytics.topPerformer.performance_metrics?.conversions || 0}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Revenue:</span>
                  <p className="font-bold text-green-600">
                    ${(analytics.topPerformer.performance_metrics?.revenue_generated || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {analytics.lowestPerformer && (
          <Card className="border-2 border-orange-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-orange-600" />
                Needs Optimization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <h4 className="font-semibold mb-2">{analytics.lowestPerformer.campaign_name}</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Conversions:</span>
                  <p className="font-bold text-orange-600">
                    {analytics.lowestPerformer.performance_metrics?.conversions || 0}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Budget Used:</span>
                  <p className="font-bold text-orange-600">
                    ${(analytics.lowestPerformer.actual_spend || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* AI Recommendations */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-purple-600" />
              AI Optimization Recommendations
            </CardTitle>
            <Button 
              onClick={generateOptimizationRecommendations} 
              disabled={generatingRecommendations || campaigns.length === 0}
              variant="outline"
            >
              {generatingRecommendations ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate Recommendations
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recommendations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Lightbulb className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>Click "Generate Recommendations" to get AI-powered optimization suggestions</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recommendations.map((rec, idx) => (
                <Card key={idx} className="border-l-4 border-l-purple-500">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-semibold text-lg">{rec.title}</h4>
                      <Badge className={getPriorityColor(rec.priority)}>
                        {rec.priority} priority
                      </Badge>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 mb-3">{rec.description}</p>
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg mb-3">
                      <p className="text-sm font-medium text-green-900 dark:text-green-100">
                        Expected Impact: {rec.expected_impact}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Implementation Steps:</p>
                      <ul className="space-y-1">
                        {rec.implementation_steps?.map((step, stepIdx) => (
                          <li key={stepIdx} className="text-sm text-gray-600 dark:text-gray-400 flex items-start">
                            <span className="mr-2">•</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}