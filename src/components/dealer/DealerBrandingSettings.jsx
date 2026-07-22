import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Copy } from 'lucide-react';

export default function DealerBrandingSettings({ dealer, onUpdate }) {
  const [saving, setSaving] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [formData, setFormData] = useState({
    logo_url: dealer.logo_url || '',
    favicon_url: dealer.favicon_url || '',
    primary_color: dealer.primary_color || '#7B2FD6',
    secondary_color: dealer.secondary_color || '#0FD17A',
  });

  const [previews, setPreviews] = useState({
    logo: dealer.logo_url,
    favicon: dealer.favicon_url,
  });

  const handleSave = async () => {
    try {
      setSaving(true);
      await base44.entities.Ambassador.update(dealer.id, formData);
      onUpdate?.();
    } catch (error) {
      alert('Error updating branding: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const hasChanges = Object.keys(formData).some(key => formData[key] !== dealer[key]);

  return (
    <div className="space-y-6">
      {/* Logo & Favicon */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Logos & Icons</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium block mb-2">Logo URL</label>
              <Input
                value={formData.logo_url}
                onChange={(e) => {
                  setFormData({...formData, logo_url: e.target.value});
                  setPreviews({...previews, logo: e.target.value});
                }}
                placeholder="https://example.com/logo.png"
              />
              <p className="text-xs text-gray-500 mt-1">Recommended: 200x50px or larger</p>
              {previews.logo && (
                <div className="mt-3 p-3 bg-gray-50 rounded border">
                  <p className="text-xs text-gray-600 mb-2">Preview:</p>
                  <img src={previews.logo} alt="Logo" className="h-12 object-contain" />
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">Favicon URL</label>
              <Input
                value={formData.favicon_url}
                onChange={(e) => {
                  setFormData({...formData, favicon_url: e.target.value});
                  setPreviews({...previews, favicon: e.target.value});
                }}
                placeholder="https://example.com/favicon.ico"
              />
              <p className="text-xs text-gray-500 mt-1">Square image (32x32px or larger)</p>
              {previews.favicon && (
                <div className="mt-3 p-3 bg-gray-50 rounded border">
                  <p className="text-xs text-gray-600 mb-2">Preview:</p>
                  <img src={previews.favicon} alt="Favicon" className="h-8 w-8 object-contain" />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Brand Colors */}
      <Card>
        <CardHeader>
          <CardTitle>Brand Colors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium block mb-2">Primary Color</label>
              <div className="flex gap-3 items-center">
                <div className="flex-1 relative">
                  <input
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => setFormData({...formData, primary_color: e.target.value})}
                    className="w-full h-10 rounded cursor-pointer"
                  />
                </div>
                <Input
                  value={formData.primary_color}
                  onChange={(e) => setFormData({...formData, primary_color: e.target.value})}
                  className="w-24 text-xs"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(formData.primary_color, 'primary')}
                  title="Copy color code"
                >
                  {copiedField === 'primary' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Used for buttons, accents, and highlights</p>
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">Secondary Color</label>
              <div className="flex gap-3 items-center">
                <div className="flex-1 relative">
                  <input
                    type="color"
                    value={formData.secondary_color}
                    onChange={(e) => setFormData({...formData, secondary_color: e.target.value})}
                    className="w-full h-10 rounded cursor-pointer"
                  />
                </div>
                <Input
                  value={formData.secondary_color}
                  onChange={(e) => setFormData({...formData, secondary_color: e.target.value})}
                  className="w-24 text-xs"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(formData.secondary_color, 'secondary')}
                  title="Copy color code"
                >
                  {copiedField === 'secondary' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Used for gradients and secondary elements</p>
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg flex gap-3">
            <div className="flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded" style={{backgroundColor: formData.primary_color}}></div>
                <div className="w-6 h-6 rounded" style={{backgroundColor: formData.secondary_color}}></div>
              </div>
            </div>
            <p className="text-xs text-gray-600">These colors will be applied to your public-facing pages and customer displays.</p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          size="lg"
          className="gap-2"
        >
          {saving ? 'Saving...' : 'Save Branding Settings'}
        </Button>
      </div>
    </div>
  );
}