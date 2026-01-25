import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Copy, Check, Download } from 'lucide-react';

export default function ContentGenerator({ dealerId, merchants, onContentGenerated }) {
  const [selectedMerchant, setSelectedMerchant] = useState('');
  const [contentType, setContentType] = useState('social_post');
  const [platform, setPlatform] = useState('facebook');
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('professional');
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleGenerate = async () => {
    if (!selectedMerchant || !topic) {
      alert('Please select a merchant and enter a topic');
      return;
    }

    setGenerating(true);
    try {
      const merchant = merchants.find(m => m.id === selectedMerchant);
      
      // Build AI prompt with merchant context
      const prompt = `Generate ${contentType} content for a merchant named "${merchant.business_name}".
      
Context:
- Business Type: ${merchant.business_name}
- Topic: ${topic}
- Tone: ${tone}
- Platform: ${platform}

Requirements:
- ${contentType === 'social_post' ? 'Keep it under 280 characters, engaging and shareable' : ''}
- ${contentType === 'email_newsletter' ? 'Create a compelling subject line and well-structured email body with sections' : ''}
- Include relevant hashtags if appropriate
- Add a clear call-to-action
- Make it ${tone} in tone

Generate the content in JSON format with these fields:
- title (subject line or headline)
- body (main content)
- hashtags (array of relevant hashtags)
- call_to_action (clear CTA)`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            body: { type: 'string' },
            hashtags: { type: 'array', items: { type: 'string' } },
            call_to_action: { type: 'string' }
          }
        }
      });

      setGeneratedContent({
        ...response,
        merchant_id: selectedMerchant,
        merchant_name: merchant.business_name,
        content_type: contentType,
        platform: platform
      });

    } catch (error) {
      console.error('Error generating content:', error);
      alert('Failed to generate content. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedContent) return;

    setSaving(true);
    try {
      await base44.entities.MarketingContent.create({
        dealer_id: dealerId,
        merchant_id: generatedContent.merchant_id,
        content_type: contentType,
        platform: platform,
        title: generatedContent.title,
        body: generatedContent.body,
        hashtags: generatedContent.hashtags || [],
        call_to_action: generatedContent.call_to_action,
        ai_generated: true,
        generation_prompt: topic,
        status: 'draft'
      });

      alert('Content saved successfully!');
      if (onContentGenerated) onContentGenerated();
      setGeneratedContent(null);
      setTopic('');
    } catch (error) {
      console.error('Error saving content:', error);
      alert('Failed to save content. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    if (!generatedContent) return;
    
    const text = `${generatedContent.title}\n\n${generatedContent.body}\n\n${generatedContent.hashtags?.map(h => `#${h}`).join(' ')}\n\n${generatedContent.call_to_action}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Generation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Content Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Select Merchant</Label>
            <Select value={selectedMerchant} onValueChange={setSelectedMerchant}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a merchant" />
              </SelectTrigger>
              <SelectContent>
                {merchants.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.business_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Content Type</Label>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="social_post">Social Post</SelectItem>
                  <SelectItem value="email_newsletter">Email Newsletter</SelectItem>
                  <SelectItem value="sms">SMS Message</SelectItem>
                  <SelectItem value="blog_post">Blog Post</SelectItem>
                  <SelectItem value="ad_copy">Ad Copy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="twitter">Twitter</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tone</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                <SelectItem value="friendly">Friendly</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Topic / Promotion</Label>
            <Textarea
              placeholder="E.g., Spring sale, new menu items, holiday special..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={3}
            />
          </div>

          <Button 
            onClick={handleGenerate} 
            disabled={generating || !selectedMerchant || !topic}
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Content
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Content Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Generated Content</CardTitle>
        </CardHeader>
        <CardContent>
          {!generatedContent ? (
            <div className="text-center py-12 text-gray-500">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>Your AI-generated content will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Badge className="mb-2">{generatedContent.merchant_name}</Badge>
                <h3 className="text-lg font-semibold mb-2">{generatedContent.title}</h3>
                <p className="text-gray-700 whitespace-pre-wrap mb-4">{generatedContent.body}</p>
                
                {generatedContent.hashtags && generatedContent.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {generatedContent.hashtags.map((tag, idx) => (
                      <Badge key={idx} variant="outline">#{tag}</Badge>
                    ))}
                  </div>
                )}

                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {generatedContent.call_to_action}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCopy} variant="outline" className="flex-1">
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
                <Button onClick={handleSave} disabled={saving} className="flex-1">
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}