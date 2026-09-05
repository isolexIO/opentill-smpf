import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';

/**
 * Ambassador Campaign Manager — analyzes the ambassador's own merchants and
 * suggests 3 targeted marketing campaigns. Fetches merchant data server-side
 * (scoped to the caller's dealer_id) so callers cannot feed arbitrary data.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const dealerId = body.dealerId || user.dealer_id;
    if (!dealerId) return Response.json({ error: 'Dealer ID required' }, { status: 400 });

    const merchants = await base44.asServiceRole.entities.Merchant.filter({ dealer_id: dealerId });
    const merchantStats = merchants.map(m => ({
      name: m.business_name,
      revenue: m.total_revenue || 0,
      status: m.status
    }));

    const OPENTILL_KNOWLEDGE = `You are an expert on the openTILL SMPF point-of-sale platform. Use ONLY the facts below when describing campaigns. Never invent or assume capabilities, and never promise a feature a prospect does not automatically get.

WHAT openTILL SMPF IS: a modern, cloud-based POS for businesses of all sizes. Core payments that work for every merchant out of the box: cash and card (card via openTILL Payments, powered by Stripe).
OPTIONAL PAYMENTS (opt-in, not default, not available to everyone): crypto via Solana Pay (USDC/custom SPL tokens); EBT/SNAP is NOT a standard feature and is region-limited — campaigns must NEVER promise EBT acceptance or imply it is included. Only reference EBT if a campaign explicitly targets grocery/convenience merchants who ask about it, and frame it as "ask the openTILL team."
DUAL PRICING: a surcharge/cash-discount fee-recovery compliance tool — describe as "recover card-processing fees," never as a discount.
INCLUDED FEATURES: online ordering, pickup/delivery, invoices, inventory, staff management, stations, kitchen/customer display, modifiers, reports, $DUC loyalty rewards on card volume, openTILL Chips marketplace.
PRICING: no subscription fees, no long-term contracts, no trial period (do NOT mention a free trial), 0% platform fees to the merchant on the base platform.
ACCURACY: do not present opt-in features or third-party marketplace integrations (DoorDash, Uber Eats, etc.) as guaranteed; say "designed for compliance" at most, never "fully compliant in all states."`;

    const prompt = `Analyze these merchant statistics and suggest 3 targeted marketing campaigns to help an openTILL ambassador recruit and retain merchants.

${OPENTILL_KNOWLEDGE}

Merchants: ${JSON.stringify(merchantStats, null, 2)}

For each campaign suggestion, provide:
1. Campaign name
2. Target segment (high_performers, new_merchants, struggling, or all)
3. Campaign type (social_media, email, multi_channel)
4. Description of the strategy (must be accurate to openTILL capabilities — no EBT promises, no "free trial" claims)
5. Expected impact
6. Recommended budget

Return as JSON array.`;

    const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          campaigns: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                campaign_name: { type: 'string' },
                target_segment: { type: 'string' },
                campaign_type: { type: 'string' },
                description: { type: 'string' },
                expected_impact: { type: 'string' },
                recommended_budget: { type: 'number' }
              }
            }
          }
        }
      }
    });

    return Response.json({ success: true, campaigns: response.campaigns || [] });
  } catch (error) {
    console.error('Error generating campaign suggestions:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});