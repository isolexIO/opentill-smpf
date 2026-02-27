import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ExternalLink, Plus, Trash2, Loader2 } from 'lucide-react';
import { createPageUrl } from '@/utils';

const DEFAULT_SETTINGS = {
  hero_headline: 'Build the Future of POS',
  hero_subheadline: 'Create powerful Chips and monetize your innovations on the openTILL marketplace.',
  hero_cta_text: 'Start Building',
  hero_docs_text: 'View Docs',
  hero_docs_url: 'https://docs.opentill.io/chips',
  revenue_share: '70%',
  features: [
    { icon: 'Code2', title: 'Easy Integration', description: 'Build with our SDK and connect your Chip to the marketplace in minutes.' },
    { icon: 'TrendingUp', title: 'Earn Money', description: 'Set your own pricing and earn up to 70% revenue share on every sale.' },
    { icon: 'Users', title: 'Global Audience', description: 'Access thousands of merchants using openTILL across the world.' },
    { icon: 'Shield', title: 'Secure & Verified', description: 'Verified developer badges and secure payment processing via Stripe.' },
    { icon: 'Zap', title: 'Real-time Analytics', description: 'Track sales, installations, and earnings with detailed dashboards.' },
  ],
  how_it_works: [
    { num: '1', title: 'Set Up', desc: 'Create your builder account and connect Stripe' },
    { num: '2', title: 'Build', desc: 'Develop your Chip using our SDK and tools' },
    { num: '3', title: 'Submit', desc: 'Submit for review and get published' },
    { num: '4', title: 'Earn', desc: 'Earn revenue as merchants install your Chip' },
  ],
  cta_headline: 'Ready to Start Building?',
  cta_subheadline: 'Join our community of developers and earn money from day one.',
  contact_email: 'builders@opentill.io',
  discord_url: 'https://discord.gg/opentill',
};

export default function BuilderSplashEditor() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const list = await base44.entities.BuilderSplashSettings.list();
      if (list.length > 0) {
        setSettings(list[0]);
      } else {
        const created = await base44.entities.BuilderSplashSettings.create(DEFAULT_SETTINGS);
        setSettings(created);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.BuilderSplashSettings.update(settings.id, settings);
      alert('Builder splash page saved!');
    } catch (e) {
      alert('Save failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const set = (key, val) => setSettings(s => ({ ...s, [key]: val }));

  const updateFeature = (i, field, val) => {
    const arr = [...settings.features];
    arr[i] = { ...arr[i], [field]: val };
    set('features', arr);
  };
  const addFeature = () => set('features', [...settings.features, { icon: 'Zap', title: 'New Feature', description: '' }]);
  const removeFeature = (i) => set('features', settings.features.filter((_, idx) => idx !== i));

  const updateStep = (i, field, val) => {
    const arr = [...settings.how_it_works];
    arr[i] = { ...arr[i], [field]: val };
    set('how_it_works', arr);
  };
  const addStep = () => set('how_it_works', [...settings.how_it_works, { num: String(settings.how_it_works.length + 1), title: 'New Step', desc: '' }]);
  const removeStep = (i) => set('how_it_works', settings.how_it_works.filter((_, idx) => idx !== i));

  if (loading) return <div className="p-8 text-center text-gray-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">Builder Splash Page Editor</h3>
          <p className="text-sm text-gray-500">Edit the public builder landing page (Builders page)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.open(createPageUrl('Builders'), '_blank')}>
            <ExternalLink className="w-4 h-4 mr-1" /> Preview
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Saving...</> : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Hero */}
      <Card>
        <CardHeader><CardTitle>Hero Section</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Headline</Label>
            <Input value={settings.hero_headline} onChange={e => set('hero_headline', e.target.value)} />
          </div>
          <div>
            <Label>Subheadline</Label>
            <Textarea rows={2} value={settings.hero_subheadline} onChange={e => set('hero_subheadline', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>CTA Button Text</Label>
              <Input value={settings.hero_cta_text} onChange={e => set('hero_cta_text', e.target.value)} />
            </div>
            <div>
              <Label>Docs Button Text</Label>
              <Input value={settings.hero_docs_text} onChange={e => set('hero_docs_text', e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Docs URL</Label>
            <Input value={settings.hero_docs_url} onChange={e => set('hero_docs_url', e.target.value)} />
          </div>
          <div>
            <Label>Revenue Share (displayed in "Earn Money" feature)</Label>
            <Input value={settings.revenue_share} onChange={e => set('revenue_share', e.target.value)} placeholder="70%" className="w-32" />
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div><CardTitle>Features</CardTitle><CardDescription>Why Build on openTILL section</CardDescription></div>
            <Button size="sm" variant="outline" onClick={addFeature}><Plus className="w-4 h-4 mr-1" />Add</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.features.map((f, i) => (
            <div key={i} className="flex gap-3 items-start p-3 border rounded-lg">
              <div className="flex-1 space-y-2">
                <Input placeholder="Title" value={f.title} onChange={e => updateFeature(i, 'title', e.target.value)} />
                <Input placeholder="Description" value={f.description} onChange={e => updateFeature(i, 'description', e.target.value)} />
              </div>
              <Button variant="ghost" size="icon" className="text-red-500" onClick={() => removeFeature(i)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div><CardTitle>How It Works</CardTitle><CardDescription>Step-by-step section</CardDescription></div>
            <Button size="sm" variant="outline" onClick={addStep}><Plus className="w-4 h-4 mr-1" />Add</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.how_it_works.map((step, i) => (
            <div key={i} className="flex gap-3 items-start p-3 border rounded-lg">
              <Input className="w-14" placeholder="#" value={step.num} onChange={e => updateStep(i, 'num', e.target.value)} />
              <div className="flex-1 space-y-2">
                <Input placeholder="Title" value={step.title} onChange={e => updateStep(i, 'title', e.target.value)} />
                <Input placeholder="Description" value={step.desc} onChange={e => updateStep(i, 'desc', e.target.value)} />
              </div>
              <Button variant="ghost" size="icon" className="text-red-500" onClick={() => removeStep(i)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* CTA & Contact */}
      <Card>
        <CardHeader><CardTitle>CTA & Footer</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>CTA Headline</Label>
            <Input value={settings.cta_headline} onChange={e => set('cta_headline', e.target.value)} />
          </div>
          <div>
            <Label>CTA Subheadline</Label>
            <Input value={settings.cta_subheadline} onChange={e => set('cta_subheadline', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Contact Email</Label>
              <Input value={settings.contact_email} onChange={e => set('contact_email', e.target.value)} />
            </div>
            <div>
              <Label>Discord URL</Label>
              <Input value={settings.discord_url} onChange={e => set('discord_url', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}