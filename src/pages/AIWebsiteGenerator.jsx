import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Sparkles, Eye, Download, Globe, Image as ImageIcon, Palette, FileCode, Zap, ShoppingCart, BarChart3, Trash2, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PermissionGate from '../components/PermissionGate';
import AnalyticsDashboard from '../components/website-generator/AnalyticsDashboard';
import WebsiteEditor from '../components/website-generator/WebsiteEditor';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function AIWebsiteGenerator() {
  const [businessInfo, setBusinessInfo] = useState({
    businessName: '',
    industry: '',
    description: '',
    features: '',
    colors: '',
    targetAudience: '',
    includePages: {
      home: true,
      about: true,
      services: true,
      contact: true,
      gallery: false,
      blog: false
    },
    enableOnlineOrdering: false,
    generateLogo: false,
    generateImages: false
  });
  const [loading, setLoading] = useState(false);
  const [logoLoading, setLogoLoading] = useState(false);
  const [generatedWebsite, setGeneratedWebsite] = useState(null);
  const [generatedLogo, setGeneratedLogo] = useState(null);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [merchantSettings, setMerchantSettings] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [websiteId, setWebsiteId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadUserAndSettings();
  }, []);

  useEffect(() => {
    if (currentUser?.merchant_id) {
      loadExistingWebsite();
    }
  }, [currentUser]);

  const loadUserAndSettings = async () => {
    try {
      const pinUserJSON = localStorage.getItem('pinLoggedInUser');
      let user = null;
      if (pinUserJSON) {
        user = JSON.parse(pinUserJSON);
      } else {
        user = await base44.auth.me();
      }
      setCurrentUser(user);

      if (user?.merchant_id) {
        const settings = await base44.entities.MerchantSettings.filter({ merchant_id: user.merchant_id });
        if (settings && settings.length > 0) {
          setMerchantSettings(settings[0]);
        }
      }
    } catch (error) {
      console.error('Error loading user and settings:', error);
    }
  };

  const loadExistingWebsite = async () => {
    try {
      if (!currentUser?.merchant_id) {
        console.log('No merchant_id available');
        return;
      }

      console.log('Loading existing website for merchant:', currentUser.merchant_id);
      const websites = await base44.entities.GeneratedWebsite.filter({
        merchant_id: currentUser.merchant_id
      });
      
      console.log('Found websites:', websites);
      
      if (websites && websites.length > 0) {
        const website = websites[0];
        console.log('Loading website:', website.website_id);
        setWebsiteId(website.website_id);
        setGeneratedWebsite(website.html_content);
        setGeneratedLogo(website.logo_url || null);
        setGeneratedImages(website.image_urls || []);
        setBusinessInfo(website.business_info || businessInfo);
        setPreviewMode(true);
      } else {
        console.log('No websites found for this merchant');
      }
    } catch (error) {
      console.error('Error loading existing website:', error);
    }
  };

  const handleGenerateLogo = async () => {
    if (!businessInfo.businessName || !businessInfo.industry) {
      alert('Please fill in Business Name and Industry first');
      return;
    }

    setLogoLoading(true);
    try {
      const logoPrompt = `Create a professional, modern logo for ${businessInfo.businessName}, a ${businessInfo.industry} business. The logo should be clean, memorable, and suitable for digital and print use. Style: ${businessInfo.colors || 'modern and professional'}`;
      
      const logoUrl = await base44.integrations.Core.GenerateImage({
        prompt: logoPrompt
      });

      setGeneratedLogo(logoUrl.url);
      alert('Logo generated successfully!');
    } catch (error) {
      console.error('Error generating logo:', error);
      alert('Failed to generate logo. Please try again.');
    } finally {
      setLogoLoading(false);
    }
  };

  const handleGenerateImages = async () => {
    if (!businessInfo.industry || !businessInfo.description) {
      alert('Please fill in Industry and Description first');
      return;
    }

    setLoading(true);
    try {
      const imagePrompts = [
        `Professional hero image for a ${businessInfo.industry} business: ${businessInfo.description}. High quality, modern, ${businessInfo.colors || 'professional colors'}`,
        `Interior or product showcase for ${businessInfo.businessName} in ${businessInfo.industry}. Clean, bright, professional`,
        `Team or service image for ${businessInfo.industry} business. Welcoming, professional, modern aesthetic`
      ];

      const imagePromises = imagePrompts.map(prompt => 
        base44.integrations.Core.GenerateImage({ prompt })
      );

      const results = await Promise.all(imagePromises);
      setGeneratedImages(results.map(r => r.url));
      alert('Images generated successfully!');
    } catch (error) {
      console.error('Error generating images:', error);
      alert('Failed to generate images. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!businessInfo.businessName || !businessInfo.industry || !businessInfo.description) {
      alert('Please fill in at least Business Name, Industry, and Description');
      return;
    }

    setLoading(true);
    try {
      // Generate unique website ID
      const newWebsiteId = `${currentUser?.merchant_id || 'demo'}_${Date.now()}`;
      setWebsiteId(newWebsiteId);

      const selectedPages = Object.entries(businessInfo.includePages)
        .filter(([_, enabled]) => enabled)
        .map(([page]) => page);

      const onlineOrderingLink = businessInfo.enableOnlineOrdering && merchantSettings?.settings?.online_ordering?.enabled
        ? `\n- Include a prominent "Order Online" button that links to: ${window.location.origin}/online-menu`
        : '';

      const logoSection = generatedLogo 
        ? `\n- Use this logo image in the header: ${generatedLogo}`
        : '';

      const imagesSection = generatedImages.length > 0
        ? `\n- Use these generated images throughout the site: ${generatedImages.join(', ')}`
        : '';

      // Analytics tracking script
      const analyticsScript = `
<!-- Analytics Tracking -->
<script>
(function() {
  const WEBSITE_ID = '${newWebsiteId}';
  const API_URL = '${window.location.origin}';
  
  // Generate visitor ID
  let visitorId = localStorage.getItem('visitor_id');
  if (!visitorId) {
    visitorId = 'v_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('visitor_id', visitorId);
  }
  
  // Generate session ID
  let sessionId = sessionStorage.getItem('session_id');
  if (!sessionId) {
    sessionId = 's_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('session_id', sessionId);
  }
  
  function track(eventType, data = {}) {
    fetch(API_URL + '/functions/trackWebsiteAnalytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        website_id: WEBSITE_ID,
        event_type: eventType,
        page_path: window.location.pathname,
        visitor_id: visitorId,
        session_id: sessionId,
        referrer: document.referrer || 'direct',
        ...data
      })
    }).catch(err => console.log('Analytics error:', err));
  }
  
  // Track page view
  track('page_view');
  
  // Track unique visitor (first visit only)
  if (!localStorage.getItem('tracked_visitor')) {
    track('unique_visitor');
    localStorage.setItem('tracked_visitor', 'true');
  }
  
  // Track button clicks
  document.addEventListener('click', function(e) {
    if (e.target.matches('button, a, .btn')) {
      track('button_click', {
        element_id: e.target.id,
        element_text: e.target.textContent.trim()
      });
    }
  });
  
  // Track form submissions
  document.addEventListener('submit', function(e) {
    if (e.target.matches('form')) {
      track('form_submission', {
        form_data: { submitted: true }
      });
    }
  });
})();
</script>`;

      const prompt = `Generate a complete, modern, multi-page HTML/CSS/JS website for the following business:

Business Name: ${businessInfo.businessName}
Industry: ${businessInfo.industry}
Description: ${businessInfo.description}
Key Features/Services: ${businessInfo.features || 'Not specified'}
Preferred Colors: ${businessInfo.colors || 'Professional theme'}
Target Audience: ${businessInfo.targetAudience || 'General public'}

Pages to Include: ${selectedPages.join(', ')}
${onlineOrderingLink}
${logoSection}
${imagesSection}

CRITICAL CSS REQUIREMENTS:
- EVERY HTML file MUST include comprehensive CSS inside <style> tags in the <head> section
- CSS must include: reset styles, typography, layout (grid/flexbox), colors, spacing, responsive breakpoints
- Use modern CSS with transitions, hover effects, gradients, shadows, and animations
- Include @media queries for mobile responsiveness (max-width: 768px, 480px)
- Style ALL elements: header, nav, buttons, forms, sections, footer, cards, images
- Add smooth transitions and hover states to interactive elements
- Use the specified color scheme throughout all styles

HTML/CSS Structure Requirements:
- Create MULTIPLE separate HTML files (one for each page: ${selectedPages.map(p => p + '.html').join(', ')})
- Each HTML file must have: <!DOCTYPE html>, <html>, <head> with <style> tags, <body>
- Include consistent header with navigation and footer on every page
- Use semantic HTML5: <header>, <nav>, <main>, <section>, <footer>
- Add meta viewport tag: <meta name="viewport" content="width=device-width, initial-scale=1.0">
- Use relative links between pages (e.g., <a href="about.html">About</a>)

Design Elements to Include:
- Hero section with gradient background and call-to-action buttons
- Navigation bar with hover effects (sticky on scroll)
- Content sections with cards, images, and proper spacing
- Contact forms with styled inputs
- Testimonials with rounded avatars and quotes
- Footer with links and social media icons
- Smooth scrolling and modern animations (fade-in, slide-up)
- Professional color scheme with gradients and shadows
- Call-to-action buttons with hover effects throughout

Include this analytics tracking code before the closing </body> tag on EVERY page:
${analyticsScript}

Output Format Example:
=== home.html ===
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${businessInfo.businessName} - Home</title>
    <style>
        /* Reset and Base Styles */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
        
        /* Add comprehensive CSS here for all page elements */
        /* Include header, nav, hero, sections, buttons, footer, responsive styles */
    </style>
</head>
<body>
    <!-- Complete page structure here -->
</body>
</html>

Generate ONLY the HTML files with complete inline CSS, nothing else. No explanations outside the code.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false
      });

      setGeneratedWebsite(response);
      setPreviewMode(true);
      setActiveTab('home');

      // Save website to database
      try {
        const existingWebsites = await base44.entities.GeneratedWebsite.filter({
          merchant_id: currentUser?.merchant_id
        });
        
        if (existingWebsites && existingWebsites.length > 0) {
          await base44.entities.GeneratedWebsite.update(existingWebsites[0].id, {
            website_id: newWebsiteId,
            html_content: response,
            logo_url: generatedLogo,
            image_urls: generatedImages,
            business_info: businessInfo
          });
        } else {
          await base44.entities.GeneratedWebsite.create({
            merchant_id: currentUser?.merchant_id,
            website_id: newWebsiteId,
            html_content: response,
            logo_url: generatedLogo,
            image_urls: generatedImages,
            business_info: businessInfo
          });
        }

        // Create initial analytics record
        await base44.entities.WebsiteAnalytics.create({
          merchant_id: currentUser?.merchant_id,
          website_id: newWebsiteId,
          event_type: 'page_view',
          page_path: '/',
          visitor_id: 'system',
          session_id: 'generation',
          referrer: 'system_generated'
        });
      } catch (err) {
        console.log('Could not save website:', err);
      }
    } catch (error) {
      console.error('Error generating website:', error);
      alert('Failed to generate website. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!generatedWebsite) return;

    // Split the website into multiple files if it contains file separators
    const filePattern = /===\s*(\w+\.html)\s*===([\s\S]*?)(?====|$)/g;
    const files = [];
    let match;

    while ((match = filePattern.exec(generatedWebsite)) !== null) {
      files.push({
        name: match[1].trim(),
        content: match[2].trim()
      });
    }

    if (files.length > 1) {
      // Multiple files - create a ZIP would be ideal, but for now download separately
      files.forEach((file, index) => {
        setTimeout(() => {
          const blob = new Blob([file.content], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, index * 500);
      });
      alert(`Downloading ${files.length} HTML files...`);
    } else {
      // Single file
      const blob = new Blob([generatedWebsite], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${businessInfo.businessName.replace(/\s+/g, '-').toLowerCase()}-website.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleDeleteWebsite = async () => {
    try {
      if (!websiteId || !currentUser?.merchant_id) return;
      
      setLoading(true);
      
      // Delete website record
      const websites = await base44.entities.GeneratedWebsite.filter({
        merchant_id: currentUser.merchant_id
      });
      
      for (const website of websites) {
        await base44.entities.GeneratedWebsite.delete(website.id);
      }
      
      // Delete all analytics for this website
      const analytics = await base44.entities.WebsiteAnalytics.filter({
        merchant_id: currentUser.merchant_id,
        website_id: websiteId
      });
      
      for (const record of analytics) {
        await base44.entities.WebsiteAnalytics.delete(record.id);
      }
      
      // Reset state
      setGeneratedWebsite('');
      setWebsiteId(null);
      setGeneratedLogo(null);
      setGeneratedImages([]);
      setShowDeleteConfirm(false);
      
      alert('Website deleted successfully! You can now generate a new one.');
    } catch (error) {
      console.error('Error deleting website:', error);
      alert('Failed to delete website. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const extractPageContent = (pageName) => {
    if (!generatedWebsite) return '';
    
    const pattern = new RegExp(`===\\s*${pageName}\\.html\\s*===([\\s\\S]*?)(?====|$)`, 'i');
    const match = generatedWebsite.match(pattern);
    
    if (match && match[1]) {
      return match[1].trim();
    }
    
    // Fallback to full content if no separators found
    return generatedWebsite;
  };

  const handleCopyCode = () => {
    if (!generatedWebsite) return;
    navigator.clipboard.writeText(generatedWebsite);
    alert('HTML code copied to clipboard!');
  };

  return (
    <PermissionGate permission="manage_settings">
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-8 h-8 text-indigo-600" />
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                AI Website Generator
              </h1>
              <Badge className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                Beta
              </Badge>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Generate a professional website for your business in seconds using AI
            </p>
          </div>

          {generatedWebsite && websiteId && (
            <div className="space-y-6 mb-6">
              <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-indigo-600" />
                        Live Analytics Dashboard
                      </CardTitle>
                      <CardDescription>
                        Track visitors, engagement, and performance of your generated website
                      </CardDescription>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete & Start Over
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <AnalyticsDashboard websiteId={websiteId} merchantId={currentUser?.merchant_id} />
                </CardContent>
              </Card>

              <WebsiteEditor
                websiteId={websiteId}
                merchantId={currentUser?.merchant_id}
                initialContent={generatedWebsite}
                initialBusinessInfo={businessInfo}
                onSave={(updatedContent, updatedInfo) => {
                  setGeneratedWebsite(updatedContent);
                  setBusinessInfo(updatedInfo);
                }}
              />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Form */}
            <Card className="h-fit">
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
                <CardDescription>Provide details about your business to generate a custom website</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    placeholder="e.g., Joe's Coffee Shop"
                    value={businessInfo.businessName}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, businessName: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry">Industry *</Label>
                  <Input
                    id="industry"
                    placeholder="e.g., Restaurant, Retail, Services"
                    value={businessInfo.industry}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, industry: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Business Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your business, what makes it unique, your mission..."
                    rows={4}
                    value={businessInfo.description}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, description: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="features">Key Features/Services</Label>
                  <Textarea
                    id="features"
                    placeholder="List your main products, services, or features (one per line)"
                    rows={3}
                    value={businessInfo.features}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, features: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="colors">Preferred Color Scheme</Label>
                  <div className="flex gap-2">
                    <Input
                      id="colors"
                      placeholder="e.g., Blue and white, Modern dark theme"
                      value={businessInfo.colors}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, colors: e.target.value })}
                    />
                    <Button variant="outline" size="icon" title="Color palette">
                      <Palette className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetAudience">Target Audience</Label>
                  <Input
                    id="targetAudience"
                    placeholder="e.g., Young professionals, Families, Tech enthusiasts"
                    value={businessInfo.targetAudience}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, targetAudience: e.target.value })}
                  />
                </div>

                <div className="border-t pt-4 space-y-4">
                  <Label className="text-base font-semibold">Pages to Include</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(businessInfo.includePages).map(([page, enabled]) => (
                      <div key={page} className="flex items-center space-x-2">
                        <Switch
                          id={`page-${page}`}
                          checked={enabled}
                          onCheckedChange={(checked) => 
                            setBusinessInfo({
                              ...businessInfo,
                              includePages: { ...businessInfo.includePages, [page]: checked }
                            })
                          }
                        />
                        <Label htmlFor={`page-${page}`} className="text-sm capitalize cursor-pointer">
                          {page}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4 space-y-4">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    AI Enhancements
                  </Label>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        <ImageIcon className="w-5 h-5 text-purple-600" />
                        <div>
                          <Label className="text-sm font-medium">Generate Logo</Label>
                          <p className="text-xs text-gray-500">AI-powered logo creation</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateLogo}
                        disabled={logoLoading || !businessInfo.businessName}
                      >
                        {logoLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          generatedLogo ? '✓' : 'Generate'
                        )}
                      </Button>
                    </div>

                    {generatedLogo && (
                      <div className="flex justify-center p-2 bg-white dark:bg-gray-800 rounded border">
                        <img src={generatedLogo} alt="Generated Logo" className="h-20 object-contain" />
                      </div>
                    )}

                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        <ImageIcon className="w-5 h-5 text-blue-600" />
                        <div>
                          <Label className="text-sm font-medium">Generate Images</Label>
                          <p className="text-xs text-gray-500">3 custom images for your site</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateImages}
                        disabled={loading || !businessInfo.industry}
                      >
                        {loading && generatedImages.length === 0 ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          generatedImages.length > 0 ? `✓ ${generatedImages.length}` : 'Generate'
                        )}
                      </Button>
                    </div>

                    {generatedImages.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {generatedImages.map((img, idx) => (
                          <img key={idx} src={img} alt={`Generated ${idx + 1}`} className="w-full h-20 object-cover rounded border" />
                        ))}
                      </div>
                    )}

                    {merchantSettings?.settings?.online_ordering?.enabled && (
                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg">
                        <div className="flex items-center gap-3">
                          <ShoppingCart className="w-5 h-5 text-green-600" />
                          <div>
                            <Label className="text-sm font-medium">Link Online Ordering</Label>
                            <p className="text-xs text-gray-500">Add "Order Online" button</p>
                          </div>
                        </div>
                        <Switch
                          checked={businessInfo.enableOnlineOrdering}
                          onCheckedChange={(checked) => 
                            setBusinessInfo({ ...businessInfo, enableOnlineOrdering: checked })
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Generating Your Website...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Generate Website
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Preview */}
            <Card className="h-fit">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Preview & Download
                  </CardTitle>
                  {generatedWebsite && (
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewMode(!previewMode)}
                      >
                        {previewMode ? <FileCode className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                        {previewMode ? 'Code' : 'Preview'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyCode}
                      >
                        <Globe className="w-4 h-4 mr-1" />
                        Copy
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleDownload}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download All
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!generatedWebsite ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 opacity-20 blur-3xl rounded-full"></div>
                      <Sparkles className="w-16 h-16 text-indigo-600 relative" />
                    </div>
                    <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Ready to create something amazing?
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                      Fill in your business details, generate a logo and images, then click "Generate Website" to create a professional multi-page website
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {previewMode ? (
                      <>
                        <Tabs value={activeTab} onValueChange={setActiveTab}>
                          <TabsList className="w-full justify-start overflow-x-auto">
                            {Object.entries(businessInfo.includePages)
                              .filter(([_, enabled]) => enabled)
                              .map(([page]) => (
                                <TabsTrigger key={page} value={page} className="capitalize">
                                  {page}
                                </TabsTrigger>
                              ))}
                          </TabsList>
                          {Object.entries(businessInfo.includePages)
                            .filter(([_, enabled]) => enabled)
                            .map(([page]) => (
                              <TabsContent key={page} value={page}>
                                <div className="border rounded-lg overflow-hidden bg-white" style={{ height: '600px' }}>
                                  <iframe
                                    srcDoc={extractPageContent(page)}
                                    className="w-full h-full"
                                    title={`${page} Preview`}
                                    sandbox="allow-same-origin"
                                  />
                                </div>
                              </TabsContent>
                            ))}
                        </Tabs>
                      </>
                    ) : (
                      <div className="border rounded-lg overflow-hidden bg-gray-900 text-green-400 p-4" style={{ height: '600px', overflowY: 'auto' }}>
                        <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                          {generatedWebsite}
                        </pre>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          What You Got
                        </h3>
                        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                          <li>✓ {Object.values(businessInfo.includePages).filter(Boolean).length} responsive HTML pages</li>
                          <li>✓ Modern CSS with animations</li>
                          <li>✓ Mobile-friendly navigation</li>
                          {generatedLogo && <li>✓ Custom AI-generated logo</li>}
                          {generatedImages.length > 0 && <li>✓ {generatedImages.length} AI-generated images</li>}
                          {businessInfo.enableOnlineOrdering && <li>✓ Online ordering integration</li>}
                        </ul>
                      </div>

                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                        <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
                          <Download className="w-4 h-4" />
                          Next Steps
                        </h3>
                        <ul className="text-sm text-green-800 dark:text-green-200 space-y-1 mb-3">
                          <li>1. Download all HTML files</li>
                          <li>2. Upload to web hosting</li>
                          <li>3. Connect your domain</li>
                          <li>4. Customize content as needed</li>
                        </ul>
                        <a
                          href="https://reactr.site"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          <Globe className="w-4 h-4" />
                          View ReactR Hosting Plans
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Website & Analytics?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your generated website and all associated analytics data. 
              You'll be able to generate a new website from scratch. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteWebsite} className="bg-red-600 hover:bg-red-700">
              Delete Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PermissionGate>
  );
}