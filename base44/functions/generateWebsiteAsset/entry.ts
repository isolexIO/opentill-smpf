import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';

/**
 * AI Website Generator — generates a single image asset (logo, hero, interior,
 * or team) for a merchant's generated website. The image prompt is built
 * server-side from the business info + asset type, so callers cannot inject
 * arbitrary prompts.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.merchant_id) return Response.json({ error: 'Merchant account required' }, { status: 403 });

    const body = await req.json();
    const { businessName, industry, colors, description, assetType } = body;
    if (!industry || !assetType) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const style = colors || 'modern and professional';
    let prompt;
    if (assetType === 'logo') {
      prompt = `Create a professional, modern logo for ${businessName || 'a business'}, a ${industry} business. The logo should be clean, memorable, and suitable for digital and print use. Style: ${style}`;
    } else if (assetType === 'hero') {
      prompt = `Professional hero image for a ${industry} business: ${description || ''}. High quality, modern, ${style}`;
    } else if (assetType === 'interior') {
      prompt = `Interior or product showcase for ${businessName || 'a business'} in ${industry}. Clean, bright, professional`;
    } else {
      prompt = `Team or service image for ${industry} business. Welcoming, professional, modern aesthetic`;
    }

    const result = await base44.asServiceRole.integrations.Core.GenerateImage({ prompt });
    return Response.json({ success: true, url: result.url });
  } catch (error) {
    console.error('Error generating website asset:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});