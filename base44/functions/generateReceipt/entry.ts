import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { order_id } = await req.json();

    if (!order_id) {
      return Response.json({ error: 'order_id is required' }, { status: 400 });
    }

    // Fetch order details
    const order = await base44.asServiceRole.entities.Order.get(order_id);
    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }
    
    // Verify user has access to this order
    if (user.role !== 'admin' && user.merchant_id !== order.merchant_id) {
      return Response.json({ error: 'Forbidden: Access denied to this order' }, { status: 403 });
    }

    // Fetch merchant details
    const merchant = await base44.asServiceRole.entities.Merchant.get(order.merchant_id);
    if (!merchant) {
      return Response.json({ error: 'Merchant not found' }, { status: 404 });
    }

    // Generate receipt text
    const receipt = generateReceiptText(order, merchant);

    // Generate HTML receipt for web display
    const receiptHtml = generateReceiptHtml(order, merchant);

    return Response.json({
      success: true,
      receipt_text: receipt,
      receipt_html: receiptHtml,
      order: order
    });

  } catch (error) {
    console.error('generateReceipt error:', error);
    return Response.json({ 
      error: 'Failed to generate receipt',
      details: error.message 
    }, { status: 500 });
  }
});

function generateReceiptText(order, merchant) {
  const width = 42; // Standard receipt printer width
  const line = '='.repeat(width);
  const spacer = '-'.repeat(width);

  let receipt = '';
  
  // Header
  receipt += centerText('ChainLINK POS', width) + '\n';
  receipt += centerText(merchant.business_name || 'Store', width) + '\n';
  receipt += centerText(merchant.address || '', width) + '\n';
  receipt += centerText(merchant.phone || '', width) + '\n';
  receipt += line + '\n';
  
  // Order Info
  receipt += `Order #: ${order.order_number}\n`;
  receipt += `Date: ${new Date(order.created_date).toLocaleString()}\n`;
  receipt += `Station: ${order.station_name || order.station_id}\n`;
  if (order.customer_name) {
    receipt += `Customer: ${order.customer_name}\n`;
  }
  receipt += line + '\n';
  
  // Items
  order.items.forEach(item => {
    const qty = item.quantity;
    const name = item.product_name;
    const price = (item.item_total * qty).toFixed(2);
    
    receipt += `${qty}x ${name}\n`;
    receipt += rightAlign(`$${price}`, width) + '\n';
    
    // Modifiers
    if (item.modifiers && item.modifiers.length > 0) {
      item.modifiers.forEach(mod => {
        receipt += `  + ${mod.name}\n`;
      });
    }
  });
  
  receipt += spacer + '\n';
  
  // Totals
  receipt += formatLine('Subtotal:', `$${order.subtotal.toFixed(2)}`, width) + '\n';
  
  if (order.discount_amount > 0) {
    receipt += formatLine('Discount:', `-$${order.discount_amount.toFixed(2)}`, width) + '\n';
  }
  
  receipt += formatLine('Tax:', `$${order.tax_amount.toFixed(2)}`, width) + '\n';
  
  if (order.tip_amount > 0) {
    receipt += formatLine('Tip:', `$${order.tip_amount.toFixed(2)}`, width) + '\n';
  }
  
  if (order.surcharge_amount > 0) {
    receipt += formatLine(order.surcharge_label || 'Surcharge:', `$${order.surcharge_amount.toFixed(2)}`, width) + '\n';
  }
  
  receipt += line + '\n';
  receipt += formatLine('TOTAL:', `$${order.total.toFixed(2)}`, width) + '\n';
  receipt += line + '\n';
  
  // Payment Info
  const paymentMethod = order.payment_method?.toUpperCase() || 'UNKNOWN';
  receipt += formatLine('Payment:', paymentMethod, width) + '\n';
  
  if (order.payment_details?.card_last_4) {
    receipt += formatLine('Card:', `****${order.payment_details.card_last_4}`, width) + '\n';
  }
  
  if (order.payment_details?.approval_code) {
    receipt += formatLine('Approval:', order.payment_details.approval_code, width) + '\n';
  }
  
  if (order.payment_details?.transaction_signature) {
    receipt += `TX: ${order.payment_details.transaction_signature.substring(0, 16)}...\n`;
  }
  
  if (order.payment_details?.change_due > 0) {
    receipt += formatLine('Change:', `$${order.payment_details.change_due.toFixed(2)}`, width) + '\n';
  }
  
  // Age Verification
  if (order.age_verification?.verified) {
    receipt += spacer + '\n';
    receipt += 'AGE VERIFIED\n';
    receipt += `Method: ${order.age_verification.verification_method}\n`;
    receipt += `By: ${order.age_verification.verified_by_user_name}\n`;
  }
  
  // Footer
  receipt += line + '\n';
  receipt += centerText('Thank you for your business!', width) + '\n';
  receipt += centerText('Powered by ChainLINK POS', width) + '\n';
  
  return receipt;
}

function generateReceiptHtml(order, merchant) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt - ${order.order_number}</title>
  <style>
    body {
      font-family: 'Courier New', monospace;
      max-width: 400px;
      margin: 20px auto;
      padding: 20px;
      background: white;
    }
    .receipt {
      border: 2px solid #000;
      padding: 20px;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
    .line { border-top: 2px solid #000; margin: 10px 0; }
    .spacer { border-top: 1px dashed #000; margin: 10px 0; }
    .row { display: flex; justify-content: space-between; margin: 5px 0; }
    .header { font-size: 18px; font-weight: bold; }
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="center header">ChainLINK POS</div>
    <div class="center">${merchant.business_name || 'Store'}</div>
    <div class="center">${merchant.address || ''}</div>
    <div class="center">${merchant.phone || ''}</div>
    <div class="line"></div>
    
    <div>Order #: ${order.order_number}</div>
    <div>Date: ${new Date(order.created_date).toLocaleString()}</div>
    <div>Station: ${order.station_name || order.station_id}</div>
    ${order.customer_name ? `<div>Customer: ${order.customer_name}</div>` : ''}
    <div class="line"></div>
    
    ${order.items.map(item => `
      <div class="row">
        <span>${item.quantity}x ${item.product_name}</span>
        <span>$${(item.item_total * item.quantity).toFixed(2)}</span>
      </div>
      ${item.modifiers?.map(mod => `<div style="margin-left: 20px;">+ ${mod.name}</div>`).join('') || ''}
    `).join('')}
    
    <div class="spacer"></div>
    
    <div class="row">
      <span>Subtotal:</span>
      <span>$${order.subtotal.toFixed(2)}</span>
    </div>
    ${order.discount_amount > 0 ? `
      <div class="row">
        <span>Discount:</span>
        <span>-$${order.discount_amount.toFixed(2)}</span>
      </div>
    ` : ''}
    <div class="row">
      <span>Tax:</span>
      <span>$${order.tax_amount.toFixed(2)}</span>
    </div>
    ${order.tip_amount > 0 ? `
      <div class="row">
        <span>Tip:</span>
        <span>$${order.tip_amount.toFixed(2)}</span>
      </div>
    ` : ''}
    ${order.surcharge_amount > 0 ? `
      <div class="row">
        <span>${order.surcharge_label || 'Surcharge'}:</span>
        <span>$${order.surcharge_amount.toFixed(2)}</span>
      </div>
    ` : ''}
    
    <div class="line"></div>
    <div class="row bold">
      <span>TOTAL:</span>
      <span>$${order.total.toFixed(2)}</span>
    </div>
    <div class="line"></div>
    
    <div class="row">
      <span>Payment:</span>
      <span>${order.payment_method?.toUpperCase()}</span>
    </div>
    ${order.payment_details?.card_last_4 ? `
      <div class="row">
        <span>Card:</span>
        <span>****${order.payment_details.card_last_4}</span>
      </div>
    ` : ''}
    
    ${order.age_verification?.verified ? `
      <div class="spacer"></div>
      <div class="center bold">AGE VERIFIED</div>
      <div class="center">By: ${order.age_verification.verified_by_user_name}</div>
    ` : ''}
    
    <div class="line"></div>
    <div class="center">Thank you for your business!</div>
    <div class="center">Powered by ChainLINK POS</div>
  </div>
  
  <div class="center no-print" style="margin-top: 20px;">
    <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px;">Print Receipt</button>
  </div>
</body>
</html>
  `;
}

function centerText(text, width) {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text;
}

function rightAlign(text, width) {
  const padding = Math.max(0, width - text.length);
  return ' '.repeat(padding) + text;
}

function formatLine(label, value, width) {
  const space = width - label.length - value.length;
  return label + ' '.repeat(Math.max(1, space)) + value;
}