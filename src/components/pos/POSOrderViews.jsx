import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Globe, CreditCard, CheckCircle } from 'lucide-react';

/**
 * Presentational views for the POS "Online Orders" and "Open Tickets" modes.
 * Extracted from POS.jsx to keep the main POS component focused on the
 * register flow. All behaviour is delegated via callbacks.
 */

export function OnlineOrdersView({ isDemo, orders, onAccept, onReject, onBack }) {
  if (isDemo) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 md:p-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Globe className="w-6 h-6 text-green-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pending Online Orders (Demo)</h1>
              <Badge variant="outline">0 orders</Badge>
            </div>
            <Button onClick={onBack} variant="outline">Back to POS</Button>
          </div>
        </div>
        <div className="text-center py-12">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <p className="text-xl text-gray-500">No pending online orders in Demo Mode.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 md:p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Globe className="w-6 h-6 text-green-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pending Online Orders</h1>
            <Badge variant="outline">{orders.length} orders</Badge>
          </div>
          <Button onClick={onBack} variant="outline">Back to POS</Button>
        </div>
      </div>

      <div className="p-4 md:p-6">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-xl text-gray-500">No pending online orders</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.map((order) => (
              <Card key={order.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold">{order.order_number}</h3>
                    <p className="text-sm text-gray-600 mt-1">{order.customer_name}</p>
                    <p className="text-sm text-gray-500">{order.customer_phone}</p>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800">{order.fulfillment_type}</Badge>
                </div>

                {order.delivery_address && (
                  <div className="mb-3 p-2 bg-gray-50 rounded text-sm">
                    <p className="font-medium">Delivery Address:</p>
                    <p className="text-gray-600">{order.delivery_address}</p>
                  </div>
                )}

                {order.requested_time && (
                  <div className="mb-3 text-sm">
                    <p className="font-medium">Requested Time:</p>
                    <p className="text-gray-600">{new Date(order.requested_time).toLocaleString()}</p>
                  </div>
                )}

                <div className="space-y-2 mb-4">
                  {(order.items || []).map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.product_name}</span>
                      <span>${item.item_total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {order.special_instructions && (
                  <div className="mb-4 p-2 bg-yellow-50 rounded text-sm">
                    <p className="font-medium">Special Instructions:</p>
                    <p className="text-gray-700">{order.special_instructions}</p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <div className="flex justify-between font-bold text-lg mb-4">
                    <span>Total:</span>
                    <span>${order.total.toFixed(2)}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      onClick={() => {
                        const reason = prompt('Reason for rejection (optional):');
                        if (reason !== null) onReject(order, reason);
                      }}
                      className="flex-1"
                    >
                      Reject
                    </Button>
                    <Button onClick={() => onAccept(order)} className="flex-1 bg-green-600 hover:bg-green-700">
                      Accept Order
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function OpenTicketsView({ isDemo, tickets, onProcessPayment, onBack }) {
  if (isDemo) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 md:p-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CreditCard className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Open Tickets (Demo)</h1>
              <Badge variant="outline">0 tickets</Badge>
            </div>
            <Button onClick={onBack} variant="outline">Back to POS</Button>
          </div>
        </div>
        <div className="text-center py-12">
          <p className="text-xl text-gray-500">No open tickets in Demo Mode.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 md:p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CreditCard className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Open Tickets</h1>
            <Badge variant="outline">{tickets.length} tickets</Badge>
          </div>
          <Button onClick={onBack} variant="outline">Back to POS</Button>
        </div>
      </div>

      <div className="p-4 md:p-6">
        {tickets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl text-gray-500">No open tickets</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tickets.map((ticket) => (
              <Card key={ticket.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold">{ticket.table_number ? `Table ${ticket.table_number}` : 'No Table'}</h3>
                    <p className="text-sm text-gray-500">{ticket.order_number}</p>
                    <p className="text-sm text-gray-600 mt-1">{ticket.customer_name}</p>
                  </div>
                  <Badge className={ticket.status === 'processing' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}>
                    {ticket.status}
                  </Badge>
                </div>

                <div className="space-y-2 mb-4">
                  {(ticket.items || []).map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.product_name}</span>
                      <span>${(item.item_total || 0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between font-bold text-lg mb-4">
                    <span>Total:</span>
                    <span>${(ticket.total || 0).toFixed(2)}</span>
                  </div>
                  <Button onClick={() => onProcessPayment(ticket)} className="w-full">Process Payment</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}