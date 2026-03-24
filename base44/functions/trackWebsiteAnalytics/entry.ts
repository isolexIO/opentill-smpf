import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
    const {
      website_id,
      event_type,
      page_path,
      visitor_id,
      session_id,
      referrer,
      element_id,
      element_text,
      form_data
    } = body;

    if (!website_id || !event_type) {
      return Response.json({
        success: false,
        error: 'website_id and event_type are required'
      }, { status: 400 });
    }

    // Get user agent and device type
    const userAgent = req.headers.get('user-agent') || '';
    const deviceType = /mobile/i.test(userAgent) ? 'mobile' : 
                      /tablet|ipad/i.test(userAgent) ? 'tablet' : 'desktop';

    // Hash IP for privacy
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';
    const ipHash = ip ? await hashString(ip) : null;

    // Extract merchant_id from website_id (format: merchantId_timestamp)
    const merchant_id = website_id.split('_')[0];

    // Create analytics record
    await base44.asServiceRole.entities.WebsiteAnalytics.create({
      merchant_id,
      website_id,
      event_type,
      page_path: page_path || '/',
      visitor_id,
      session_id,
      referrer: referrer || 'direct',
      user_agent: userAgent,
      device_type: deviceType,
      element_id,
      element_text,
      form_data,
      ip_address: ipHash,
      timestamp: new Date().toISOString()
    });

    return Response.json({ success: true });

  } catch (error) {
    console.error('Analytics tracking error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});

async function hashString(str) {
  const msgBuffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}