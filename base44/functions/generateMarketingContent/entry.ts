import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';

/**
 * Ambassador Content Generator — produces structured marketing content
 * (title, body, hashtags, call-to-action) for a specific merchant prospect.
 * Prompt is built server-side from the prospect + campaign parameters.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { merchantName, contentType, platform, tone, topic, referralLink, dealerId } = body;
    if (!merchantName || !topic) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const prompt = `Generate ${contentType || 'social_post'} content that SELLS the openTILL SMPF point-of-sale platform to "${merchantName}" (a prospective merchant).

About openTILL SMPF: a modern, blockchain-integrated POS that accepts cash, card, crypto (Solana / USDC), and EBT/SNAP, with dual-pricing (cash vs. card) compliance, online ordering, delivery, invoices, inventory, staff management, and $DUC loyalty rewards. Merchants can start with a free trial.

Context:
- Prospect: ${merchantName}
- Sales angle / focus: ${topic}
- Tone: ${tone || 'professional'}
- Platform: ${platform || 'social'}

Requirements:
- Address the merchant directly and persuasively as a sales prospect.
- IMPORTANT: Always include this ambassador referral link in the call-to-action so the prospect signs up through the ambassador: ${referralLink || (dealerId ? `(use /MerchantOnboarding?dealer_id=${dealerId})` : '')}
- ${contentType === 'social_post' ? 'Keep it under 280 characters, engaging and shareable' : ''}
- ${contentType === 'email_newsletter' ? 'Create a compelling subject line and well-structured email body with sections' : ''}
- Include relevant hashtags if appropriate
- Add a clear call-to-action (book a demo or start a free trial)
- Make it ${tone || 'professional'} in tone

Generate the content in JSON format with these fields:
- title (subject line or headline)
- body (main content)
- hashtags (array of relevant hashtags)
- call_to_action (clear CTA)`;

    const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          body: { type: 'string' },
          hashtags: { type: 'array', items: { type: 'string' } },
          call_to_action: { type: 'string' }
        }
      }
    });

    return Response.json({ success: true, content: response });
  } catch (error) {
    console.error('Error generating marketing content:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});