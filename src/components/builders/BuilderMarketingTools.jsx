import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2, Sparkles, Mail, Instagram, Twitter, MessageSquare, Globe, FileText,
  Copy, CheckCircle, Share2, Megaphone, Store, Users, AlertCircle,
} from 'lucide-react';

const PLATFORMS = [
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'instagram', label: 'Instagram', icon: Instagram },
  { key: 'twitter', label: 'Twitter/X', icon: Twitter },
  { key: 'sms', label: 'SMS', icon: MessageSquare },
  { key: 'google', label: 'Google', icon: Globe },
  { key: 'listing', label: 'Listing', icon: FileText },
];

const AUDIENCES = [
  { key: 'merchants', label: 'Merchants', icon: Store, desc: 'POS owners adding capabilities' },
  { key: 'ambassadors', label: 'Ambassadors', icon: Users, desc: 'Resellers recommending your Chip' },
  { key: 'both', label: 'Both', icon: Megaphone, desc: 'Merchants + ambassadors' },
];

export default function BuilderMarketingTools({ submissions, builder }) {
  const published = submissions.filter((s) => ['published', 'approved', 'submitted', 'reviewing'].includes(s.status));
  const [chipId, setChipId] = useState(published[0]?.id || '');
  const [platform, setPlatform] = useState('email');
  const [audience, setAudience] = useState('merchants');
  const [tone, setTone] = useState('professional');
  const [angle, setAngle] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const selectedChip = submissions.find((s) => s.id === chipId);
  const marketplaceUrl = selectedChip
    ? `${window.location.origin}${createPageUrl('Marketplace')}?chip=${selectedChip.id}`
    : '';

  const handleGenerate = async () => {
    if (!chipId) return;
    setLoading(true);
    setResult('');
    setError('');
    try {
      const res = await base44.functions.invoke('generateBuilderMarketing', {
        chipId,
        platform,
        tone,
        audience,
        customAngle: angle,
      });
      setResult(res.data?.content || '');
    } catch (err) {
      setError(err?.data?.error || err?.message || 'Error generating content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (submissions.length === 0) {
    return (
      <CardContent className="p-12 text-center">
        <Megaphone className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">Submit a Chip to unlock marketing tools</p>
        <p className="text-gray-500 text-sm mt-1">Generate promotional copy for your Chips to reach more merchants and ambassadors.</p>
      </CardContent>
    );
  }

  return (
    <CardContent className="p-6 space-y-5">
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold">Accurate, on-brand Chip marketing</p>
          <p className="text-blue-700 mt-0.5">Copy is generated from your Chip's real details and openTILL's actual capabilities — no overstated claims (e.g. EBT) will be made.</p>
        </div>
      </div>

      {/* Chip selector */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Select a Chip to market</Label>
        <Select value={chipId} onValueChange={setChipId}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a Chip" />
          </SelectTrigger>
          <SelectContent>
            {published.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name} <span className="text-gray-400 ml-1">({s.status})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {marketplaceUrl && (
          <p className="text-xs text-gray-500 truncate font-mono">Marketplace link: {marketplaceUrl}</p>
        )}
      </div>

      {/* Platform selector */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Platform / Format</Label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {PLATFORMS.map((p) => {
            const Icon = p.icon;
            return (
              <button
                key={p.key}
                onClick={() => setPlatform(p.key)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-xs font-medium ${
                  platform === p.key
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Audience selector */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Target Audience</Label>
        <div className="grid grid-cols-3 gap-2">
          {AUDIENCES.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.key}
                onClick={() => setAudience(a.key)}
                className={`flex flex-col items-start gap-1 p-3 rounded-xl border-2 transition-all text-left ${
                  audience === a.key
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{a.label}</span>
                </div>
                <span className="text-[11px] text-gray-500">{a.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tone + angle */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-sm">Tone</Label>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['professional', 'friendly', 'exciting', 'urgent', 'playful', 'luxury'].map((t) => (
                <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-sm">Extra Angle (optional)</Label>
          <Textarea
            placeholder="e.g. 'Save 10 hours/week on inventory', 'Built for multi-location restaurants'"
            value={angle}
            onChange={(e) => setAngle(e.target.value)}
            className="h-10 resize-none"
          />
        </div>
      </div>

      <Button
        onClick={handleGenerate}
        disabled={loading || !chipId}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
        ) : (
          <><Sparkles className="w-4 h-4 mr-2" /> Generate Marketing Copy</>
        )}
      </Button>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold text-emerald-600 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> Generated Copy
            </Label>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={copyToClipboard} className="text-gray-500 h-8">
                {copied ? <><CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Copied!</> : <><Copy className="w-3.5 h-3.5 mr-1" /> Copy</>}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleGenerate} className="text-gray-500 h-8">
                <Share2 className="w-3.5 h-3.5 mr-1" /> Regenerate
              </Button>
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
            {result}
          </div>
          {marketplaceUrl && platform !== 'listing' && (
            <p className="text-xs text-gray-500">
              Tip: include your marketplace link <span className="font-mono">{marketplaceUrl}</span> when you post.
            </p>
          )}
        </div>
      )}
    </CardContent>
  );
}