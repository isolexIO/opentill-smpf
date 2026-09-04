import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';

/**
 * Ambassador Performance Analytics — analyzes the ambassador's own marketing
 * campaigns and returns 5 optimization recommendations. Fetches campaign data
 * server-side (scoped to the caller's dealer_id).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const dealerId = body.dealerId || user.dealer_id;
    if (!dealerId) return Response.json({ error: 'Dealer ID required' }, { status: 400 });

    const campaigns = await base44.asServiceRole.entities.MarketingCampaign.filter({ dealer_id: dealerId });
    const campaignData = campaigns.map(c => ({
      name: c.campaign_name,
      type: c.campaign_type,
      segment: c.target_segment,
      status: c.status,
      budget: c.budget,
      spent: c.actual_spend,
      metrics: c.performance_metrics
    }));

    const prompt = `Analyze these marketing campaign performances and provide 5 specific optimization recommendations:

Campaign Data: ${JSON.stringify(campaignData, null, 2)}

For each recommendation provide:
1. Title (brief recommendation)
2. Description (detailed explanation)
3. Priority (high, medium, low)
4. Expected impact (percentage improvement estimate)
5. Implementation steps (array of actions)

Return as JSON array.`;

    const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          recommendations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                priority: { type: 'string' },
                expected_impact: { type: 'string' },
                implementation_steps: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        }
      }
    });

    return Response.json({ success: true, recommendations: response.recommendations || [] });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});