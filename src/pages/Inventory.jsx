import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  Search,
  TrendingUp,
  DollarSign,
  RefreshCw,
  AlertTriangle // Added AlertTriangle icon
} from 'lucide-react';
// Added Tabs components
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import InventoryForm from '../components/inventory/InventoryForm';
import MobileInventoryCard from '@/components/mobile/MobileInventoryCard';
import RestockDialog from '../components/inventory/RestockDialog';
import PermissionGate from '../components/PermissionGate'; // Added PermissionGate component
import ReorderSuggestions from '../components/inventory/ReorderSuggestions'; // Added ReorderSuggestions component

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showRestock, setShowRestock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [merchant, setMerchant] = useState(null);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [activeTab, setActiveTab] = useState('inventory'); // New state for active tab

  // `loadData` is now wrapped in useCallback and incorporates role-based inventory fetching,
  // while also preserving the loading of alerts and merchant data.
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const currentUser = await base44.auth.me(); // Renamed 'user' to 'currentUser' for consistency with outline

      let inventoryList = [];
      let alertList = [];
      let currentMerchant = null;

      if (currentUser) {
        if (currentUser.role === 'admin') {
          // Admin sees all inventory
          inventoryList = await base44.entities.MerchantInventory.list();

          // If admin also has a merchant_id, they might want to see alerts for that specific merchant.
          if (currentUser.merchant_id) {
            const [alertsForAdminMerchant, merchantForAdmin] = await Promise.all([
              base44.entities.StockAlert.filter({
                merchant_id: currentUser.merchant_id,
                alert_type: 'low_merchant_inventory',
                status: 'active'
              }),
              base44.entities.Merchant.filter({ id: currentUser.merchant_id })
            ]);
            alertList = alertsForAdminMerchant;
            if (merchantForAdmin && merchantForAdmin.length > 0) {
              currentMerchant = merchantForAdmin[0];
            }
          }
        } else if (currentUser.merchant_id) {
          // Regular merchant sees only their own inventory and alerts
          const [inv, al, mer] = await Promise.all([
            base44.entities.MerchantInventory.filter({ merchant_id: currentUser.merchant_id }),
            base44.entities.StockAlert.filter({
              merchant_id: currentUser.merchant_id,
              alert_type: 'low_merchant_inventory',
              status: 'active'
            }),
            base44.entities.Merchant.filter({ id: currentUser.merchant_id })
          ]);
          inventoryList = inv;
          alertList = al;
          if (mer && mer.length > 0) {
            currentMerchant = mer[0];
          }
        }
      }

      setInventory(inventoryList);
      setAlerts(alertList);
      setMerchant(currentMerchant);

      // Filter low stock items from the fetched inventory list
      const lowStock = inventoryList.filter(item => item.quantity <= item.reorder_threshold);
      setLowStockItems(lowStock); // Set the new state for low stock items

    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array as this callback only needs to be created once.

  useEffect(() => {
    loadData();
  }, [loadData]); // Dependency array should include loadData because it's a useCallback-wrapped function.

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete ${item.name}?`)) return;

    try {
      await base44.entities.MerchantInventory.delete(item.id);
      await loadData();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    }
  };

  const handleRestock = (item) => {
    setSelectedItem(item);
    setShowRestock(true);
  };

  const handleRestockComplete = async () => {
    await loadData();
    setShowRestock(false);
    setSelectedItem(null);
  };

  const handleReorder = (item, suggestedQuantity) => {
    const orderQuantity = prompt(
      `How many ${item.unit_of_measure} of ${item.name} would you like to order?`,
      suggestedQuantity.toString()
    );

    if (orderQuantity && parseInt(orderQuantity) > 0) {
      alert(`Reorder request created for ${orderQuantity} ${item.unit_of_measure} of ${item.name}`);
      // In production, this would create a purchase order or send to supplier
    }
  };

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * item.cost_per_unit), 0);
  // Use the new lowStockItems state for the count
  const lowStockCount = lowStockItems.length;

  return (
    <PermissionGate permission="manage_inventory">
      <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Package className="w-8 h-8 text-blue-600" />
                Inventory Management
              </h1>
              <p className="text-gray-500 mt-1">Track stock levels and manage reorders</p>
            </div>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-5 h-5 mr-2" />
              Add Item
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Items</p>
                    <p className="text-3xl font-bold">{inventory.length}</p>
                  </div>
                  <Package className="w-12 h-12 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Inventory Value</p>
                    <p className="text-3xl font-bold">${totalValue.toFixed(0)}</p>
                  </div>
                  <DollarSign className="w-12 h-12 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Low Stock Alerts</p>
                    <p className="text-3xl font-bold text-red-500">{lowStockCount}</p> {/* Using the new lowStockCount */}
                  </div>
                  <AlertCircle className="w-12 h-12 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="inventory" value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="inventory">
                <Package className="w-4 h-4 mr-2" />
                Inventory
              </TabsTrigger>
              <TabsTrigger value="reorder">
                <TrendingUp className="w-4 h-4 mr-2" />
                Reorder
              </TabsTrigger>
              <TabsTrigger value="alerts">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Alerts
              </TabsTrigger>
            </TabsList>

            <TabsContent value="inventory" className="mt-6">
              {/* Mobile card layout */}
              <div className="md:hidden">
                {loading ? (
                  <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 animate-spin text-blue-500" /></div>
                ) : filteredInventory.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No inventory items found</p>
                    <Button onClick={() => setShowForm(true)} className="mt-4"><Plus className="w-4 h-4 mr-2" />Add Item</Button>
                  </div>
                ) : (
                  filteredInventory.map(item => (
                    <MobileInventoryCard
                      key={item.id}
                      item={item}
                      onEdit={(i) => { setSelectedItem(i); setShowForm(true); }}
                      onRestock={handleRestock}
                      onDelete={handleDelete}
                    />
                  ))
                )}
              </div>

              {/* Desktop table */}
              <Card className="hidden md:block">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Inventory Items</CardTitle>
                    <div className="flex gap-2">
                      <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          placeholder="Search inventory..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <Button variant="outline" onClick={loadData}>
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-12">
                      <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-500">Loading inventory...</p>
                    </div>
                  ) : filteredInventory.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500">No inventory items found</p>
                      <Button onClick={() => setShowForm(true)} className="mt-4">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Your First Item
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead>Cost</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredInventory.map(item => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                            <TableCell className="capitalize">{item.category}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span>{item.quantity}</span>
                                {item.quantity <= item.reorder_threshold && (
                                  <Badge variant="destructive" className="text-xs">Low</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{item.unit_of_measure}</TableCell>
                            <TableCell>${item.cost_per_unit?.toFixed(2)}</TableCell>
                            <TableCell>${(item.quantity * item.cost_per_unit).toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  item.status === 'in_stock' ? 'bg-green-100 text-green-800' :
                                  item.status === 'low_stock' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }
                              >
                                {item.status.replace(/_/g, ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setShowForm(true);
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleRestock(item)}
                                >
                                  <TrendingUp className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-red-500"
                                  onClick={() => handleDelete(item)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reorder" className="mt-6">
              <ReorderSuggestions
                inventory={filteredInventory}
                onReorder={handleReorder}
              />
            </TabsContent>

            <TabsContent value="alerts" className="mt-6">
              {/* Low Stock Alerts */}
              {alerts.length > 0 ? (
                <Card className="border-red-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="w-5 h-5" />
                      Low Stock Alerts ({alerts.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {alerts.map(alert => (
                        <div key={alert.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <div>
                            <p className="font-medium">{alert.item_name}</p>
                            <p className="text-sm text-gray-500">
                              Only {alert.current_quantity} left (threshold: {alert.reorder_threshold})
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              const item = inventory.find(i => i.id === alert.inventory_item_id);
                              if (item) handleRestock(item);
                            }}
                          >
                            Restock
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>No active low stock alerts.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Forms */}
        {showForm && (
          <InventoryForm
            item={selectedItem}
            merchantId={merchant?.id}
            onClose={() => {
              setShowForm(false);
              setSelectedItem(null);
            }}
            onSave={loadData}
          />
        )}

        {showRestock && selectedItem && (
          <RestockDialog
            item={selectedItem}
            onClose={() => {
              setShowRestock(false);
              setSelectedItem(null);
            }}
            onComplete={handleRestockComplete}
          />
        )}
      </div>
    </PermissionGate>
  );
}