import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, Lightbulb, TrendingUp, Package, Users, CheckCircle, AlertCircle } from 'lucide-react';

export default function AIAssistantPage() {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    generateInsights();
  }, []);

  const generateInsights = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await base44.functions.invoke('getMerchantAIInsights');
      
      if (data.success) {
        setInsights(data.insights);
        setLastUpdated(new Date(data.metadata.analysisDate));
      } else {
        setError(data.error || 'Failed to generate insights');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to generate insights. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
              <Lightbulb className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Business Insights</h1>
              <p className="text-gray-500 dark:text-gray-400">Smart analysis of your sales, inventory, and customers</p>
            </div>
          </div>
          <Button onClick={generateInsights} disabled={loading} variant="outline" size="lg">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Analyzing...' : 'Regenerate'}
          </Button>
        </div>

        {/* Last Updated */}
        {lastUpdated && (
          <p className="text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleString()}
          </p>
        )}

        {/* Error Alert */}
        {error && (
          <Alert className="bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {loading && !insights && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
              <p className="text-gray-600">Analyzing your business data...</p>
            </div>
          </div>
        )}

        {/* Insights Cards */}
        {insights && (
          <div className="space-y-6">
            {/* Sales Insights */}
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <CardTitle>Sales Trends & Performance</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{insights.salesInsights}</p>
              </CardContent>
            </Card>

            {/* Inventory Recommendations */}
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-orange-600" />
                  <CardTitle>Inventory Management</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{insights.inventoryRecommendations}</p>
              </CardContent>
            </Card>

            {/* Customer Insights */}
            <Card className="border-l-4 border-l-green-500">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-600" />
                  <CardTitle>Customer Behavior & Loyalty</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{insights.customerInsights}</p>
              </CardContent>
            </Card>

            {/* Action Items */}
            <Card className="border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-purple-600" />
                  <CardTitle>Recommended Action Items</CardTitle>
                  <CardDescription>Prioritize these improvements for business growth</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {insights.actionItems?.map((item, idx) => (
                    <li key={idx} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                        {idx + 1}
                      </span>
                      <span className="text-gray-700 dark:text-gray-300">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}