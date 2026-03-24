import { createClientFromRequest } from "npm:@base44/sdk@0.7.1";
import { nanoid } from "npm:nanoid@5.0.4";

Deno.serve(async (req) => {
  try {
    const { cart, totals, merchantId, tipAmount } = await req.json();

    if (!cart || !totals || !merchantId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me(); // Requires user to be logged in to create a link

    if (!user) {
        return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401 });
    }

    const orderNumber = `CL-${nanoid(8)}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours expiry

    const newChainLinkOrder = {
        merchant_id: merchantId,
        order_number: orderNumber,
        items: cart.map(item => ({
            product_name: item.name,
            quantity: item.quantity,
            unit_price: item.price,
            item_total: (item.itemTotal || item.price) * item.quantity
        })),
        subtotal: parseFloat(totals.subtotal),
        tax_amount: parseFloat(totals.taxAmount),
        surcharge_amount: parseFloat(totals.surchargeAmount || 0),
        tip_amount: parseFloat(tipAmount || 0),
        total: parseFloat(totals.cardTotal) + parseFloat(tipAmount || 0),
        status: "pending",
        expires_at: expiresAt,
        created_by_user: user.email,
    };

    const createdOrder = await base44.asServiceRole.entities.ChainLinkOrder.create(newChainLinkOrder);

    // Construct the URL using the request's origin
    const url = new URL(req.url);
    const baseUrl = url.origin;
    const paymentUrl = `${baseUrl}/chainlink-payment/${createdOrder.id}`;

    return new Response(JSON.stringify({ payment_url: paymentUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error creating ChainLink:", error.message, error.stack);
    return new Response(JSON.stringify({ error: `Internal Server Error: ${error.message}` }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});