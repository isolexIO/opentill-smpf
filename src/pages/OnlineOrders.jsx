import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Globe,
  Search,
  Eye,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Store,
  UtensilsCrossed,
  Phone,
  Mail,
  MapPin
} from "lucide-react";
import { format } from "date-fns";

const ORDER_STATUS_CONFIG = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-800", icon: CheckCircle },
  preparing: { label: "Preparing", color: "bg-orange-100 text-orange-800", icon: UtensilsCrossed },
  ready: { label: "Ready", color: "bg-green-100 text-green-800", icon: CheckCircle },
  out_for_delivery: { label: "Out for Delivery", color: "bg-purple-100 text-purple-800", icon: Truck },
  completed: { label: "Completed", color: "bg-green-100 text-green-800", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800", icon: XCircle }
};

const FULFILLMENT_ICONS = {
  pickup: Store,
  delivery: Truck,
  dine_in: UtensilsCrossed
};

export default function OnlineOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fulfillmentFilter, setFulfillmentFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
    // Auto-refresh every 30 seconds for new orders
    const interval = setInterval(loadOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      
      // Get current user's merchant_id
      const pinUserJSON = localStorage.getItem('pinLoggedInUser');
      let currentUser = null;

      if (pinUserJSON) {
        try {
          currentUser = JSON.parse(pinUserJSON);
        } catch (e) {
          console.error('Error parsing user:', e);
        }
      }

      if (!currentUser) {
        currentUser = await base44.auth.me();
      }

      // Filter orders by merchant_id
      if (currentUser?.merchant_id) {
        const orderList = await OnlineOrder.filter({ 
          merchant_id: currentUser.merchant_id 
        }, "-created_date");
        setOrders(orderList);
      } else {
        // Admin/super_admin can see all orders
        const orderList = await OnlineOrder.list("-created_date");
        setOrders(orderList);
      }
    } catch (error) {
      console.error("Error loading online orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await base44.entities.OnlineOrder.update(orderId, { status: newStatus });
      await loadOrders();
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  };

  const filterOrders = () => {
    return orders.filter(order => {
      const matchesSearch = order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           order.customer_phone.includes(searchTerm);
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      const matchesFulfillment = fulfillmentFilter === "all" || order.fulfillment_type === fulfillmentFilter;
      
      return matchesSearch && matchesStatus && matchesFulfillment;
    });
  };

  const getOrderStats = () => {
    const today = new Date().toDateString();
    const todayOrders = orders.filter(order => 
      new Date(order.created_date).toDateString() === today
    );
    
    return {
      totalOrders: orders.length,
      todayOrders: todayOrders.length,
      pendingOrders: orders.filter(o => o.status === "pending").length,
      readyOrders: orders.filter(o => o.status === "ready").length,
      todayRevenue: todayOrders
        .filter(o => o.status === "completed")
        .reduce((sum, o) => sum + o.total, 0)
        .toFixed(2)
    };
  };

  const getStatusActions = (order) => {
    const statusFlow = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["preparing", "cancelled"],
      preparing: ["ready", "cancelled"],
      ready: order.fulfillment_type === "delivery" ? ["out_for_delivery"] : ["completed"],
      out_for_delivery: ["completed"],
      completed: [],
      cancelled: []
    };

    return statusFlow[order.status] || [];
  };

  const filteredOrders = filterOrders();
  const stats = getOrderStats();

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Globe className="w-8 h-8 text-green-600" />
              Online Orders
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Manage customer orders from your online menu
            </p>
          </div>
          
          <Button onClick={loadOrders} className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh Orders
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">All Orders</p>
                  <p className="text-2xl font-bold">{stats.totalOrders}</p>
                </div>
                <Globe className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Today</p>
                  <p className="text-2xl font-bold">{stats.todayOrders}</p>
                </div>
                <Clock className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Pending</p>
                  <p className="text-2xl font-bold">{stats.pendingOrders}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Ready</p>
                  <p className="text-2xl font-bold">{stats.readyOrders}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Today Revenue</p>
                  <p className="text-2xl font-bold">${stats.todayRevenue}</p>
                </div>
                <Truck className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4 justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by order number, customer name, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(ORDER_STATUS_CONFIG).map(([status, config]) => (
                  <SelectItem key={status} value={status}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={fulfillmentFilter} onValueChange={setFulfillmentFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="pickup">Pickup</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
                <SelectItem value="dine_in">Dine In</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Orders ({filteredOrders.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                        Loading orders...
                      </TableCell>
                    </TableRow>
                  ) : filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        No orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => {
                      const statusConfig = ORDER_STATUS_CONFIG[order.status];
                      const StatusIcon = statusConfig?.icon || Clock;
                      const FulfillmentIcon = FULFILLMENT_ICONS[order.fulfillment_type] || Store;
                      
                      return (
                        <TableRow key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <TableCell className="font-mono text-sm">
                            {order.order_number}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{order.customer_name}</div>
                              <div className="text-sm text-gray-500 flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {order.customer_phone}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FulfillmentIcon className="w-4 h-4 text-gray-500" />
                              <span className="capitalize">{order.fulfillment_type.replace('_', ' ')}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {order.items.length} items
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            ${order.total.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusConfig?.color || "bg-gray-100 text-gray-800"}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusConfig?.label || order.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(order.created_date), "MMM d, HH:mm")}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedOrder(order)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {getStatusActions(order).map(action => (
                                <Button
                                  key={action}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateOrderStatus(order.id, action)}
                                  className="text-xs capitalize"
                                >
                                  {ORDER_STATUS_CONFIG[action]?.label || action}
                                </Button>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Order Details Modal */}
        {selectedOrder && (
          <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Online Order - {selectedOrder.order_number}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Order Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Order Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Order #:</span>
                        <span className="font-mono">{selectedOrder.order_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Date:</span>
                        <span>{format(new Date(selectedOrder.created_date), "PPP p")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Type:</span>
                        <div className="flex items-center gap-1">
                          {React.createElement(FULFILLMENT_ICONS[selectedOrder.fulfillment_type], { className: "w-4 h-4" })}
                          <span className="capitalize">{selectedOrder.fulfillment_type.replace('_', ' ')}</span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Status:</span>
                        <Badge className={ORDER_STATUS_CONFIG[selectedOrder.status]?.color}>
                          {ORDER_STATUS_CONFIG[selectedOrder.status]?.label}
                        </Badge>
                      </div>
                      {selectedOrder.requested_time && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Requested Time:</span>
                          <span>{format(new Date(selectedOrder.requested_time), "PPP p")}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Customer Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Name:</span>
                        <span>{selectedOrder.customer_name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Phone:</span>
                        <div className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          <span>{selectedOrder.customer_phone}</span>
                        </div>
                      </div>
                      {selectedOrder.customer_email && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Email:</span>
                          <div className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            <span>{selectedOrder.customer_email}</span>
                          </div>
                        </div>
                      )}
                      {selectedOrder.delivery_address && (
                        <div className="space-y-1">
                          <span className="text-gray-500 flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            Delivery Address:
                          </span>
                          <p className="text-sm bg-gray-50 p-2 rounded">
                            {selectedOrder.delivery_address}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Order Items */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Order Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedOrder.items.map((item, index) => (
                        <div key={index} className="flex justify-between items-start p-3 border rounded">
                          <div className="flex-1">
                            <div className="font-medium">{item.product_name}</div>
                            <div className="text-sm text-gray-500">
                              ${item.unit_price.toFixed(2)} × {item.quantity}
                            </div>
                            {item.modifiers && item.modifiers.length > 0 && (
                              <div className="mt-1">
                                {item.modifiers.map((mod, modIndex) => (
                                  <div key={modIndex} className="text-xs text-gray-600">
                                    • {mod.name} (+${mod.price.toFixed(2)})
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="font-medium">
                            ${item.item_total.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Special Instructions */}
                {selectedOrder.special_instructions && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Special Instructions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 bg-yellow-50 p-3 rounded">
                        {selectedOrder.special_instructions}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Order Summary */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>${selectedOrder.subtotal.toFixed(2)}</span>
                      </div>
                      {selectedOrder.delivery_fee > 0 && (
                        <div className="flex justify-between">
                          <span>Delivery Fee:</span>
                          <span>${selectedOrder.delivery_fee.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Tax:</span>
                        <span>${selectedOrder.tax_amount.toFixed(2)}</span>
                      </div>
                      {selectedOrder.tip_amount > 0 && (
                        <div className="flex justify-between">
                          <span>Tip:</span>
                          <span>${selectedOrder.tip_amount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="border-t pt-2 flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span>${selectedOrder.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Status Update Actions */}
                {getStatusActions(selectedOrder).length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Update Order Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2 flex-wrap">
                        {getStatusActions(selectedOrder).map(action => (
                          <Button
                            key={action}
                            onClick={() => {
                              updateOrderStatus(selectedOrder.id, action);
                              setSelectedOrder(null);
                            }}
                            className="capitalize"
                          >
                            Mark as {ORDER_STATUS_CONFIG[action]?.label || action}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}