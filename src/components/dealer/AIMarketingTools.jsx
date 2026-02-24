import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, TrendingUp, Target, BarChart3, Mail, MessageSquare, Share2, Copy, CheckCircle, Zap, Globe, Instagram, Twitter } from 'lucide-react';
import ContentGenerator from './ContentGenerator';
import CampaignManager from './CampaignManager';
import PerformanceAnalytics from './PerformanceAnalytics';

export default function AIMarketingTools({ dealerId }) {
  const [merchants, setMerchants] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalCampaigns: 0, activeCampaigns: 0, totalContent: 0, avgEngagement: 0 });

  // Quick AI tools state
  const [quickTool, setQuickTool] = useState('email');
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickResult, setQuickResult] = useState('');
  const [copied, setCopied] = useState(false);
  const [quickForm, setQuickForm] = useState({
    merchantType: 'restaurant',
    tone: 'professional',
    topic: '',
    platform: 'email'
  });

  useEffect(() => { loadData(); }, [dealerId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [merchantList, campaignList, contentList] = await Promise.all([
        base44.entities.Merchant.filter({ dealer_id: dealerId }),
        base44.entities.MarketingCampaign.filter({ dealer_id: dealerId }),
        base44.entities.MarketingContent.filter({ dealer_id: dealerId })
      ]);
      setMerchants(merchantList);
      setCampaigns(campaignList);
      const activeCampaigns = campaignList.filter(c => c.status === 'active').length;
      const totalEngagement = contentList.reduce((sum, c) => {
        const p = c.performance || {};
        return sum + (p.views || 0) + (p.likes || 0) + (p.clicks || 0);
      }, 0);
      setStats({
        totalCampaigns: campaignList.length,
        activeCampaigns,
        totalContent: contentList.length,
        avgEngagement: contentList.length > 0 ? Math.round(totalEngagement / contentList.length) : 0
      });
    } catch (err) {
      console.error('Error loading marketing data:', err);
    } finally { setLoading(false); }
  };

  const handleQuickGenerate = async () => {
    if (!quickForm.topic) return;
    setQuickLoading(true);
    setQuickResult('');
    try {
      const platformLabels = {
        email: 'email campaign',
        instagram: 'Instagram caption',
        twitter: 'Twitter/X post',
        sms: 'SMS message',
        google: 'Google Business post'
      };
      const prompt = `Write a ${platformLabels[quickTool]} for a ${quickForm.merchantType} business. 
Tone: ${quickForm.tone}.
Topic/Focus: ${quickForm.topic}.
${quickTool === 'email' ? 'Include a subject line, greeting, body (2-3 paragraphs), and CTA. Keep it under 200 words.' : ''}
${quickTool === 'instagram' ? 'Include engaging caption with emojis and 5-7 relevant hashtags. Max 150 words.' : ''}
${quickTool === 'twitter' ? 'Keep it under 280 characters, punchy and engaging with 1-2 hashtags.' : ''}
${quickTool === 'sms' ? 'Keep it under 160 characters, include a clear offer or CTA.' : ''}
${quickTool === 'google' ? 'Write a Google Business post, 100-150 words, highlighting value and including a CTA.' : ''}
Make it feel authentic and ready to use immediately.`;

      const result = await base44.integrations.Core.InvokeLLM({ prompt });
      setQuickResult(result);
    } catch (err) {
      setQuickResult('Error generating content. Please try again.');
    } finally { setQuickLoading(false); }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(quickResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-2" />
        <p className="text-gray-500 text-sm">Loading marketing tools...</p>
      </div>
    </div>
  );

  const platformIcons = {
    email: Mail,
    instagram: Instagram,
    twitter: Twitter,
    sms: MessageSquare,
    google: Globe
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Campaigns', value: stats.totalCampaigns, sub: `${stats.activeCampaigns} active`, icon: Target, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
          { label: 'Content Generated', value: stats.totalContent, sub: 'AI-powered', icon: Sparkles, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Avg. Engagement', value: stats.avgEngagement, sub: 'Per content piece', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Merchants', value: merchants.length, sub: 'Available to market', icon: BarChart3, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
        ].map((s, i) => (
          <Card key={i} className="dark:bg-gray-900 dark:border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 font-medium">{s.label}</span>
                <div className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                </div>
              </div>
              <div className="text-2xl font-black text-gray-900 dark:text-white">{s.value}</div>
              <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="quickgen" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="quickgen">
            <Zap className="w-4 h-4 mr-1.5" /> Quick Generate
          </TabsTrigger>
          <TabsTrigger value="generate">
            <Sparkles className="w-4 h-4 mr-1.5" /> Campaigns
          </TabsTrigger>
          <TabsTrigger value="campaigns">
            <Target className="w-4 h-4 mr-1.5" /> Campaign Manager
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="w-4 h-4 mr-1.5" /> Analytics
          </TabsTrigger>
        </TabsList>

        {/* Quick Content Generator */}
        <TabsContent value="quickgen">
          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                AI Content Quick Generator
                <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">Powered by AI</Badge>
              </CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">Generate ready-to-use marketing content for any platform in seconds</p>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Platform selector */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Platform</Label>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { key: 'email', label: 'Email', icon: Mail },
                    { key: 'instagram', label: 'Instagram', icon: Instagram },
                    { key: 'twitter', label: 'Twitter/X', icon: Twitter },
                    { key: 'sms', label: 'SMS', icon: MessageSquare },
                    { key: 'google', label: 'Google', icon: Globe },
                  ].map(p => {
                    const Icon = p.icon;
                    return (
                      <button key={p.key} onClick={() => setQuickTool(p.key)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-xs font-medium ${
                          quickTool === p.key
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                            : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                        }`}>
                        <Icon className="w-4 h-4" />
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-sm">Business Type</Label>
                  <Select value={quickForm.merchantType} onValueChange={v => setQuickForm({ ...quickForm, merchantType: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['restaurant', 'retail store', 'coffee shop', 'salon', 'food truck', 'bar', 'bakery', 'gym', 'boutique'].map(t => (
                        <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Tone</Label>
                  <Select value={quickForm.tone} onValueChange={v => setQuickForm({ ...quickForm, tone: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['professional', 'friendly', 'exciting', 'urgent', 'playful', 'luxury'].map(t => (
                        <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Topic / Offer *</Label>
                <Textarea
                  placeholder="e.g. 'Weekend happy hour 2-for-1 drinks' or 'New loyalty program launch' or 'Grand opening promotion'"
                  value={quickForm.topic}
                  onChange={e => setQuickForm({ ...quickForm, topic: e.target.value })}
                  className="h-20 resize-none"
                />
              </div>

              <Button onClick={handleQuickGenerate} disabled={quickLoading || !quickForm.topic}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold">
                {quickLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4 mr-2" /> Generate Content</>}
              </Button>

              {quickResult && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> Generated Content
                    </Label>
                    <Button size="sm" variant="ghost" onClick={copyToClipboard} className="text-gray-500 h-8">
                      {copied ? <><CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Copied!</> : <><Copy className="w-3.5 h-3.5 mr-1" /> Copy</>}
                    </Button>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                    {quickResult}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleQuickGenerate} className="flex-1">
                      <Sparkles className="w-3.5 h-3.5 mr-1" /> Regenerate
                    </Button>
                    <Button size="sm" variant="outline" onClick={copyToClipboard} className="flex-1">
                      <Share2 className="w-3.5 h-3.5 mr-1" /> Share
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generate">
          <ContentGenerator dealerId={dealerId} merchants={merchants} onContentGenerated={loadData} />
        </TabsContent>

        <TabsContent value="campaigns">
          <CampaignManager dealerId={dealerId} merchants={merchants} campaigns={campaigns} onUpdate={loadData} />
        </TabsContent>

        <TabsContent value="analytics">
          <PerformanceAnalytics dealerId={dealerId} campaigns={campaigns} />
        </TabsContent>
      </Tabs>
    </div>
  );
}