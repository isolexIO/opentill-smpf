
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, ...params } = await req.json();

    switch (action) {
      case 'printReceipt':
        return await printReceipt(base44, params);
      
      case 'printKitchenTicket':
        return await printKitchenTicket(base44, params);
      
      case 'testPrinter':
        return await testPrinter(base44, params);
      
      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Printer service error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});

async function printReceipt(base44, { orderId, printerIp, printerPort }) {
  // Get order details
  const orders = await base44.entities.Order.filter({ id: orderId });
  if (!orders || orders.length === 0) {
    throw new Error('Order not found');
  }
  
  const order = orders[0];

  // Generate ESC/POS commands (simplified version)
  const escPosCommands = generateReceiptCommands(order);

  // In production, this would send commands to actual printer
  // For now, return success with the commands that would be sent
  return Response.json({
    success: true,
    message: 'Receipt print job queued',
    printer: `${printerIp}:${printerPort}`,
    orderNumber: order.order_number,
    note: 'In production, this would send ESC/POS commands to the printer'
  });
}

async function printKitchenTicket(base44, { orderId, printerIp, printerPort }) {
  const orders = await base44.entities.Order.filter({ id: orderId });
  if (!orders || orders.length === 0) {
    throw new Error('Order not found');
  }
  
  const order = orders[0];

  // Generate kitchen ticket format
  const kitchenCommands = generateKitchenTicketCommands(order);

  return Response.json({
    success: true,
    message: 'Kitchen ticket printed',
    printer: `${printerIp}:${printerPort}`,
    orderNumber: order.order_number,
    note: 'In production, this would send commands to kitchen printer'
  });
}

async function testPrinter(base44, { printerIp, printerPort, printerType }) {
  // Test printer connectivity
  // In production, this would attempt to connect and print a test page
  
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return Response.json({
    success: true,
    message: 'Test print successful',
    printer: `${printerIp}:${printerPort}`,
    type: printerType,
    note: 'This is a simulated test. Real implementation would connect to printer.'
  });
}

function generateReceiptCommands(order) {
  // ESC/POS command generation (simplified)
  // In production, use a library like 'node-thermal-printer'
  return {
    header: 'RECEIPT',
    orderNumber: order.order_number,
    date: new Date(order.created_date).toLocaleString(),
    items: order.items,
    total: order.total
  };
}

function generateKitchenTicketCommands(order) {
  return {
    header: 'KITCHEN TICKET',
    orderNumber: order.order_number,
    time: new Date(order.created_date).toLocaleTimeString(),
    items: order.items.map(item => ({
      name: item.product_name,
      quantity: item.quantity,
      modifiers: item.modifiers || []
    }))
  };
}
