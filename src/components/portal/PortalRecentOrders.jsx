import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ShoppingCart, Loader2 } from 'lucide-react';

const STATUS_COLORS = {
  completed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  refunded: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-200 text-gray-500',
};

export default function PortalRecentOrders({ merchantId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!merchantId) return;
    (async () => {
      try {
        const list = await base44.entities.Order.filter(
          { merchant_id: merchantId },
          '-created_date',
          5
        );
        setOrders(list || []);
      } catch (e) {
        console.error('PortalRecentOrders load error', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [merchantId]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-green-600" /> Recent Orders
          </span>
          <Link to={createPageUrl('Orders')}>
            <Button variant="ghost" size="sm">View All</Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : orders.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No orders yet.</p>
        ) : (
          <div className="space-y-2">
            {orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between text-sm border-b pb-2">
                <div>
                  <div className="font-medium">{o.order_number}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(o.created_date).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">${(o.total || 0).toFixed(2)}</span>
                  <Badge className={STATUS_COLORS[o.status] || 'bg-gray-100'}>
                    {o.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}