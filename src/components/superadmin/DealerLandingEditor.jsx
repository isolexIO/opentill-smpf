import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Save, ExternalLink, Loader2 } from 'lucide-react';
import { createPageUrl } from '@/utils';

const ICON_OPTIONS = [
  { value: 'CheckCircle', label: 'Check Circle' },
  { value: 'DollarSign', label: 'Dollar Sign' },
  { value: 'Users', label: 'Users' },
  { value: 'Globe', label: 'Globe' },
  { value: 'Shield', label: 'Shield' },
  { value: 'Zap', label: 'Zap' },
  { value: 'TrendingUp', label: 'Trending Up' },
  { value: 'Building2', label: 'Building' }
];

const COLOR_PRESETS = [
  { value: '#10b981', label: 'Emerald' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#facc15', label: 'Yellow' },
  { value: '#ef4444', label: 'Red' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' }
];

export default function DealerLandingEditor() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const settingsList = await base44.entities.DealerLandingSettings.list();
      
      if (settingsList && settingsList.length > 0) {
        setSettings(settingsList[0]);
      } else {
        // Create default settings
        const defaultSettings = {
          hero: {
            headline: "Welcome to ChainLINK Dealer Portal",
            subheadline: "Manage your white-label network, merchants, and commissions from one powerful dashboard.",
            badge_text: "White-Label POS Platform"
          },
          feature_boxes: [
            {
              icon: "CheckCircle",
              icon_color: "#10b981",
              title: "Full White Label",
              description: "Custom branding, domain, and logo"
            },
            {
              icon: "DollarSign",
              icon_color: "#10b981",
              title: "Earn Commissions",
              description: "10-30% recurring revenue"
            },
            {
              icon: "Users",
              icon_color: "#10b981",
              title: "Merchant Portal",
              description: "Your merchants, your brand"
            },
            {
              icon: "Globe",
              icon_color: "#10b981",
              title: "Custom Domain",
              description: "yourcompany.com/pos"
            }
          ],
          bottom_features: [
            {
              icon: "Zap",
              icon_color: "#facc15",
              title: "Quick Setup",
              description: "Launch your branded POS platform in minutes. No coding required."
            },
            {
              icon: "Shield",
              icon_color: "#3b82f6",
              title: "Secure & Compliant",
              description: "PCI-DSS Level 1, SOC 2 Type II, and full EBT/SNAP compliance."
            },
            {
              icon: "TrendingUp",
              icon_color: "#10b981",
              title: "Recurring Revenue",
              description: "Earn 10-30% commission on every merchant subscription, monthly."
            }
          ],
          success_stories: []
        };
        
        const created = await base44.entities.DealerLandingSettings.create(defaultSettings);
        setSettings(created);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.DealerLandingSettings.update(settings.id, settings);
      alert('Ambassador Hub settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const updateHero = (field, value) => {
    setSettings({
      ...settings,
      hero: {
        ...settings.hero,
        [field]: value
      }
    });
  };

  const updateFeatureBox = (index, field, value) => {
    const newBoxes = [...settings.feature_boxes];
    newBoxes[index] = {
      ...newBoxes[index],
      [field]: value
    };
    setSettings({
      ...settings,
      feature_boxes: newBoxes
    });
  };

  const addFeatureBox = () => {
    setSettings({
      ...settings,
      feature_boxes: [
        ...settings.feature_boxes,
        {
          icon: "CheckCircle",
          icon_color: "#10b981",
          title: "New Feature",
          description: "Description"
        }
      ]
    });
  };

  const removeFeatureBox = (index) => {
    const newBoxes = settings.feature_boxes.filter((_, i) => i !== index);
    setSettings({
      ...settings,
      feature_boxes: newBoxes
    });
  };

  const updateBottomFeature = (index, field, value) => {
    const newFeatures = [...settings.bottom_features];
    newFeatures[index] = {
      ...newFeatures[index],
      [field]: value
    };
    setSettings({
      ...settings,
      bottom_features: newFeatures
    });
  };

  const addBottomFeature = () => {
    setSettings({
      ...settings,
      bottom_features: [
        ...settings.bottom_features,
        {
          icon: "Zap",
          icon_color: "#10b981",
          title: "New Feature",
          description: "Description"
        }
      ]
    });
  };

  const removeBottomFeature = (index) => {
    const newFeatures = settings.bottom_features.filter((_, i) => i !== index);
    setSettings({
      ...settings,
      bottom_features: newFeatures
    });
  };

  const updateSuccessStory = (index, field, value) => {
    const stories = [...(settings.success_stories || [])];
    stories[index] = { ...stories[index], [field]: value };
    setSettings({ ...settings, success_stories: stories });
  };

  const addSuccessStory = () => {
    setSettings({
      ...settings,
      success_stories: [
        ...(settings.success_stories || []),
        { name: '', role: '', quote: '', stars: 5, image: '', hidden: false }
      ]
    });
  };

  const removeSuccessStory = (index) => {
    const stories = (settings.success_stories || []).filter((_, i) => i !== index);
    setSettings({ ...settings, success_stories: stories });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-500">Loading Ambassador Hub settings...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">Failed to load settings</p>
            <Button onClick={loadSettings} className="mt-4">Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Ambassador Hub Editor</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Customize the Ambassador Hub landing page content</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => window.open(createPageUrl('DealerLanding'), '_blank')}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="hero" className="space-y-6">
        <TabsList>
          <TabsTrigger value="hero">Hero Section</TabsTrigger>
          <TabsTrigger value="top_features">Top Features (4 boxes)</TabsTrigger>
          <TabsTrigger value="bottom_features">Bottom Features (3 cards)</TabsTrigger>
          <TabsTrigger value="success_stories">Success Stories</TabsTrigger>
        </TabsList>

        {/* Hero Section */}
        <TabsContent value="hero">
          <Card>
            <CardHeader>
              <CardTitle>Hero Section</CardTitle>
              <CardDescription>Main headline and badge text</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Badge Text</Label>
                <Input
                  value={settings.hero.badge_text}
                  onChange={(e) => updateHero('badge_text', e.target.value)}
                  placeholder="White-Label POS Platform"
                />
              </div>

              <div>
                <Label>Headline</Label>
                <Textarea
                  value={settings.hero.headline}
                  onChange={(e) => updateHero('headline', e.target.value)}
                  rows={2}
                  placeholder="Welcome to ChainLINK Dealer Portal"
                />
              </div>

              <div>
                <Label>Subheadline</Label>
                <Textarea
                  value={settings.hero.subheadline}
                  onChange={(e) => updateHero('subheadline', e.target.value)}
                  rows={3}
                  placeholder="Manage your white-label network..."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Features */}
        <TabsContent value="top_features">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Top Feature Boxes</CardTitle>
                  <CardDescription>4 feature boxes displayed in a 2x2 grid below the hero</CardDescription>
                </div>
                <Button onClick={addFeatureBox} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Box
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {settings.feature_boxes.map((box, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-4 bg-gray-50 dark:bg-gray-800">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Feature Box {index + 1}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFeatureBox(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Icon</Label>
                      <Select
                        value={box.icon}
                        onValueChange={(value) => updateFeatureBox(index, 'icon', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ICON_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Icon Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={box.icon_color}
                          onChange={(e) => updateFeatureBox(index, 'icon_color', e.target.value)}
                          className="w-20"
                        />
                        <Select
                          value={box.icon_color}
                          onValueChange={(value) => updateFeatureBox(index, 'icon_color', value)}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COLOR_PRESETS.map(color => (
                              <SelectItem key={color.value} value={color.value}>
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 rounded" style={{ backgroundColor: color.value }}></div>
                                  {color.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Title</Label>
                    <Input
                      value={box.title}
                      onChange={(e) => updateFeatureBox(index, 'title', e.target.value)}
                      placeholder="Full White Label"
                    />
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Input
                      value={box.description}
                      onChange={(e) => updateFeatureBox(index, 'description', e.target.value)}
                      placeholder="Custom branding, domain, and logo"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bottom Features */}
        <TabsContent value="bottom_features">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Bottom Feature Cards</CardTitle>
                  <CardDescription>3 larger feature cards displayed at the bottom of the page</CardDescription>
                </div>
                <Button onClick={addBottomFeature} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Card
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {settings.bottom_features.map((feature, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-4 bg-gray-50 dark:bg-gray-800">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Feature Card {index + 1}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBottomFeature(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Icon</Label>
                      <Select
                        value={feature.icon}
                        onValueChange={(value) => updateBottomFeature(index, 'icon', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ICON_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Icon Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={feature.icon_color}
                          onChange={(e) => updateBottomFeature(index, 'icon_color', e.target.value)}
                          className="w-20"
                        />
                        <Select
                          value={feature.icon_color}
                          onValueChange={(value) => updateBottomFeature(index, 'icon_color', value)}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COLOR_PRESETS.map(color => (
                              <SelectItem key={color.value} value={color.value}>
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 rounded" style={{ backgroundColor: color.value }}></div>
                                  {color.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Title</Label>
                    <Input
                      value={feature.title}
                      onChange={(e) => updateBottomFeature(index, 'title', e.target.value)}
                      placeholder="Quick Setup"
                    />
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={feature.description}
                      onChange={(e) => updateBottomFeature(index, 'description', e.target.value)}
                      rows={2}
                      placeholder="Launch your branded POS platform in minutes..."
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Success Stories */}
        <TabsContent value="success_stories">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Success Stories</CardTitle>
                  <CardDescription>Testimonials shown on the Ambassador Hub. When none are added, built-in defaults are shown.</CardDescription>
                </div>
                <Button onClick={addSuccessStory} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Story
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {(settings.success_stories || []).length === 0 && (
                <p className="text-sm text-gray-500">No success stories yet. The Ambassador Hub will show built-in defaults.</p>
              )}
              {(settings.success_stories || []).map((story, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-4 bg-gray-50 dark:bg-gray-800">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Story {index + 1}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSuccessStory(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={story.name || ''}
                        onChange={(e) => updateSuccessStory(index, 'name', e.target.value)}
                        placeholder="Marcus T."
                      />
                    </div>
                    <div>
                      <Label>Role / Location</Label>
                      <Input
                        value={story.role || ''}
                        onChange={(e) => updateSuccessStory(index, 'role', e.target.value)}
                        placeholder="Tech Reseller, Miami"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Quote</Label>
                    <Textarea
                      value={story.quote || ''}
                      onChange={(e) => updateSuccessStory(index, 'quote', e.target.value)}
                      rows={3}
                      placeholder="Went from 0 to 22 merchants in 4 months..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Stars (1-5)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={5}
                        value={story.stars ?? 5}
                        onChange={(e) => updateSuccessStory(index, 'stars', Math.max(1, Math.min(5, parseInt(e.target.value) || 5)))}
                      />
                    </div>
                    <div>
                      <Label>Image URL (optional)</Label>
                      <Input
                        value={story.image || ''}
                        onChange={(e) => updateSuccessStory(index, 'image', e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!story.hidden}
                      onChange={(e) => updateSuccessStory(index, 'hidden', e.target.checked)}
                    />
                    Hide this story from the public page
                  </label>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}