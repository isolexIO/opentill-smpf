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

    const OPENTILL_KNOWLEDGE = `You are an expert on the openTILL SMPF point-of-sale platform. Use ONLY the facts below. Never invent or assume capabilities, and never promise a feature the prospect does not automatically get.

WHAT openTILL SMPF IS: a modern, cloud-based POS for businesses of all sizes (restaurants, retail, coffee shops, salons, food trucks, bars, bakeries, gyms, boutiques). Core payments that work for every merchant out of the box: cash and card (card via openTILL Payments, powered by Stripe).

OPTIONAL PAYMENTS (must be explicitly enabled by the merchant — NOT on by default, NOT available to everyone):
- Crypto: Solana Pay (USDC and custom SPL tokens). The merchant turns this on and links a wallet. Only mention as an optional, opt-in capability.
- EBT/SNAP: NOT a standard feature and NOT available to every merchant. It requires specific gateway support and regional approval. NEVER tell a prospect they can accept EBT, and never imply EBT is included or easy to add. If a prospect specifically asks about EBT, say only that it is an optional, region-limited capability they should confirm with the openTILL team — never promise it.

DUAL PRICING: a surcharge / cash-discount engine that lets merchants show a different price for cash vs. card to recover processing fees, compliant with regional rules. It is a fee-recovery / compliance tool. Describe it as "recover card-processing fees" or "cash-vs-card pricing." Do NOT call it a discount and do not imply it lets merchants arbitrarily charge more.

OTHER INCLUDED FEATURES (safe to mention): online ordering, pickup and delivery, invoices, inventory, staff management, stations, kitchen display, customer display, modifiers, reports. $DUC (Digital Utility Credit) loyalty rewards for merchants based on card-processing volume. openTILL Chips: a modular marketplace of add-on features that extend the POS.

PRICING / COMMITMENT: no subscription fees, no long-term contracts, no trial period. Merchants activate and run pay-as-you-go. Do NOT claim a "free trial" — there is none. Platform fees are 0% to the merchant on the base platform.

STRICT ACCURACY RULES: (1) Only state capabilities the prospect will actually get. Do not present opt-in features (crypto, EBT, marketplace integrations) as automatic or guaranteed. (2) Tailor the pitch to the prospect's business type. (3) Never invent third-party integrations (DoorDash, Uber Eats, etc.) as guaranteed — they are optional marketplace integrations. (4) No "save X%" guarantees unless tied to dual-pricing fee recovery. (5) Say "designed for compliance" at most — never "fully compliant in all states."`;

    const prompt = `Generate ${contentType || 'social_post'} content that SELLS the openTILL SMPF point-of-sale platform to "${merchantName}" (a prospective merchant).

${OPENTILL_KNOWLEDGE}

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
- Add a clear call-to-action (book a demo or activate — there is no free trial, so do not mention one)
- Make it ${tone || 'professional'} in tone
- Do not mention EBT/SNAP unless the sales angle explicitly requires it

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