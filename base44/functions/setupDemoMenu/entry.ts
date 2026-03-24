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

    console.log('setupDemoMenu: Looking up merchant with email:', email);

    // Find merchant by email
    const merchants = await base44.asServiceRole.entities.Merchant.filter({
      owner_email: email.toLowerCase()
    });

    if (!merchants || merchants.length === 0) {
      return Response.json({
        success: false,
        error: 'No merchant found with that email address'
      }, { status: 404 });
    }

    const merchant = merchants[0];
    console.log('setupDemoMenu: Found merchant:', merchant.id, merchant.business_name);

    // Check if demo menu already exists
    const existingDepartments = await base44.asServiceRole.entities.Department.filter({
      merchant_id: merchant.id
    });

    if (existingDepartments && existingDepartments.length > 0) {
      console.log('setupDemoMenu: Demo menu already exists, clearing old data...');
      
      // Delete existing departments
      for (const dept of existingDepartments) {
        await base44.asServiceRole.entities.Department.delete(dept.id);
      }
      
      // Delete existing products
      const existingProducts = await base44.asServiceRole.entities.Product.filter({
        merchant_id: merchant.id
      });
      
      for (const prod of existingProducts) {
        await base44.asServiceRole.entities.Product.delete(prod.id);
      }
      
      console.log('setupDemoMenu: Cleared old demo data');
    }

    // Define 10 departments
    const departments = [
      { name: 'Appetizers', display_order: 1, color: '#f59e0b', icon: '🥟' },
      { name: 'Entrees', display_order: 2, color: '#ef4444', icon: '🍔' },
      { name: 'Sides', display_order: 3, color: '#10b981', icon: '🍟' },
      { name: 'Beverages', display_order: 4, color: '#3b82f6', icon: '🥤' },
      { name: 'Desserts', display_order: 5, color: '#ec4899', icon: '🍰' },
      { name: 'Alcohol', display_order: 6, color: '#8b5cf6', icon: '🍺' },
      { name: 'Breakfast', display_order: 7, color: '#fbbf24', icon: '🍳' },
      { name: 'Salads', display_order: 8, color: '#34d399', icon: '🥗' },
      { name: 'Pizza', display_order: 9, color: '#f87171', icon: '🍕' },
      { name: 'Seafood', display_order: 10, color: '#60a5fa', icon: '🦞' }
    ];

    console.log('setupDemoMenu: Creating departments...');
    const createdDepartments = [];
    for (const dept of departments) {
      const created = await base44.asServiceRole.entities.Department.create({
        merchant_id: merchant.id,
        dealer_id: merchant.dealer_id || null,
        ...dept,
        is_active: true
      });
      createdDepartments.push(created);
      console.log('setupDemoMenu: Created department:', created.name);
    }

    // Define products with departments (expanded to include new departments)
    const products = [
      // Appetizers
      { name: 'Buffalo Wings', department: 'Appetizers', price: 12.99, description: 'Spicy chicken wings with ranch', image_url: 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=400', stock_quantity: 100, sku: 'APP001', ebt_eligible: false },
      { name: 'Mozzarella Sticks', department: 'Appetizers', price: 8.99, description: 'Breaded mozzarella with marinara', image_url: 'https://images.unsplash.com/photo-1531749668029-2db88e4276c7?w=400', stock_quantity: 100, sku: 'APP002', ebt_eligible: false },
      { name: 'Nachos Supreme', department: 'Appetizers', price: 10.99, description: 'Loaded nachos with all toppings', image_url: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=400', stock_quantity: 100, sku: 'APP003', ebt_eligible: false },
      { name: 'Onion Rings', department: 'Appetizers', price: 6.99, description: 'Crispy battered onion rings', image_url: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=400', stock_quantity: 100, sku: 'APP004', ebt_eligible: false },
      { name: 'Spinach Artichoke Dip', department: 'Appetizers', price: 9.99, description: 'Creamy dip with tortilla chips', image_url: 'https://images.unsplash.com/photo-1541529086526-db283c563270?w=400', stock_quantity: 100, sku: 'APP005', ebt_eligible: false },

      // Entrees
      { name: 'Classic Burger', department: 'Entrees', price: 14.99, description: 'Beef patty with lettuce, tomato, onion', image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400', stock_quantity: 100, sku: 'ENT001', ebt_eligible: true },
      { name: 'Grilled Chicken Sandwich', department: 'Entrees', price: 13.99, description: 'Marinated chicken breast with veggies', image_url: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=400', stock_quantity: 100, sku: 'ENT002', ebt_eligible: true },
      { name: 'BBQ Ribs', department: 'Entrees', price: 22.99, description: 'Fall-off-the-bone tender ribs', image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400', stock_quantity: 100, sku: 'ENT003', ebt_eligible: true },
      { name: 'Fish and Chips', department: 'Entrees', price: 16.99, description: 'Beer-battered fish with fries', image_url: 'https://images.unsplash.com/photo-1579208575657-c595a05383b7?w=400', stock_quantity: 100, sku: 'ENT004', ebt_eligible: true },
      { name: 'Veggie Wrap', department: 'Entrees', price: 11.99, description: 'Fresh vegetables in a tortilla wrap', image_url: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400', stock_quantity: 100, sku: 'ENT005', ebt_eligible: true },

      // Sides
      { name: 'French Fries', department: 'Sides', price: 4.99, description: 'Crispy golden fries', image_url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400', stock_quantity: 100, sku: 'SID001', ebt_eligible: true },
      { name: 'Coleslaw', department: 'Sides', price: 3.99, description: 'Creamy cabbage slaw', image_url: 'https://images.unsplash.com/photo-1625938145312-598e9f0c90d6?w=400', stock_quantity: 100, sku: 'SID002', ebt_eligible: true },
      { name: 'Mac and Cheese', department: 'Sides', price: 5.99, description: 'Creamy mac and cheese', image_url: 'https://images.unsplash.com/photo-1543339494-b4cd4f7ba686?w=400', stock_quantity: 100, sku: 'SID003', ebt_eligible: true },
      { name: 'Garden Salad', department: 'Sides', price: 6.99, description: 'Fresh mixed greens', image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400', stock_quantity: 100, sku: 'SID004', ebt_eligible: true },

      // Beverages
      { name: 'Coca-Cola', department: 'Beverages', price: 2.99, description: 'Classic Coke', image_url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400', stock_quantity: 100, sku: 'BEV001', ebt_eligible: true },
      { name: 'Iced Tea', department: 'Beverages', price: 2.99, description: 'Freshly brewed iced tea', image_url: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=400', stock_quantity: 100, sku: 'BEV002', ebt_eligible: true },
      { name: 'Lemonade', department: 'Beverages', price: 3.49, description: 'Fresh squeezed lemonade', image_url: 'https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9d?w=400', stock_quantity: 100, sku: 'BEV003', ebt_eligible: true },
      { name: 'Coffee', department: 'Beverages', price: 2.49, description: 'Hot brewed coffee', image_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400', stock_quantity: 100, sku: 'BEV004', ebt_eligible: true },

      // Desserts
      { name: 'Chocolate Cake', department: 'Desserts', price: 6.99, description: 'Rich chocolate layer cake', image_url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400', stock_quantity: 100, sku: 'DES001', ebt_eligible: false },
      { name: 'Ice Cream Sundae', department: 'Desserts', price: 5.99, description: 'Vanilla ice cream with toppings', image_url: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400', stock_quantity: 100, sku: 'DES002', ebt_eligible: false },
      { name: 'Apple Pie', department: 'Desserts', price: 5.49, description: 'Classic apple pie slice', image_url: 'https://images.unsplash.com/photo-1535920527002-b35e96722eb9?w=400', stock_quantity: 100, sku: 'DES003', ebt_eligible: false },
      { name: 'Cheesecake', department: 'Desserts', price: 7.99, description: 'New York style cheesecake', image_url: 'https://images.unsplash.com/photo-1533134242758-7d19acad2a87?w=400', stock_quantity: 100, sku: 'DES004', ebt_eligible: false },

      // Alcohol
      { name: 'Budweiser', department: 'Alcohol', price: 5.99, description: 'Classic American lager', image_url: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400', stock_quantity: 100, sku: 'ALC001', age_restricted: true, minimum_age: 21, ebt_eligible: false },
      { name: 'House Wine', department: 'Alcohol', price: 8.99, description: 'Red or white wine', image_url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400', stock_quantity: 100, sku: 'ALC002', age_restricted: true, minimum_age: 21, ebt_eligible: false },
      { name: 'Margarita', department: 'Alcohol', price: 9.99, description: 'Classic margarita on the rocks', image_url: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400', stock_quantity: 100, sku: 'ALC003', age_restricted: true, minimum_age: 21, ebt_eligible: false },

      // Breakfast
      { name: 'Pancake Stack', department: 'Breakfast', price: 8.99, description: 'Three fluffy pancakes with syrup', image_url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400', stock_quantity: 100, sku: 'BRK001', ebt_eligible: true },
      { name: 'Eggs Benedict', department: 'Breakfast', price: 11.99, description: 'Poached eggs with hollandaise', image_url: 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=400', stock_quantity: 100, sku: 'BRK002', ebt_eligible: true },
      { name: 'Breakfast Burrito', department: 'Breakfast', price: 9.99, description: 'Eggs, cheese, bacon in a tortilla', image_url: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400', stock_quantity: 100, sku: 'BRK003', ebt_eligible: true },
      { name: 'French Toast', department: 'Breakfast', price: 8.49, description: 'Classic french toast with berries', image_url: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=400', stock_quantity: 100, sku: 'BRK004', ebt_eligible: true },

      // Salads
      { name: 'Caesar Salad', department: 'Salads', price: 9.99, description: 'Romaine, parmesan, croutons, caesar dressing', image_url: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400', stock_quantity: 100, sku: 'SAL001', ebt_eligible: true },
      { name: 'Greek Salad', department: 'Salads', price: 10.99, description: 'Feta, olives, tomatoes, cucumber', image_url: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400', stock_quantity: 100, sku: 'SAL002', ebt_eligible: true },
      { name: 'Cobb Salad', department: 'Salads', price: 12.99, description: 'Chicken, bacon, egg, avocado, blue cheese', image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400', stock_quantity: 100, sku: 'SAL003', ebt_eligible: true },
      { name: 'Caprese Salad', department: 'Salads', price: 9.49, description: 'Fresh mozzarella, tomatoes, basil', image_url: 'https://images.unsplash.com/photo-1592417817098-8fd3d9eb14a5?w=400', stock_quantity: 100, sku: 'SAL004', ebt_eligible: true },

      // Pizza
      { name: 'Margherita Pizza', department: 'Pizza', price: 14.99, description: 'Classic tomato, mozzarella, basil', image_url: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400', stock_quantity: 100, sku: 'PIZ001', ebt_eligible: true },
      { name: 'Pepperoni Pizza', department: 'Pizza', price: 15.99, description: 'Loaded with pepperoni', image_url: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400', stock_quantity: 100, sku: 'PIZ002', ebt_eligible: true },
      { name: 'Supreme Pizza', department: 'Pizza', price: 17.99, description: 'Sausage, peppers, onions, mushrooms', image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400', stock_quantity: 100, sku: 'PIZ003', ebt_eligible: true },
      { name: 'BBQ Chicken Pizza', department: 'Pizza', price: 16.99, description: 'Grilled chicken with BBQ sauce', image_url: 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=400', stock_quantity: 100, sku: 'PIZ004', ebt_eligible: true },

      // Seafood
      { name: 'Grilled Salmon', department: 'Seafood', price: 19.99, description: 'Atlantic salmon with lemon butter', image_url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400', stock_quantity: 100, sku: 'SEA001', ebt_eligible: true },
      { name: 'Shrimp Scampi', department: 'Seafood', price: 18.99, description: 'Garlic butter shrimp over pasta', image_url: 'https://images.unsplash.com/photo-1633504581786-316c8002b1b9?w=400', stock_quantity: 100, sku: 'SEA002', ebt_eligible: true },
      { name: 'Lobster Roll', department: 'Seafood', price: 24.99, description: 'Maine lobster on a toasted bun', image_url: 'https://images.unsplash.com/photo-1559847844-d1c5425fa15d?w=400', stock_quantity: 100, sku: 'SEA003', ebt_eligible: true },
      { name: 'Fish Tacos', department: 'Seafood', price: 13.99, description: 'Grilled fish with cabbage slaw', image_url: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400', stock_quantity: 100, sku: 'SEA004', ebt_eligible: true }
    ];

    console.log('setupDemoMenu: Creating products...');
    let createdCount = 0;
    for (const prod of products) {
      await base44.asServiceRole.entities.Product.create({
        merchant_id: merchant.id,
        dealer_id: merchant.dealer_id || null,
        ...prod,
        is_active: true,
        pos_mode: ['restaurant', 'retail', 'quick_service', 'food_truck']
      });
      createdCount++;
    }

    console.log('setupDemoMenu: Created', createdCount, 'products');

    return Response.json({
      success: true,
      message: 'Demo menu setup successfully with 10 departments',
      stats: {
        departments: createdDepartments.length,
        products: createdCount
      }
    });

  } catch (error) {
    console.error('setupDemoMenu: Error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Failed to setup demo menu'
    }, { status: 500 });
  }
});