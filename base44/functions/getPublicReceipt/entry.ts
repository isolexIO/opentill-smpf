import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Simple in-memory rate limiting (per-IP) to prevent public endpoint abuse
const ipHits = new Map();
function rateLimited(ip, maxPerWindow = 30, windowMs = 60000) {
  const now = Date.now();
  const hits = (ipHits.get(ip) || []).filter((t) => now - t < windowMs);
  if (hits.length >= maxPerWindow) return true;
  hits.push(now);
  ipHits.set(ip, hits);
  return false;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (rateLimited(ip, 30, 60000)) {
      return Response.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await req.json();
    const { order_id } = body;
    if (!order_id) {
      return Response.json({ error: 'order_id is required' }, { status: 400 });
    }

    // Public endpoint — no auth required (customers scan a QR code to view)
    const order = await base44.asServiceRole.entities.Order.get(order_id);
    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    const merchant = await base44.asServiceRole.entities.Merchant.get(order.merchant_id);
    if (!merchant) {
      return Response.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const receiptHtml = generateReceiptHtml(order, merchant);

    return Response.json({
      success: true,
      receipt_html: receiptHtml,
      order_number: order.order_number,
      total: order.total,
      business_name: merchant.business_name,
    });
  } catch (error) {
    console.error('getPublicReceipt error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function generateReceiptHtml(order, merchant) {
  const e = escapeHtml;
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt - ${e(order.order_number)}</title>
  <style>
    body { font-family: 'Courier New', monospace; max-width: 400px; margin: 0 auto; padding: 16px; background: white; }
    .receipt { padding: 8px; }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
    .line { border-top: 2px solid #000; margin: 10px 0; }
    .spacer { border-top: 1px dashed #000; margin: 10px 0; }
    .row { display: flex; justify-content: space-between; margin: 5px 0; }
    .header { font-size: 18px; font-weight: bold; }
    .item-name { flex: 1; }
    .item-price { text-align: right; white-space: nowrap; margin-left: 8px; }
    .mod { margin-left: 20px; color: #555; font-size: 0.9em; }
    @media print { body { margin: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="center header">openTILL</div>
    <div class="center">${e(merchant.business_name || 'Store')}</div>
    <div class="center">${e(merchant.address || '')}</div>
    <div class="center">${e(merchant.phone || '')}</div>
    <div class="line"></div>

    <div>Order #: ${e(order.order_number)}</div>
    <div>Date: ${e(new Date(order.created_date).toLocaleString())}</div>
    <div>Station: ${e(order.station_name || order.station_id || '')}</div>
    ${order.customer_name ? `<div>Customer: ${e(order.customer_name)}</div>` : ''}
    <div class="line"></div>

    ${order.items.map(item => `
      <div class="row">
        <span class="item-name">${e(item.quantity)}x ${e(item.product_name)}</span>
        <span class="item-price">$${(item.item_total * item.quantity).toFixed(2)}</span>
      </div>
      ${item.modifiers?.map(mod => `<div class="mod">+ ${e(mod.name)}</div>`).join('') || ''}
    `).join('')}

    <div class="spacer"></div>

    <div class="row"><span>Subtotal:</span><span>$${order.subtotal.toFixed(2)}</span></div>
    ${order.discount_amount > 0 ? `<div class="row"><span>Discount:</span><span>-$${order.discount_amount.toFixed(2)}</span></div>` : ''}
    <div class="row"><span>Tax:</span><span>$${order.tax_amount.toFixed(2)}</span></div>
    ${order.tip_amount > 0 ? `<div class="row"><span>Tip:</span><span>$${order.tip_amount.toFixed(2)}</span></div>` : ''}
    ${order.surcharge_amount > 0 ? `<div class="row"><span>${e(order.surcharge_label || 'Surcharge')}:</span><span>$${order.surcharge_amount.toFixed(2)}</span></div>` : ''}

    <div class="line"></div>
    <div class="row bold" style="font-size:1.1em;"><span>TOTAL:</span><span>$${order.total.toFixed(2)}</span></div>
    <div class="line"></div>

    <div class="row"><span>Payment:</span><span>${e(order.payment_method?.toUpperCase())}</span></div>
    ${order.payment_details?.card_last_4 ? `<div class="row"><span>Card:</span><span>****${e(order.payment_details.card_last_4)}</span></div>` : ''}

    ${order.age_verification?.verified ? `<div class="spacer"></div><div class="center bold">AGE VERIFIED</div><div class="center">By: ${e(order.age_verification.verified_by_user_name)}</div>` : ''}

    <div class="line"></div>
    <div class="center">Thank you for your business!</div>
    <div class="center" style="font-size:0.85em;color:#888;">Powered by openTILL Corporation</div>
  </div>
</body>
</html>
  `;
}