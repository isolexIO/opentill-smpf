import { useState, useEffect, useCallback } from "react";
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
  ShoppingCart,
  Search,
  Filter,
  Eye,
  Receipt,
  RefreshCw,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar
} from "lucide-react";
import MobileOrderCard from '@/components/mobile/MobileOrderCard';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

const ORDER_STATUS_CONFIG = {
  preview: { label: "Preview", color: "bg-gray-100 text-gray-800", icon: Clock },
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  processing: { label: "Processing", color: "bg-blue-100 text-blue-800", icon: RefreshCw },
  completed: { label: "Completed", color: "bg-green-100 text-green-800", icon: CheckCircle },
  refunded: { label: "Refunded", color: "bg-red-100 text-red-800", icon: AlertCircle },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-800", icon: AlertCircle },
  payment_selection: { label: "Payment Selection", color: "bg-purple-100 text-purple-800", icon: Clock },
  tip_selection: { label: "Tip Selection", color: "bg-purple-100 text-purple-800", icon: Clock }
};

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]); 
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all"); // New state for payment filter
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined }); // New state for date range
  const [dateRangePreset, setDateRangePreset] = useState("all"); // To control the date range select value
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setSelectedOrder(null); // Clear selected order when reloading

      let currentUser;
      const pinUserJSON = localStorage.getItem('pinLoggedInUser');
      if (pinUserJSON) {
        currentUser = JSON.parse(pinUserJSON);
      } else {
        currentUser = await base44.auth.me();
      }
      
      let orderList;
      if (currentUser.role === 'admin' && !currentUser.is_impersonating) {
        orderList = await base44.entities.Order.list('-created_date');
      } else if (currentUser.merchant_id) {
        orderList = await base44.entities.Order.filter(
          { merchant_id: currentUser.merchant_id },
          '-created_date'
        );
      } else {
        orderList = [];
      }
      
      setOrders(orderList);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  }, []); // Dependencies are empty as it's meant to fetch all initial data and not react to filters.

  useEffect(() => {
    loadOrders();
    loadCustomers(); 
  }, [loadOrders]);

  const loadCustomers = async () => {
    try {
      const customerList = await base44.entities.Customer.list();
      setCustomers(customerList);
    } catch (error) {
      console.error("Error loading customers:", error);
    }
  };

  // getCustomerName is not used in the new layout, but kept for completeness
  const getCustomerName = (customerId) => {
    if (!customerId) return "Walk-in Customer";
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || "Unknown Customer";
  };

  const getStatusConfig = (status) => {
    return ORDER_STATUS_CONFIG[status] || {
      label: status ? status.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : "Unknown",
      color: "bg-gray-100 text-gray-800",
      icon: AlertCircle
    };
  };

  // Updated filterOrders function to incorporate new filters and null/undefined checks
  const filterOrders = useCallback(() => {
    let filtered = orders || []; // Ensure orders is an array

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(order =>
        (order.order_number?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (order.customer_name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Payment method filter
    if (paymentFilter !== "all") {
      filtered = filtered.filter(order => order.payment_method === paymentFilter);
    }

    // Date range filter
    if (dateRange.from) {
      filtered = filtered.filter(order => {
        const created = new Date(order.created_date || 0); // Use || 0 for safety if created_date is missing or invalid
        if (isNaN(created.getTime())) return false; // Skip if date is invalid

        let endDate = dateRange.to;
        if (endDate) {
          // Set endDate to the end of the day to include all orders on that day
          endDate = endOfDay(new Date(endDate));
        }

        return created >= dateRange.from && (!endDate || created <= endDate);
      });
    }

    return filtered;
  }, [orders, searchTerm, statusFilter, paymentFilter, dateRange]); // Added new filter states to dependencies

  const getOrderStats = () => {
    const currentFilteredOrders = filterOrders(); // Use the updated filterOrders
    const totalRevenue = currentFilteredOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const averageOrder = currentFilteredOrders.length > 0 ? totalRevenue / currentFilteredOrders.length : 0;
    
    return {
      totalOrders: currentFilteredOrders.length,
      totalRevenue: totalRevenue.toFixed(2),
      averageOrder: averageOrder.toFixed(2),
      completedOrders: currentFilteredOrders.filter(o => o.status === "completed").length
    };
  };

  const handleDateRangePresetChange = (value) => {
    setDateRangePreset(value);
    const today = new Date();
    let from, to;

    switch (value) {
      case "today":
        from = startOfDay(today);
        to = endOfDay(today);
        break;
      case "week":
        from = startOfWeek(today, { weekStartsOn: 1 }); // Monday as first day of week
        to = endOfWeek(today, { weekStartsOn: 1 });
        break;
      case "month":
        from = startOfMonth(today);
        to = endOfMonth(today);
        break;
      case "all":
      default:
        from = undefined;
        to = undefined;
        break;
    }
    setDateRange({ from, to });
  };


  const filteredOrders = filterOrders();
  const stats = getOrderStats();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 md:p-6 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Orders</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage and track all orders</p>
            </div>
          </div>
          <Button onClick={loadOrders} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Orders</p>
                  <p className="text-2xl font-bold">{stats.totalOrders}</p>
                </div>
                <ShoppingCart className="w-8 h-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Revenue</p>
                  <p className="text-2xl font-bold">${stats.totalRevenue}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Average Order</p>
                  <p className="text-2xl font-bold">${stats.averageOrder}</p>
                </div>
                <Receipt className="w-8 h-8 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Completed</p>
                  <p className="text-2xl font-bold">{stats.completedOrders}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden p-4 space-y-1">
        {loading ? (
          <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 animate-spin text-blue-500" /></div>
        ) : filteredOrders.length === 0 ? (
          <p className="text-center text-gray-500 py-12">No orders found</p>
        ) : (
          filteredOrders.map(order => (
            <MobileOrderCard
              key={order.id}
              order={order}
              isSelected={selectedOrder?.id === order.id}
              onClick={() => setSelectedOrder(order === selectedOrder ? null : order)}
            />
          ))
        )}
      </div>

      {/* Desktop Two Column Layout */}
      <div className="hidden md:flex flex-1 overflow-hidden"> 
        {/* Left Panel - Order Details */}
        <div className="w-96 min-w-96 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto custom-scrollbar shadow-lg">
          {selectedOrder ? (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Order Details</h2>
                <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(null)}>
                  <Eye className="w-4 h-4 mr-2" />
                  Close
                </Button>
              </div>

              <div className="space-y-6">
                {/* Order Header */}
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-500">Order Number</p>
                        <p className="text-lg font-mono font-bold">{selectedOrder.order_number}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <Badge className={`${getStatusConfig(selectedOrder.status).color} mt-1`}>
                          {(() => {
                            const StatusIcon = getStatusConfig(selectedOrder.status).icon;
                            return <StatusIcon className="w-3 h-3 mr-1" />;
                          })()}
                          {getStatusConfig(selectedOrder.status).label}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Date & Time</p>
                        <p className="font-medium">
                          {selectedOrder.created_date ? format(new Date(selectedOrder.created_date), "MMM d, yyyy 'at' HH:mm") : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Customer Info */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Customer Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="font-medium">{selectedOrder.customer_name || "Walk-in Customer"}</p>
                    </div>
                    {selectedOrder.table_number && (
                      <div>
                        <p className="text-sm text-gray-500">Table Number</p>
                        <Badge variant="outline">Table {selectedOrder.table_number}</Badge>
                      </div>
                    )}
                    {selectedOrder.station_name && (
                      <div>
                        <p className="text-sm text-gray-500">Station</p>
                        <p className="font-medium">{selectedOrder.station_name}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Order Items */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Order Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedOrder.items?.map((item, index) => (
                        <div key={index} className="flex justify-between items-start pb-3 border-b last:border-0 last:pb-0">
                          <div className="flex-1">
                            <div className="font-medium">{item.product_name}</div>
                            <div className="text-sm text-gray-500">Qty: {item.quantity}</div>
                            {item.modifiers && item.modifiers.length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {item.modifiers.map((mod, modIndex) => (
                                  <div key={modIndex} className="text-xs text-gray-500">
                                    • {mod.name}
                                    {mod.price > 0 && <span> (+${mod.price.toFixed(2)})</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="font-medium">${(item.item_total || 0).toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Summary */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Payment Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>${(selectedOrder.subtotal || 0).toFixed(2)}</span>
                      </div>
                      {(selectedOrder.discount_amount || 0) > 0 && (
                        <div className="flex justify-between text-sm text-red-600">
                          <span>Discount:</span>
                          <span>-${(selectedOrder.discount_amount || 0).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span>Tax:</span>
                        <span>${(selectedOrder.tax_amount || 0).toFixed(2)}</span>
                      </div>
                      {(selectedOrder.tip_amount || 0) > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Tip:</span>
                          <span>${(selectedOrder.tip_amount || 0).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="border-t pt-2">
                        <div className="flex justify-between font-bold text-lg">
                          <span>Total:</span>
                          <span>${(selectedOrder.total || 0).toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Payment Method:</span>
                          <Badge variant="outline" className="capitalize">
                            {(selectedOrder.payment_method || 'pending').replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                      {selectedOrder.payment_details?.change_due > 0 && (
                        <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Change Due:</span>
                            <span className="text-lg font-bold">${selectedOrder.payment_details.change_due.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Kitchen Status */}
                {selectedOrder.sent_to_kitchen && (
                  <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">Sent to Kitchen</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 p-8 text-center">
              <div>
                <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Select an order from the list to view its details here.</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Orders List */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto custom-scrollbar">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1 relative w-full">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search by order number or customer..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-40">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {/* Dynamically list all statuses from config */}
                    {Object.keys(ORDER_STATUS_CONFIG).map((statusKey) => (
                      <SelectItem key={statusKey} value={statusKey}>
                        {ORDER_STATUS_CONFIG[statusKey].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* New Payment Filter */}
                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger className="w-full md:w-40">
                    <Receipt className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Payment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payments</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="debit_card">Debit Card</SelectItem>
                    <SelectItem value="online">Online Payment</SelectItem>
                    {/* Add other specific payment methods here */}
                  </SelectContent>
                </Select>

                {/* Updated Date Range Filter (replaces old dateFilter) */}
                <Select value={dateRangePreset} onValueChange={handleDateRangePresetChange}>
                  <SelectTrigger className="w-full md:w-40">
                    <Calendar className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="flex items-center justify-center">
                            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                            Loading orders...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          No orders found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOrders.map((order) => {
                        const statusConfig = getStatusConfig(order.status);
                        const StatusIcon = statusConfig.icon;
                        const isSelected = selectedOrder?.id === order.id;
                        
                        return (
                          <TableRow 
                            key={order.id} 
                            className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                              isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                            }`}
                            onClick={() => setSelectedOrder(order)}
                          >
                            <TableCell className="font-mono text-sm">
                              {order.order_number}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{order.customer_name || "Walk-in Customer"}</div>
                                {order.table_number && (
                                  <div className="text-sm text-gray-500">Table {order.table_number}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {order.items?.length || 0} items
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              ${(order.total || 0).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Badge className={statusConfig.color}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {statusConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {(order.payment_method || 'pending').replace(/_/g, ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {/* Ensure order.created_date is valid before formatting */}
                              {order.created_date ? format(new Date(order.created_date), "MMM d, HH:mm") : 'N/A'}
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
        </div>
      </div>
    </div>
  );
}