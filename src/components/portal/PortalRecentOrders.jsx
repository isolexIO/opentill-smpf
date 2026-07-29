import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ShoppingCart, Loader2, Search, ChevronDown, ChevronUp } from 'lucide-react';

const STATUS_COLORS = {
  completed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  refunded: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-200 text-gray-500',
};

const PAYMENT_LABELS = {
  cash: 'Cash',
  card: 'Card',
  ebt: 'EBT',
  solana_pay: 'Solana',
  opentill: 'openTILL',
  split: 'Split',
  pending: 'Pending',
};

export default function PortalRecentOrders({ merchantId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (!merchantId) return;
    (async () => {
      try {
        const list = await base44.entities.Order.filter(
          { merchant_id: merchantId },
          '-created_date',
          20
        );
        setOrders(list || []);
      } catch (e) {
        console.error('PortalRecentOrders load error', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [merchantId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.toLowerCase();
    return orders.filter(
      (o) =>
        o.order_number?.toLowerCase().includes(q) ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.station_name?.toLowerCase().includes(q)
    );
  }, [orders, search]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-green-600" /> Past Orders
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
          <>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search orders, customers, stations…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {filtered.map((o) => {
                const isExpanded = expandedId === o.id;
                return (
                  <div key={o.id} className="border-b last:border-0">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : o.id)}
                      className="w-full flex items-center justify-between text-sm py-2 hover:bg-gray-50 -mx-2 px-2 rounded transition-colors"
                    >
                      <div className="text-left min-w-0">
                        <div className="font-medium truncate">
                          {o.order_number || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(o.created_date).toLocaleDateString()}
                          {o.station_name && ` · ${o.station_name}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-medium">${(o.total || 0).toFixed(2)}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="pb-3 space-y-2 bg-gray-50 rounded-lg p-3 mb-2">
                        <div className="flex flex-wrap gap-2">
                          <Badge className={STATUS_COLORS[o.status] || 'bg-gray-100'}>
                            {o.status}
                          </Badge>
                          {o.payment_method && (
                            <Badge variant="outline">
                              {PAYMENT_LABELS[o.payment_method] || o.payment_method}
                            </Badge>
                          )}
                          {o.customer_name && (
                            <Badge variant="outline">{o.customer_name}</Badge>
                          )}
                        </div>
                        {o.items && o.items.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-500">
                              {o.items.length} item{o.items.length > 1 ? 's' : ''}
                            </p>
                            {o.items.slice(0, 5).map((item, idx) => (
                              <div
                                key={idx}
                                className="flex justify-between text-xs text-gray-600"
                              >
                                <span className="truncate">
                                  {item.quantity}× {item.product_name || 'Item'}
                                </span>
                                <span>${(item.item_total || 0).toFixed(2)}</span>
                              </div>
                            ))}
                            {o.items.length > 5 && (
                              <p className="text-xs text-gray-400">
                                +{o.items.length - 5} more
                              </p>
                            )}
                          </div>
                        )}
                        <div className="flex justify-between text-xs font-medium pt-1 border-t">
                          <span>Subtotal</span>
                          <span>${(o.subtotal || 0).toFixed(2)}</span>
                        </div>
                        {o.tax_amount > 0 && (
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Tax</span>
                            <span>${(o.tax_amount || 0).toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-bold">
                          <span>Total</span>
                          <span>${(o.total || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No matching orders.</p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}