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

      case 'routeJob':
        return await routeJob(base44, params);
      
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

/**
 * Route a print job to the correct printer based on the station's printer
 * assignment, falling back to the merchant's first printer of the matching
 * type (receipt / kitchen / bar), then to any configured printer.
 *
 * Params: { orderId, station_id?, jobType: 'receipt'|'kitchen'|'bar' }
 */
async function routeJob(base44, { orderId, station_id, jobType }) {
  if (!orderId) throw new Error('orderId is required');
  const validTypes = ['receipt', 'kitchen', 'bar'];
  if (!validTypes.includes(jobType)) {
    throw new Error('Invalid jobType. Must be one of: receipt, kitchen, bar');
  }

  const orders = await base44.entities.Order.filter({ id: orderId });
  if (!orders || orders.length === 0) throw new Error('Order not found');
  const order = orders[0];

  const merchantId = order.merchant_id;
  if (!merchantId) throw new Error('Order has no merchant_id');

  // Load merchant printers
  const settingsList = await base44.entities.MerchantSettings.filter({ merchant_id: merchantId });
  const printers = settingsList?.[0]?.hardware_devices?.printers || [];
  if (printers.length === 0) throw new Error('No printers configured for this merchant');

  let printer = null;
  let resolvedVia = 'none';

  // 1. Station-specific assignment
  const sid = station_id || order.station_id;
  if (sid) {
    const stations = await base44.entities.Station.filter({ merchant_id: merchantId, station_id: sid });
    const station = stations?.[0];
    if (station) {
      const field = `${jobType}_printer_id`;
      const assignedId = station[field];
      if (assignedId) {
        const found = printers.find((p) => p.id === assignedId);
        if (found) {
          printer = found;
          resolvedVia = `station:${station.name}`;
        }
      }
    }
  }

  // 2. Fallback: first printer of matching type
  if (!printer) {
    const byType = printers.find((p) => p.type === jobType);
    if (byType) {
      printer = byType;
      resolvedVia = `merchant-default:${jobType}`;
    }
  }

  // 3. Fallback: any configured printer
  if (!printer) {
    printer = printers[0];
    resolvedVia = 'merchant-fallback:any';
  }

  if (!printer || !printer.ip_address) {
    throw new Error(`No printer available for job type "${jobType}"`);
  }

  // Dispatch to the underlying print handler
  const job = jobType === 'receipt' ? 'receipt' : 'kitchen';
  const result = job === 'receipt'
    ? await printReceipt(base44, { orderId, printerIp: printer.ip_address, printerPort: printer.port })
    : await printKitchenTicket(base44, { orderId, printerIp: printer.ip_address, printerPort: printer.port });

  // Augment the response with routing context
  try {
    const body = await result.json();
    return Response.json({
      ...body,
      routed_to: printer.name,
      routing_source: resolvedVia,
      job_type: jobType
    });
  } catch {
    return result;
  }
}

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