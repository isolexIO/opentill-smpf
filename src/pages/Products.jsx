import { useState, useEffect, useCallback } from "react";
import { posBase44 as base44 } from "@/lib/posClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  DollarSign,
  Archive,
  LayoutGrid,
  List
} from "lucide-react";

import ProductForm from "../components/products/ProductForm";
import ProductGrid from "../components/products/ProductGrid";
import InventoryManager from "../components/products/InventoryManager";
import PermissionGate from '../components/PermissionGate';
import { useActiveLocation } from "@/hooks/useActiveLocation";
import LocationSwitcher from "@/components/locations/LocationSwitcher";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all"); // Renamed from categoryFilter
  const [selectedDepartment, setSelectedDepartment] = useState("all"); // New state variable for department
  const [activeTab, setActiveTab] = useState("grid");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const { locations, activeLocationId, activeLocation, switchLocation, isMultiLocation } = useActiveLocation(currentUser?.merchant_id);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      
      let currentUserData;
      const pinUserJSON = localStorage.getItem('pinLoggedInUser');
      if (pinUserJSON) {
        currentUserData = JSON.parse(pinUserJSON);
      } else {
        currentUserData = await base44.auth.me();
      }
      setCurrentUser(currentUserData);
      
      let productList;
      if (currentUserData.role === 'admin' && !currentUserData.is_impersonating) {
        productList = await base44.entities.Product.list();
      } else if (currentUserData.merchant_id) {
        productList = await base44.entities.Product.filter({ merchant_id: currentUserData.merchant_id });
      } else {
        productList = [];
      }
      
      setProducts(productList);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleSaveProduct = async (productData) => {
    try {
      if (!currentUser?.merchant_id) {
        alert('No merchant ID found. Please log in again.');
        return;
      }

      const dataToSave = {
        ...productData,
        merchant_id: currentUser.merchant_id,
        location_id: isMultiLocation && activeLocation?.catalog_mode === 'standalone'
          ? activeLocationId
          : (productData.location_id || null)
      };

      if (selectedProduct) {
        await base44.entities.Product.update(selectedProduct.id, dataToSave);
      } else {
        await base44.entities.Product.create(dataToSave);
      }
      await loadProducts();
      setShowForm(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error("Error saving product:", error);
      alert("Error saving product. Please try again.");
    }
  };
  
  const handleToggleActive = async (product) => {
    try {
      if (!product?.merchant_id) {
        console.error('Product missing merchant_id:', product);
        alert('Cannot update product: missing merchant ID');
        return;
      }

      const updateData = {
        merchant_id: product.merchant_id,
        name: product.name,
        price: product.price,
        is_active: !product.is_active,
      };

      await base44.entities.Product.update(product.id, updateData);
      await loadProducts();
    } catch(error) {
      console.error("Error updating product status:", error);
      alert("Error updating product status. Please try again.");
    }
  };

  const handleUpdateStock = async (stockUpdates) => {
    try {
      const updates = Object.entries(stockUpdates).map(async ([productId, quantity]) => {
        const product = products.find(p => p.id === productId);
        
        if (!product) {
          console.warn(`Product with ID ${productId} not found for stock update.`);
          throw new Error(`Product with ID ${productId} not found.`);
        }

        if (!product?.merchant_id) {
          console.error('Product missing merchant_id:', product);
          throw new Error(`Product with ID ${productId} missing merchant ID.`);
        }

        return await base44.entities.Product.update(productId, { 
          merchant_id: product.merchant_id,
          name: product.name,
          price: product.price,
          stock_quantity: quantity,
        });
      });
      await Promise.all(updates);
      await loadProducts();
    } catch (error) {
      console.error("Error updating stock:", error);
      alert("Error updating stock. Please try again.");
    }
  };

  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    setShowForm(true);
  };
  
  const handleAddNew = () => {
    setSelectedProduct(null);
    setShowForm(true);
  };

  const filterProducts = () => {
    return (products || []).filter(product => {
      const matchesSearch = (product?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (product?.sku || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product?.category === selectedCategory;
      const matchesDepartment = selectedDepartment === 'all' || product?.department === selectedDepartment;
      const matchesLocation = !isMultiLocation || !activeLocation
        ? true
        : activeLocation.catalog_mode === 'standalone'
          ? product?.location_id === activeLocationId
          : !product?.location_id || product?.location_id === activeLocationId;
      return matchesSearch && matchesCategory && matchesDepartment && matchesLocation;
    });
  };

  const getProductStats = () => {
    const safeProducts = products || []; // Ensure products is an array
    const activeProducts = safeProducts.filter(p => p?.is_active); // Added optional chaining
    const lowStockProducts = safeProducts.filter(p => p?.is_active && (p?.stock_quantity || 0) <= (p?.low_stock_alert || 0)); // Added optional chaining and || 0
    const totalValue = safeProducts.reduce((sum, p) => sum + ((p?.price || 0) * (p?.stock_quantity || 0)), 0); // Added optional chaining and || 0
    
    return {
      totalProducts: safeProducts.length,
      activeProducts: activeProducts.length,
      lowStockCount: lowStockProducts.length,
      totalInventoryValue: totalValue.toFixed(2)
    };
  };

  const categories = ['all', ...new Set((products || []).map(p => p?.category).filter(Boolean))];
  const departments = ['all', ...new Set((products || []).map(p => p?.department).filter(Boolean))];

  const filteredProducts = filterProducts();
  const stats = getProductStats();

  return (
    <PermissionGate permission="manage_inventory">
      <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Package className="w-8 h-8 text-purple-600" />
              Product Management
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Manage your inventory and product catalog
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {isMultiLocation && (
              <LocationSwitcher
                locations={locations}
                activeLocationId={activeLocationId}
                onSwitch={switchLocation}
              />
            )}
            <Button onClick={handleAddNew} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Active Products</p>
                  <p className="text-2xl font-bold">{stats.activeProducts}</p>
                </div>
                <Package className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Low Stock</p>
                  <p className="text-2xl font-bold">{stats.lowStockCount}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Archived</p>
                  <p className="text-2xl font-bold">{stats.totalProducts - stats.activeProducts}</p>
                </div>
                <Archive className="w-8 h-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Inventory Value</p>
                  <p className="text-2xl font-bold">${stats.totalInventoryValue}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and View Switcher */}
        <Tabs defaultValue="grid" value={activeTab} onValueChange={setActiveTab}>
          <Card className="mb-6">
            <CardContent className="p-4 flex flex-col md:flex-row gap-4 justify-between">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search products by name or SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {/* Category Filter */}
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat === "all" ? "All Categories" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Department Filter - New */}
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept === "all" ? "All Departments" : dept.charAt(0).toUpperCase() + dept.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <TabsList>
                <TabsTrigger value="grid"><LayoutGrid className="w-4 h-4 mr-2" />Grid View</TabsTrigger>
                <TabsTrigger value="inventory"><List className="w-4 h-4 mr-2" />Inventory</TabsTrigger>
              </TabsList>
            </CardContent>
          </Card>

          {/* Main Content */}
          <TabsContent value="grid" className="mt-0">
            <ProductGrid products={filteredProducts} onEdit={handleEditProduct} onToggleActive={handleToggleActive} />
          </TabsContent>
          <TabsContent value="inventory" className="mt-0">
            <InventoryManager products={filteredProducts} onUpdateStock={handleUpdateStock} />
          </TabsContent>
        </Tabs>

        {/* Add/Edit Product Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedProduct ? "Edit Product" : "Add New Product"}
              </DialogTitle>
            </DialogHeader>
            <ProductForm
              product={selectedProduct}
              onSave={handleSaveProduct}
              onCancel={() => { setShowForm(false); setSelectedProduct(null); }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGate>
  );
}