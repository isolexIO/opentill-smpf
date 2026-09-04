import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';

/**
 * AI Website Generator — generates the full multi-page HTML/CSS/JS website
 * for a merchant. The prompt is built server-side from the business info so
 * callers cannot inject arbitrary prompts. Returns the generated HTML string.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.merchant_id) return Response.json({ error: 'Merchant account required' }, { status: 403 });

    const body = await req.json();
    const { businessInfo, websiteId, logoUrl, imageUrls, apiOrigin, onlineOrderingLink } = body;
    if (!businessInfo || !businessInfo.businessName || !businessInfo.industry || !businessInfo.description) {
      return Response.json({ error: 'Missing business info' }, { status: 400 });
    }

    const selectedPages = businessInfo.includePages
      ? Object.entries(businessInfo.includePages).filter(([, enabled]) => enabled).map(([page]) => page)
      : ['home', 'about', 'services', 'contact'];

    const logoSection = logoUrl ? `\n- Use this logo image in the header: ${logoUrl}` : '';
    const imagesSection = imageUrls && imageUrls.length > 0
      ? `\n- Use these generated images throughout the site: ${imageUrls.join(', ')}`
      : '';

    const analyticsScript = `
<!-- Analytics Tracking -->
<script>
(function() {
  const WEBSITE_ID = '${websiteId}';
  const API_URL = '${apiOrigin || ''}';
  
  let visitorId = localStorage.getItem('visitor_id');
  if (!visitorId) {
    visitorId = 'v_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('visitor_id', visitorId);
  }
  
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
  
  track('page_view');
  
  if (!localStorage.getItem('tracked_visitor')) {
    track('unique_visitor');
    localStorage.setItem('tracked_visitor', 'true');
  }
  
  document.addEventListener('click', function(e) {
    if (e.target.matches('button, a, .btn')) {
      track('button_click', {
        element_id: e.target.id,
        element_text: e.target.textContent.trim()
      });
    }
  });
  
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
${onlineOrderingLink || ''}
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

    const html = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false
    });

    return Response.json({ success: true, html });
  } catch (error) {
    console.error('Error generating website HTML:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});