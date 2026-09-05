import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';

/**
 * Builder marketing tool — generates ready-to-use promotional copy for a
 * builder's own Chip (to market it to merchants/ambassadors), plus an optional
 * polished marketplace listing description. The chip is fetched server-side
 * and ownership verified, so callers cannot market another builder's chip or
 * inject arbitrary prompts.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { chipId, platform, tone, audience, customAngle } = body;
    if (!chipId || !platform) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch the builder's own submission and verify ownership.
    const chip = await base44.entities.ChipSubmission.get(chipId);
    if (!chip) return Response.json({ error: 'Chip not found' }, { status: 404 });
    if (chip.builder_email !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const OPENTILL_KNOWLEDGE = `You are an expert on the openTILL SMPF point-of-sale platform and its Chips marketplace. Use ONLY the facts below. Never invent or assume capabilities.

WHAT openTILL SMPF IS: a modern, cloud-based POS for businesses of all sizes. Core payments that work for every merchant out of the box: cash and card (card via openTILL Payments, powered by Stripe).
OPTIONAL PAYMENTS (opt-in, not default, not available to everyone): crypto via Solana Pay (USDC/custom SPL tokens); EBT/SNAP is NOT a standard feature and is region-limited — NEVER promise EBT acceptance or imply it is included.
DUAL PRICING: a surcharge/cash-discount fee-recovery compliance tool — describe as "recover card-processing fees," never as a discount.
INCLUDED FEATURES: online ordering, pickup/delivery, invoices, inventory, staff management, stations, kitchen/customer display, modifiers, reports, $DUC loyalty rewards on card volume.
CHIPS MARKETPLACE: openTILL Chips are modular add-on features (analytics, marketing, integrations, security, operations, etc.) that merchants and ambassadors can install to extend the POS. Builders earn a 70% revenue share on sales. Chips can be one-time or recurring (monthly/yearly), priced in $DUC.
PRICING: no subscription fees, no long-term contracts, no trial period (do NOT mention a free trial), 0% platform fees to the merchant on the base platform.
ACCURACY: do not present opt-in features or third-party marketplace integrations (DoorDash, Uber Eats, etc.) as guaranteed; say "designed for compliance" at most, never "fully compliant in all states."`;

    const chipFacts = `Chip details:
- Name: ${chip.name}
- Category: ${chip.category}
- Short description: ${chip.short_description || ''}
- Full description: ${chip.description || ''}
- Pricing model: ${chip.pricing_model || 'free'}${chip.price ? ` (${chip.price} ${chip.billing_period || ''})` : ''}
- Status: ${chip.status}
- Total installs: ${chip.total_installs || 0}
- Rating: ${chip.rating ? chip.rating.toFixed(1) : 'new'} (${chip.review_count || 0} reviews)`;

    const audienceLabels = {
      merchants: 'merchants (POS owners looking to add capabilities)',
      ambassadors: 'ambassadors (resellers who can recommend your Chip to their merchants)',
      both: 'both merchants and ambassadors',
    };

    const platformGuides = {
      email: 'Write a short outreach email: subject line, greeting, 2-paragraph body, and a clear CTA to view the Chip on the marketplace. Under 200 words.',
      instagram: 'Write an Instagram caption with emojis and 5-7 relevant hashtags. Max 150 words.',
      twitter: 'Write a Twitter/X post under 280 characters, punchy, with 1-2 hashtags.',
      sms: 'Write an SMS under 160 characters with a clear offer and CTA.',
      listing: 'Write a polished marketplace listing description: 2-3 short paragraphs that describe what the Chip does, who it is for, and the key benefits. No hashtags, no subject line — just the listing body. Under 120 words.',
    };

    const prompt = `Write promotional marketing copy for an openTILL Chip to help a builder market it to ${audienceLabels[audience] || audienceLabels.merchants}.
Tone: ${tone || 'professional'}.
${customAngle ? `Extra angle / focus from the builder: ${customAngle}` : ''}

${OPENTILL_KNOWLEDGE}

${chipFacts}

${platformGuides[platform] || platformGuides.email}

Rules:
- Be accurate. Only describe what this Chip actually does based on the details above. Do not invent features, integrations, or metrics.
- Do not promise EBT/SNAP, crypto, or any openTILL feature the Chip does not provide.
- If the Chip is not yet published, frame it as "coming soon" rather than claiming live installs/sales.
- ${platform === 'listing' ? 'Return only the listing description text.' : 'Make it authentic and ready to send.'}`;

    const content = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });
    return Response.json({ success: true, content });
  } catch (error) {
    console.error('Error generating builder marketing:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});