import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Public endpoint to fetch platform statistics for the home page
 * Uses service role to bypass RLS restrictions
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Use service role to bypass RLS and get stats
    const activeMerchants = await base44.asServiceRole.entities.Merchant.filter({ 
      status: 'active' 
    });
    
    const activeDealers = await base44.asServiceRole.entities.Dealer.filter({ 
      $or: [{ status: 'active' }, { status: 'trial' }] 
    });

    return Response.json({
      success: true,
      stats: {
        activeMerchants: activeMerchants.length,
        activeDealers: activeDealers.length
      }
    });

  } catch (error) {
    console.error('Error fetching public stats:', error);
    return Response.json({
      success: false,
      error: 'Failed to fetch stats',
      stats: {
        activeMerchants: 0,
        activeDealers: 0
      }
    }, { status: 500 });
  }
});