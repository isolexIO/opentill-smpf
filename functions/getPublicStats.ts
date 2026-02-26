import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Public endpoint to fetch platform statistics for the home page
 * Uses service role to bypass RLS restrictions
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Use service role to bypass RLS and get stats
    const merchants = await base44.asServiceRole.entities.Merchant.list();
    const activeMerchants = merchants.filter(m => (m.status === 'active' || m.status === 'trial') && !m.is_demo);
    
    const dealers = await base44.asServiceRole.entities.Dealer.list();
    const activeDealers = dealers.filter(d => d.status === 'active' || d.status === 'trial');

    // Calculate additional stats
    const totalRevenue = merchants.reduce((sum, m) => sum + (m.total_revenue || 0), 0);
    const totalBuilders = await base44.asServiceRole.entities.Builder.list();
    const verifiedBuilders = totalBuilders.filter(b => b.status === 'verified').length;

    return Response.json({
      success: true,
      stats: {
        activeMerchants: activeMerchants.length,
        activeDealers: activeDealers.length,
        totalMerchants: merchants.length,
        totalDealers: dealers.length,
        totalRevenue: totalRevenue,
        totalBuilders: totalBuilders.length,
        verifiedBuilders: verifiedBuilders
      }
    });

  } catch (error) {
    console.error('Error fetching public stats:', error);
    return Response.json({
      success: false,
      error: 'Failed to fetch stats',
      stats: {
        activeMerchants: 0,
        activeDealers: 0,
        totalMerchants: 0,
        totalDealers: 0,
        totalRevenue: 0,
        totalBuilders: 0,
        verifiedBuilders: 0
      }
    }, { status: 500 });
  }
});