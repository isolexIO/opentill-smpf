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

    const prompt = `Analyze these merchant statistics and suggest 3 targeted marketing campaigns:

Merchants: ${JSON.stringify(merchantStats, null, 2)}

For each campaign suggestion, provide:
1. Campaign name
2. Target segment (high_performers, new_merchants, struggling, or all)
3. Campaign type (social_media, email, multi_channel)
4. Description of the strategy
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