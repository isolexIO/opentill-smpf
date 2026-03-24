import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const merchantId = user.merchant_id;
    if (!merchantId) {
      return Response.json({ error: 'Merchant ID not found' }, { status: 400 });
    }

    // Fetch merchant data
    const [orders, products, inventory, customers] = await Promise.all([
      base44.entities.Order.filter({ merchant_id: merchantId }, '-created_date', 50),
      base44.entities.Product.filter({ merchant_id: merchantId }),
      base44.entities.MerchantInventory.filter({ merchant_id: merchantId }),
      base44.entities.Customer.filter({ merchant_id: merchantId })
    ]);

    // Prepare data summary for AI analysis
    const salesData = {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, o) => sum + (o.total || 0), 0),
      avgOrderValue: orders.length > 0 ? orders.reduce((sum, o) => sum + (o.total || 0), 0) / orders.length : 0,
      ordersByStatus: orders.reduce((acc, o) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
      }, {}),
      topProducts: orders.flatMap(o => o.items || []).reduce((acc, item) => {
        const existing = acc.find(p => p.product_id === item.product_id);
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += item.item_total;
        } else {
          acc.push({
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            revenue: item.item_total
          });
        }
        return acc;
      }, []).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
    };

    const inventoryData = {
      totalItems: inventory.length,
      lowStockItems: inventory.filter(i => i.quantity <= i.reorder_threshold).map(i => ({
        name: i.name,
        currentQuantity: i.quantity,
        threshold: i.reorder_threshold,
        status: i.status
      })),
      outOfStockItems: inventory.filter(i => i.status === 'out_of_stock').length,
      avgInventoryValue: inventory.reduce((sum, i) => sum + ((i.quantity || 0) * (i.cost_per_unit || 0)), 0) / Math.max(inventory.length, 1)
    };

    const customerData = {
      totalCustomers: customers.length,
      avgSpent: customers.length > 0 ? customers.reduce((sum, c) => sum + (c.total_spent || 0), 0) / customers.length : 0,
      avgVisits: customers.length > 0 ? customers.reduce((sum, c) => sum + (c.visit_count || 0), 0) / customers.length : 0,
      topCustomers: customers.sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0)).slice(0, 5).map(c => ({
        name: c.name,
        totalSpent: c.total_spent,
        visitCount: c.visit_count,
        loyaltyPoints: c.loyalty_points
      }))
    };

    // Call LLM for insights
    const prompt = `Analyze the following merchant business data and provide actionable insights:

SALES DATA:
- Total Orders: ${salesData.totalOrders}
- Total Revenue: $${salesData.totalRevenue.toFixed(2)}
- Average Order Value: $${salesData.avgOrderValue.toFixed(2)}
- Order Status Breakdown: ${JSON.stringify(salesData.ordersByStatus)}
- Top 5 Products by Revenue: ${JSON.stringify(salesData.topProducts)}

INVENTORY DATA:
- Total Inventory Items: ${inventoryData.totalItems}
- Low Stock Items (${inventoryData.lowStockItems.length}): ${JSON.stringify(inventoryData.lowStockItems)}
- Out of Stock Items: ${inventoryData.outOfStockItems}
- Average Inventory Value: $${inventoryData.avgInventoryValue.toFixed(2)}

CUSTOMER DATA:
- Total Customers: ${customerData.totalCustomers}
- Average Customer Spend: $${customerData.avgSpent.toFixed(2)}
- Average Customer Visits: ${customerData.avgVisits.toFixed(2)}
- Top 5 Customers: ${JSON.stringify(customerData.topCustomers)}

Please provide:
1. KEY SALES INSIGHTS: Analyze trends, peak performance areas, and revenue patterns
2. INVENTORY RECOMMENDATIONS: Suggest optimizations for stock levels and identify slow-moving items
3. CUSTOMER INSIGHTS: Identify high-value customers, loyalty patterns, and growth opportunities
4. ACTION ITEMS: 3-5 specific, actionable recommendations to improve business

Format the response as a JSON object with keys: salesInsights, inventoryRecommendations, customerInsights, actionItems`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          salesInsights: { type: 'string' },
          inventoryRecommendations: { type: 'string' },
          customerInsights: { type: 'string' },
          actionItems: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    return Response.json({
      success: true,
      insights: response,
      metadata: {
        analysisDate: new Date().toISOString(),
        ordersAnalyzed: salesData.totalOrders,
        itemsAnalyzed: inventoryData.totalItems,
        customersAnalyzed: customerData.totalCustomers
      }
    });
  } catch (error) {
    console.error('Error generating insights:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});