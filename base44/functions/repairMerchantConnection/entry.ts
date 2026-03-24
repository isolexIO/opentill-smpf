import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { user_email, user_merchant_id } = await req.json();

    console.log('repairMerchantConnection: Starting repair for user:', user_email, 'merchant_id:', user_merchant_id);

    if (!user_email) {
      return Response.json({
        success: false,
        error: 'User email is required'
      }, { status: 400 });
    }

    // Find all merchants owned by this user
    const merchants = await base44.asServiceRole.entities.Merchant.filter({
      owner_email: user_email.toLowerCase()
    });

    console.log('repairMerchantConnection: Found', merchants.length, 'merchants for email:', user_email);

    if (!merchants || merchants.length === 0) {
      return Response.json({
        success: false,
        error: 'No merchant found for this user email'
      }, { status: 404 });
    }

    // Get the correct merchant (prefer the one matching user_merchant_id, or just use the first one)
    let correctMerchant = merchants[0];
    if (user_merchant_id) {
      const matched = merchants.find(m => m.id === user_merchant_id);
      if (matched) {
        correctMerchant = matched;
      }
    }

    console.log('repairMerchantConnection: Using merchant:', correctMerchant.id, correctMerchant.business_name);

    // Get current user
    const currentUser = await base44.auth.me();
    
    if (!currentUser) {
      return Response.json({
        success: false,
        error: 'User not authenticated'
      }, { status: 401 });
    }

    console.log('repairMerchantConnection: Current user:', currentUser.email, 'current merchant_id:', currentUser.merchant_id);

    // Update user's merchant_id if it's wrong
    if (currentUser.merchant_id !== correctMerchant.id) {
      console.log('repairMerchantConnection: Updating user merchant_id from', currentUser.merchant_id, 'to', correctMerchant.id);
      
      await base44.auth.updateMe({
        merchant_id: correctMerchant.id,
        dealer_id: correctMerchant.dealer_id || null
      });

      console.log('repairMerchantConnection: User updated successfully');
    }

    return Response.json({
      success: true,
      message: 'Merchant connection repaired successfully',
      merchant_id: correctMerchant.id,
      merchant_name: correctMerchant.business_name
    });

  } catch (error) {
    console.error('repairMerchantConnection: Error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Failed to repair merchant connection'
    }, { status: 500 });
  }
});