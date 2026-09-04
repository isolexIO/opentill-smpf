import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';

/**
 * Ambassador "Quick Generate" — produces ready-to-send marketing copy for a
 * given platform (email/instagram/twitter/sms/google). Prompt is built
 * server-side so callers cannot inject arbitrary prompts or burn credits.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { platform, merchantType, tone, topic, referralLink } = body;
    if (!platform || !topic || !referralLink) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const platformLabels = {
      email: 'email campaign',
      instagram: 'Instagram caption',
      twitter: 'Twitter/X post',
      sms: 'SMS message',
      google: 'Google Business post'
    };

    const prompt = `Write a ${platformLabels[platform] || platform} that SELLS the openTILL SMPF point-of-sale platform to a ${merchantType || 'small business'} business owner (a prospective merchant).
Tone: ${tone || 'professional'}.
Sales angle / focus: ${topic}.

About openTILL SMPF: a modern, blockchain-integrated POS that accepts cash, card, crypto (Solana / USDC), and EBT/SNAP, with dual-pricing (cash vs. card) compliance, online ordering, delivery, invoices, inventory, staff management, and $DUC loyalty rewards. Merchants can start with a free trial.

IMPORTANT — REFERRAL LINK: You MUST always include this ambassador referral link in the call-to-action so the prospect signs up through the ambassador and the ambassador gets credit. Use this exact link: ${referralLink}
${platform === 'email' ? 'Include a subject line, greeting, body (2-3 paragraphs), and a clear CTA to book a demo or start a free trial. Keep it under 200 words.' : ''}
${platform === 'instagram' ? 'Include an engaging caption with emojis and 5-7 relevant hashtags. Max 150 words.' : ''}
${platform === 'twitter' ? 'Keep it under 280 characters, punchy and engaging with 1-2 hashtags.' : ''}
${platform === 'sms' ? 'Keep it under 160 characters, include a clear offer and CTA.' : ''}
${platform === 'google' ? 'Write a Google Business post, 100-150 words, highlighting value and including a CTA.' : ''}
Address the merchant directly and persuasively as a sales prospect. Make it authentic and ready to send.`;

    const content = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });
    return Response.json({ success: true, content });
  } catch (error) {
    console.error('Error generating marketing copy:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});