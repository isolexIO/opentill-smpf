import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin' && user.role !== 'root_admin')) {
      return Response.json({
        success: false,
        error: 'Unauthorized - Super admin privileges required'
      }, { status: 403 });
    }

    const body = await req.json();
    const { email } = body;

    if (!email) {
      return Response.json({
        success: false,
        error: 'Email is required'
      }, { status: 400 });
    }

    console.log('clearDemoMenu: Looking up merchant with email:', email);

    // Find merchant by email
    const merchants = await base44.asServiceRole.entities.Merchant.filter({
      owner_email: email.toLowerCase().trim()
    });

    if (!merchants || merchants.length === 0) {
      return Response.json({
        success: false,
        error: 'No merchant found with that email address'
      }, { status: 404 });
    }

    const merchant = merchants[0];
    console.log('clearDemoMenu: Found merchant:', merchant.id, merchant.business_name);

    // Delete all departments
    const departments = await base44.asServiceRole.entities.Department.filter({
      merchant_id: merchant.id
    });

    console.log('clearDemoMenu: Deleting', departments.length, 'departments');
    for (const dept of departments) {
      await base44.asServiceRole.entities.Department.delete(dept.id);
    }

    // Delete all products
    const products = await base44.asServiceRole.entities.Product.filter({
      merchant_id: merchant.id
    });

    console.log('clearDemoMenu: Deleting', products.length, 'products');
    for (const prod of products) {
      await base44.asServiceRole.entities.Product.delete(prod.id);
    }

    console.log('clearDemoMenu: Clear complete');

    return Response.json({
      success: true,
      message: `Successfully cleared ${departments.length} departments and ${products.length} products`,
      stats: {
        departments: departments.length,
        products: products.length
      }
    });

  } catch (error) {
    console.error('clearDemoMenu: Error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Failed to clear demo menu'
    }, { status: 500 });
  }
});