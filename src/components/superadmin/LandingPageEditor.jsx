import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Home, TrendingUp, MessageSquare, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { createPageUrl } from '@/utils';

const FEATURE_ICON_OPTIONS = ['DollarSign', 'Wallet', 'CreditCard', 'Package', 'BarChart3', 'Cpu', 'Shield', 'ChefHat', 'Monitor', 'FileText', 'Truck', 'Terminal', 'Lock', 'Store', 'Users', 'Activity', 'Star'];
const FEATURE_ACCENT_OPTIONS = ['green', 'purple', 'blue', 'indigo', 'orange', 'emerald', 'pink', 'teal', 'cyan', 'amber'];

export default function LandingPageEditor() {
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settingsList = await base44.entities.LandingPageSettings.list();
      
      if (settingsList && settingsList.length > 0) {
        setSettings(settingsList[0]);
      } else {
        // Create default settings
        const defaultSettings = {
          hero: {
            badge_status: 'now_available', // New field
            badge_text: '', // New field
            headline: 'The Future of Point of Sale',
            subheadline: 'Accept cash, card, crypto, and EBT with ChainLINK\'s dual-pricing compliant POS system',
            cta_primary_text: 'Start Free Trial',
            cta_secondary_text: 'Watch Demo',
            background_gradient_start: '#7B2FD6',
            background_gradient_end: '#0FD17A'
          },
          stats: [
            { value: '10,000+', label: 'Active Merchants' },
            { value: '99.9%', label: 'Uptime' },
            { value: '$500M+', label: 'Processed Annually' },
            { value: '24/7', label: 'Support' }
          ],
          features_section: {
            headline: 'Everything You Need to Run Your Business',
            subheadline: 'Powerful features built for modern commerce'
          },
          features: [],
          testimonials: [
            {
              name: 'Sarah Johnson',
              business: 'Coastal Coffee & Bakery',
              image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
              text: 'ChainLINK transformed our checkout process. The dual pricing feature alone saved us thousands in processing fees!',
              rating: 5
            }
          ],
          cta_section: {
            headline: 'Ready to Transform Your Business?',
            subheadline: 'Join thousands of merchants already using ChainLINK POS',
            cta_text: 'Get Started Today'
          },
          company_info: {
            copyright_text: '© 2024 Isolex Corporation. All rights reserved.',
            tagline: 'The next-generation point of sale system for modern businesses.'
          }
        };
        
        const created = await base44.entities.LandingPageSettings.create(defaultSettings);
        setSettings(created);
      }
    } catch (error) {
      console.error('Error loading landing page settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await base44.entities.LandingPageSettings.update(settings.id, settings);
      alert('Landing page settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const updateHero = (field, value) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      hero: {
        ...prevSettings.hero,
        [field]: value
      }
    }));
  };

  const updateStat = (index, field, value) => {
    const newStats = [...settings.stats];
    newStats[index] = {
      ...newStats[index],
      [field]: value
    };
    setSettings({
      ...settings,
      stats: newStats
    });
  };

  const addStat = () => {
    setSettings({
      ...settings,
      stats: [
        ...settings.stats,
        { value: '0', label: 'New Stat' }
      ]
    });
  };

  const removeStat = (index) => {
    const newStats = settings.stats.filter((_, i) => i !== index);
    setSettings({
      ...settings,
      stats: newStats
    });
  };

  const updateFeaturesSection = (field, value) => {
    setSettings({
      ...settings,
      features_section: {
        ...settings.features_section,
        [field]: value
      }
    });
  };

  const addFeature = () => {
    setSettings({
      ...settings,
      features: [...(settings.features || []), { icon: 'Cpu', title: 'New Feature', description: 'Describe this feature.', accent: 'blue' }]
    });
  };

  const updateFeature = (index, field, value) => {
    const features = [...(settings.features || [])];
    features[index] = { ...features[index], [field]: value };
    setSettings({ ...settings, features });
  };

  const removeFeature = (index) => {
    setSettings({ ...settings, features: (settings.features || []).filter((_, i) => i !== index) });
  };

  const addTestimonial = () => {
    setSettings({
      ...settings,
      testimonials: [
        ...settings.testimonials,
        {
          name: 'New Customer',
          business: 'Business Name',
          image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop',
          text: 'Great service!',
          rating: 5
        }
      ]
    });
  };

  const updateTestimonial = (index, field, value) => {
    const newTestimonials = [...settings.testimonials];
    newTestimonials[index] = {
      ...newTestimonials[index],
      [field]: value
    };
    setSettings({
      ...settings,
      testimonials: newTestimonials
    });
  };

  const removeTestimonial = (index) => {
    const newTestimonials = settings.testimonials.filter((_, i) => i !== index);
    setSettings({
      ...settings,
      testimonials: newTestimonials
    });
  };

  const updateCTASection = (field, value) => {
    setSettings({
      ...settings,
      cta_section: {
        ...settings.cta_section,
        [field]: value
      }
    });
  };

  const updateCompanyInfo = (field, value) => {
    setSettings({
      ...settings,
      company_info: {
        ...settings.company_info,
        [field]: value
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading landing page settings...</p>
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
          <h2 className="text-3xl font-bold">Landing Page Editor</h2>
          <p className="text-gray-500 mt-1">Customize the content of your public landing page</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => window.open(createPageUrl('Home'), '_blank')}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="hero" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="hero">
            <Home className="w-4 h-4 mr-2" />
            Hero Section
          </TabsTrigger>
          <TabsTrigger value="stats">
            <TrendingUp className="w-4 h-4 mr-2" />
            Stats
          </TabsTrigger>
          <TabsTrigger value="features">
            Features
          </TabsTrigger>
          <TabsTrigger value="testimonials">
            <MessageSquare className="w-4 h-4 mr-2" />
            Testimonials
          </TabsTrigger>
          <TabsTrigger value="other">
            Other
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hero">
          <Card>
            <CardHeader>
              <CardTitle>Hero Section</CardTitle>
              <CardDescription>The main banner at the top of the landing page</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Badge Status</Label>
                <div className="flex items-center space-x-4 mt-2 p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium mb-1">
                      {settings.hero.badge_status === 'now_available' ? '✅ Now Available' : '🚀 Coming Soon'}
                    </div>
                    <div className="text-sm text-gray-500">
                      Toggle between "Now Available" and "Coming Soon"
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="badge-toggle" className="text-sm">
                      {settings.hero.badge_status === 'now_available' ? 'Available' : 'Coming Soon'}
                    </Label>
                    <input
                      type="checkbox"
                      id="badge-toggle"
                      checked={settings.hero.badge_status === 'now_available'}
                      onChange={(e) => updateHero('badge_status', e.target.checked ? 'now_available' : 'coming_soon')}
                      className="w-10 h-5 bg-gray-200 rounded-full relative appearance-none cursor-pointer
                        checked:bg-green-600 transition-colors
                        before:content-[''] before:absolute before:w-4 before:h-4 before:rounded-full 
                        before:bg-white before:top-0.5 before:left-0.5 before:transition-transform
                        checked:before:translate-x-5"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label>Badge Text (Optional Custom Text)</Label>
                <Input
                  value={settings.hero.badge_text}
                  onChange={(e) => updateHero('badge_text', e.target.value)}
                  placeholder="Now Available"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to use default text based on status
                </p>
              </div>

              <div>
                <Label>Headline</Label>
                <Input
                  value={settings.hero.headline}
                  onChange={(e) => updateHero('headline', e.target.value)}
                  placeholder="The Future of Point of Sale"
                />
              </div>

              <div>
                <Label>Subheadline</Label>
                <Textarea
                  value={settings.hero.subheadline}
                  onChange={(e) => updateHero('subheadline', e.target.value)}
                  placeholder="Accept cash, card, crypto, and EBT..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Primary CTA Text</Label>
                  <Input
                    value={settings.hero.cta_primary_text}
                    onChange={(e) => updateHero('cta_primary_text', e.target.value)}
                  />
                </div>

                <div>
                  <Label>Secondary CTA Text</Label>
                  <Input
                    value={settings.hero.cta_secondary_text}
                    onChange={(e) => updateHero('cta_secondary_text', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Background Gradient Start</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={settings.hero.background_gradient_start}
                      onChange={(e) => updateHero('background_gradient_start', e.target.value)}
                      className="w-20"
                    />
                    <Input
                      value={settings.hero.background_gradient_start}
                      onChange={(e) => updateHero('background_gradient_start', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label>Background Gradient End</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={settings.hero.background_gradient_end}
                      onChange={(e) => updateHero('background_gradient_end', e.target.value)}
                      className="w-20"
                    />
                    <Input
                      value={settings.hero.background_gradient_end}
                      onChange={(e) => updateHero('background_gradient_end', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Statistics</CardTitle>
                  <CardDescription>Key numbers displayed below the hero section</CardDescription>
                </div>
                <Button onClick={addStat} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Stat
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings.stats.map((stat, index) => (
                <div key={index} className="flex gap-4 items-end p-4 border rounded-lg">
                  <div className="flex-1">
                    <Label>Value</Label>
                    <Input
                      value={stat.value}
                      onChange={(e) => updateStat(index, 'value', e.target.value)}
                      placeholder="10,000+"
                    />
                  </div>
                  <div className="flex-1">
                    <Label>Label</Label>
                    <Input
                      value={stat.label}
                      onChange={(e) => updateStat(index, 'label', e.target.value)}
                      placeholder="Active Merchants"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeStat(index)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle>Features Section</CardTitle>
              <CardDescription>Headlines and feature tiles for the features section</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Headline</Label>
                <Input
                  value={settings.features_section?.headline || ''}
                  onChange={(e) => updateFeaturesSection('headline', e.target.value)}
                />
              </div>

              <div>
                <Label>Subheadline</Label>
                <Input
                  value={settings.features_section?.subheadline || ''}
                  onChange={(e) => updateFeaturesSection('subheadline', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Feature Tiles</CardTitle>
                  <CardDescription>The individual feature cards displayed in the grid. Leave empty to use the built-in defaults.</CardDescription>
                </div>
                <Button onClick={addFeature} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Feature
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {(settings.features || []).length === 0 && (
                <p className="text-sm text-gray-500">No custom feature tiles. The default built-in features will be shown.</p>
              )}
              {(settings.features || []).map((feat, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Feature {index + 1}</h4>
                    <Button variant="ghost" size="sm" onClick={() => removeFeature(index)} className="text-red-600">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Icon</Label>
                      <Select value={feat.icon} onValueChange={(v) => updateFeature(index, 'icon', v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FEATURE_ICON_OPTIONS.map(ic => (
                            <SelectItem key={ic} value={ic}>{ic}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Accent Color</Label>
                      <Select value={feat.accent} onValueChange={(v) => updateFeature(index, 'accent', v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FEATURE_ACCENT_OPTIONS.map(a => (
                            <SelectItem key={a} value={a}>{a}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Title</Label>
                    <Input value={feat.title} onChange={(e) => updateFeature(index, 'title', e.target.value)} />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea value={feat.description} onChange={(e) => updateFeature(index, 'description', e.target.value)} rows={2} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testimonials">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Testimonials</CardTitle>
                  <CardDescription>Customer reviews and success stories</CardDescription>
                </div>
                <Button onClick={addTestimonial} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Testimonial
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {settings.testimonials.map((testimonial, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Testimonial {index + 1}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTestimonial(index)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={testimonial.name}
                        onChange={(e) => updateTestimonial(index, 'name', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Business</Label>
                      <Input
                        value={testimonial.business}
                        onChange={(e) => updateTestimonial(index, 'business', e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Image URL</Label>
                    <Input
                      value={testimonial.image}
                      onChange={(e) => updateTestimonial(index, 'image', e.target.value)}
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <Label>Testimonial Text</Label>
                    <Textarea
                      value={testimonial.text}
                      onChange={(e) => updateTestimonial(index, 'text', e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Rating (1-5)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="5"
                      value={testimonial.rating}
                      onChange={(e) => updateTestimonial(index, 'rating', parseInt(e.target.value))}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="other">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>CTA Section</CardTitle>
                <CardDescription>Call-to-action at the bottom of the page</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Headline</Label>
                  <Input
                    value={settings.cta_section.headline}
                    onChange={(e) => updateCTASection('headline', e.target.value)}
                  />
                </div>

                <div>
                  <Label>Subheadline</Label>
                  <Input
                    value={settings.cta_section.subheadline}
                    onChange={(e) => updateCTASection('subheadline', e.target.value)}
                  />
                </div>

                <div>
                  <Label>Button Text</Label>
                  <Input
                    value={settings.cta_section.cta_text}
                    onChange={(e) => updateCTASection('cta_text', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Company Info</CardTitle>
                <CardDescription>Footer information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Copyright Text</Label>
                  <Input
                    value={settings.company_info.copyright_text}
                    onChange={(e) => updateCompanyInfo('copyright_text', e.target.value)}
                  />
                </div>

                <div>
                  <Label>Tagline</Label>
                  <Input
                    value={settings.company_info.tagline}
                    onChange={(e) => updateCompanyInfo('tagline', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}