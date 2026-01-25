import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Check, Copy } from 'lucide-react';

export default function DealerBrandingSettings({ dealer, onUpdate }) {
  const [saving, setSaving] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [formData, setFormData] = useState({
    logo_url: dealer.logo_url || '',
    favicon_url: dealer.favicon_url || '',
    primary_color: dealer.primary_color || '#7B2FD6',
    secondary_color: dealer.secondary_color || '#0FD17A',
    domain: dealer.domain || '',
    chainlink_subdomain: dealer.chainlink_subdomain || '',
  });

  const [previews, setPreviews] = useState({
    logo: dealer.logo_url,
    favicon: dealer.favicon_url,
  });

  const handleSave = async () => {
    try {
      setSaving(true);
      await base44.entities.Dealer.update(dealer.id, formData);
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

      {/* Domain Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Domain Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-2">Custom Domain</label>
              <Input
                value={formData.domain}
                onChange={(e) => setFormData({...formData, domain: e.target.value})}
                placeholder="pos.yourcompany.com"
              />
              <p className="text-xs text-gray-500 mt-1">Your custom domain for POS and merchant pages</p>
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">ChainLINK Subdomain</label>
              <div className="flex gap-2 items-center">
                <Input
                  value={formData.chainlink_subdomain}
                  disabled
                  className="bg-gray-50"
                />
                <Badge variant="outline">{formData.chainlink_subdomain ? 'Active' : 'Not Set'}</Badge>
              </div>
              <p className="text-xs text-gray-500 mt-1">Your unique subdomain (e.g., yourdealer.chainlink-pos.sol)</p>
              {formData.chainlink_subdomain && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(`${formData.chainlink_subdomain}.chainlink-pos.sol`, 'subdomain')}
                  className="mt-2 text-xs"
                >
                  {copiedField === 'subdomain' ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                  {copiedField === 'subdomain' ? 'Copied!' : 'Copy Full Domain'}
                </Button>
              )}
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900">
              <p className="font-medium mb-1">Domain Management</p>
              <p>Custom domains require DNS configuration. ChainLINK subdomains are automatically configured.</p>
            </div>
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