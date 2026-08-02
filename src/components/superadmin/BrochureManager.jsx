import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { QrCode, Copy, Check, Plus, Trash2, ExternalLink, Loader2, BookOpen } from 'lucide-react';
import QRCode from 'qrcode';

const DEFAULTS = {
  enabled: true,
  title: 'openTILL SMPF',
  tagline: 'The blockchain-integrated Point of Sale for modern commerce.',
  description:
    'One platform for checkout, payments, crypto, loyalty, and white-label networks — built for restaurants, retail, and modern merchants.',
  hero_image_url: '',
  accent_color: '#7B2FD6',
  secondary_color: '#0FD17A',
  cta_text: 'Start Free Trial',
  cta_url: '/',
  contact_email: '',
  website: '',
  show_qr: true,
  sections: [],
};

export default function BrochureManager() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setErr('');
    try {
      const records = await base44.entities.BrochureSettings.list();
      const found = records && records[0];
      const data = found ? { ...DEFAULTS, ...found } : DEFAULTS;
      setSettings(data);
      buildQr();
    } catch (e) {
      setErr('Could not load brochure settings: ' + (e.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function buildQr() {
    try {
      const url = `${window.location.origin}${createPageUrl('Brochure')}`;
      const dataUrl = await QRCode.toDataURL(url, { width: 320, margin: 1 });
      setQrUrl(dataUrl);
    } catch (e) {
      setQrUrl('');
    }
  }

  function update(patch) {
    setSettings((s) => ({ ...s, ...patch }));
  }

  function updateSection(id, patch) {
    setSettings((s) => ({
      ...s,
      sections: (s.sections || []).map((sec) => (sec.id === id ? { ...sec, ...patch } : sec)),
    }));
  }

  function addSection() {
    const id = 'sec_' + Math.random().toString(36).slice(2, 9);
    setSettings((s) => ({
      ...s,
      sections: [...(s.sections || []), { id, icon: 'Sparkles', title: 'New Section', description: '', bullets: [] }],
    }));
  }

  function removeSection(id) {
    setSettings((s) => ({ ...s, sections: (s.sections || []).filter((sec) => sec.id !== id) }));
  }

  async function save() {
    setSaving(true);
    setMsg('');
    setErr('');
    try {
      const payload = { ...settings };
      // normalize bullets from textarea into arrays handled in render; ensure array
      payload.sections = (payload.sections || []).map((sec) => ({
        id: sec.id || 'sec_' + Math.random().toString(36).slice(2, 9),
        icon: sec.icon || 'Sparkles',
        title: sec.title || 'Section',
        description: sec.description || '',
        bullets: Array.isArray(sec.bullets) ? sec.bullets : [],
      }));
      if (settings.id) {
        await base44.entities.BrochureSettings.update(settings.id, payload);
      } else {
        const created = await base44.entities.BrochureSettings.create(payload);
        if (created) payload.id = created.id;
      }
      setSettings(payload);
      setMsg('Brochure saved. Public link is ready.');
      buildQr();
    } catch (e) {
      setErr('Save failed: ' + (e.message || e));
    } finally {
      setSaving(false);
    }
  }

  function copyLink() {
    const url = `${window.location.origin}${createPageUrl('Brochure')}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const brochureUrl = `${window.location.origin}${createPageUrl('Brochure')}`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-600" />
            <div>
              <CardTitle>Interactive Brochure</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                A public, shareable brochure that showcases the full openTILL SMPF platform. Share the QR code or direct link.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-sm font-medium">Brochure published</Label>
              <p className="text-xs text-gray-500 mt-0.5">When off, the public page shows a "coming soon" notice.</p>
            </div>
            <Switch checked={!!settings.enabled} onCheckedChange={(v) => update({ enabled: v })} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Public link</Label>
              <div className="flex gap-2">
                <Input readOnly value={brochureUrl} className="text-xs" />
                <Button variant="outline" size="sm" onClick={copyLink}>
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Open live page</Label>
              <Button variant="outline" size="sm" className="w-full" onClick={() => window.open(brochureUrl, '_blank')}>
                <ExternalLink className="w-4 h-4 mr-2" /> View brochure
              </Button>
            </div>
          </div>

          {settings.show_qr && qrUrl && (
            <div className="flex flex-col items-center gap-2 rounded-lg border p-4">
              <Label className="text-xs uppercase tracking-wide text-gray-500">QR code — direct link</Label>
              <img src={qrUrl} alt="Brochure QR code" className="w-40 h-40 rounded-lg border" />
              <p className="text-xs text-gray-500">Scan to open the brochure on any device.</p>
              <a href={qrUrl} download="opentill-brochure-qr.png" className="text-xs text-blue-600 hover:underline">
                Download QR image
              </a>
            </div>
          )}

          {msg && (
            <Alert className="bg-green-50 border-green-200">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{msg}</AlertDescription>
            </Alert>
          )}
          {err && (
            <Alert className="bg-red-50 border-red-200">
              <AlertDescription className="text-red-800">{err}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Branding &amp; content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input value={settings.title} onChange={(e) => update({ title: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Tagline</Label>
              <Input value={settings.tagline} onChange={(e) => update({ tagline: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Intro description</Label>
            <Textarea
              rows={3}
              value={settings.description}
              onChange={(e) => update({ description: e.target.value })}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Hero image URL (optional)</Label>
              <Input
                value={settings.hero_image_url || ''}
                onChange={(e) => update({ hero_image_url: e.target.value })}
                placeholder="https://…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Accent color</Label>
                <Input type="color" value={settings.accent_color} onChange={(e) => update({ accent_color: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Secondary color</Label>
                <Input
                  type="color"
                  value={settings.secondary_color}
                  onChange={(e) => update({ secondary_color: e.target.value })}
                />
              </div>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>CTA button text</Label>
              <Input value={settings.cta_text} onChange={(e) => update({ cta_text: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>CTA link</Label>
              <Input value={settings.cta_url} onChange={(e) => update({ cta_url: e.target.value })} placeholder="/" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Contact email</Label>
              <Input
                value={settings.contact_email || ''}
                onChange={(e) => update({ contact_email: e.target.value })}
                placeholder="hello@opentill.io"
              />
            </div>
            <div className="space-y-1">
              <Label>Website</Label>
              <Input
                value={settings.website || ''}
                onChange={(e) => update({ website: e.target.value })}
                placeholder="https://opentill.io"
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <QrCode className="w-4 h-4" /> Show QR code on brochure
            </Label>
            <Switch checked={!!settings.show_qr} onCheckedChange={(v) => update({ show_qr: v })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Sections</CardTitle>
            <Button size="sm" variant="outline" onClick={addSection}>
              <Plus className="w-4 h-4 mr-1" /> Add section
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Leave empty to use the built-in platform overview. Lucide icon names (e.g. ShoppingCart, Wallet, Vault).
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {(settings.sections || []).length === 0 && (
            <div className="text-sm text-gray-500 italic">Using built-in defaults — add a section to customize.</div>
          )}
          {(settings.sections || []).map((sec) => (
            <div key={sec.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{sec.id}</span>
                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => removeSection(sec.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid sm:grid-cols-[120px_1fr] gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Icon</Label>
                  <Input value={sec.icon} onChange={(e) => updateSection(sec.id, { icon: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Title</Label>
                  <Input value={sec.title} onChange={(e) => updateSection(sec.id, { title: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Textarea
                  rows={2}
                  value={sec.description}
                  onChange={(e) => updateSection(sec.id, { description: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Bullets (one per line)</Label>
                <Textarea
                  rows={3}
                  value={(sec.bullets || []).join('\n')}
                  onChange={(e) =>
                    updateSection(sec.id, {
                      bullets: e.target.value.split('\n').map((b) => b.trim()).filter(Boolean),
                    })
                  }
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
          {saving ? 'Saving…' : 'Save brochure'}
        </Button>
      </div>
    </div>
  );
}