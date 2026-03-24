import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Get dealer data and their merchants
 * Used by dealer dashboard
 * This function acts as a permission gateway - if user can call it, they have access
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated
    let user;
    try {
      user = await base44.auth.me();
    } catch (e) {
      console.error('Auth error:', e);
      return Response.json({ 
        success: false,
        error: 'Authentication failed' 
      }, { status: 401 });
    }

    if (!user) {
      return Response.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    console.log('User accessing dealer dashboard:', {
      id: user.id,
      email: user.email,
      role: user.role,
      dealer_id: user.dealer_id
    });

    const { dealer_id } = await req.json();

    if (!dealer_id) {
      return Response.json({ 
        success: false, 
        error: 'dealer_id is required' 
      }, { status: 400 });
    }

    // Verify user has access to this dealer
    const isRootAdmin = user.role === 'root_admin';
    const isDealerAdmin = user.role === 'dealer_admin' && user.dealer_id === dealer_id;
    const ownDealer = user.dealer_id === dealer_id;

    console.log('Access check:', {
      isRootAdmin,
      isDealerAdmin,
      ownDealer,
      requestedDealerId: dealer_id,
      userDealerId: user.dealer_id
    });

    // Allow access if:
    // 1. User is root_admin (can access any dealer)
    // 2. User is dealer_admin for this dealer
    // 3. User's dealer_id matches the requested dealer
    if (!isRootAdmin && !isDealerAdmin && !ownDealer) {
      console.error('Access denied:', {
        user_role: user.role,
        user_dealer_id: user.dealer_id,
        requested_dealer_id: dealer_id
      });
      return Response.json({ 
        success: false, 
        error: 'Access denied to this dealer' 
      }, { status: 403 });
    }

    // At this point, we've verified the user has permission
    // Now fetch the data using service role since the function itself is the permission gateway
    let dealer = null;
    let merchants = [];

    try {
      // Try to load dealer with service role
      const dealers = await base44.asServiceRole.entities.Dealer.filter({ id: dealer_id });
      
      if (dealers && dealers.length > 0) {
        dealer = dealers[0];
        
        // Load merchants
        merchants = await base44.asServiceRole.entities.Merchant.filter({ 
          dealer_id: dealer_id 
        });
      }
    } catch (serviceError) {
      console.error('Service role not available, trying direct access:', serviceError);
      
      // Fallback: If service role doesn't work, try direct access
      // This works because the function itself has verified permissions
      try {
        const dealers = await base44.entities.Dealer.filter({ id: dealer_id });
        
        if (dealers && dealers.length > 0) {
          dealer = dealers[0];
          merchants = await base44.entities.Merchant.filter({ dealer_id: dealer_id });
        }
      } catch (directError) {
        console.error('Direct access also failed:', directError);
        return Response.json({
          success: false,
          error: 'Failed to load dealer data. Please ensure you have proper permissions.'
        }, { status: 500 });
      }
    }
    
    if (!dealer) {
      console.error('Dealer not found:', dealer_id);
      return Response.json({ 
        success: false, 
        error: 'Dealer not found' 
      }, { status: 404 });
    }

    console.log('Successfully loaded dealer:', {
      dealer_id: dealer.id,
      dealer_name: dealer.name,
      merchant_count: merchants.length
    });

    return Response.json({
      success: true,
      dealer,
      merchants: merchants || []
    });

  } catch (error) {
    console.error('Error getting dealer data:', error);
    return Response.json({
      success: false,
      error: error.message || 'An unexpected error occurred'
    }, { status: 500 });
  }
});