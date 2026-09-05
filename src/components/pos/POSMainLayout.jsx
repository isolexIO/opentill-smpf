import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import Cart from "./Cart";
import DepartmentGrid from "./DepartmentGrid";
import ProductGrid from "./ProductGrid";

export default function POSMainLayout({
  isMobile,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  discountPercent,
  onDiscountChange,
  totals,
  onCheckout,
  onSendToKitchen,
  selectedCustomer,
  settings,
  searchTerm,
  onSearchChange,
  posProductView,
  departments,
  onSelectDepartment,
  filteredProducts,
  onAddToCart,
  posMode,
}) {
  const cartProps = {
    cart,
    onUpdateQuantity,
    onRemoveItem,
    discountPercent,
    onDiscountChange,
    totals,
    onCheckout,
    onSendToKitchen,
    selectedCustomer,
    isMobile,
    settings,
  };

  return isMobile ? (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 max-h-[50vh] overflow-auto">
        <Cart {...cartProps} />
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {posProductView === 'departments' ? (
          <DepartmentGrid departments={departments} onSelectDepartment={onSelectDepartment} />
        ) : (
          <ProductGrid
            products={filteredProducts}
            onAddToCart={onAddToCart}
            onProductClick={onAddToCart}
            posMode={posMode}
            isMobile={isMobile}
            showImages={false}
          />
        )}
      </div>
    </div>
  ) : (
    <div className="flex h-[calc(100vh-64px)]">
      <div className="w-96 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <Cart {...cartProps} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto p-4">
          {posProductView === 'departments' ? (
            <DepartmentGrid departments={departments} onSelectDepartment={onSelectDepartment} />
          ) : (
            <ProductGrid
              products={filteredProducts}
              onAddToCart={onAddToCart}
              onProductClick={onAddToCart}
              posMode={posMode}
              isMobile={isMobile}
              showImages={false}
            />
          )}
        </div>
      </div>
    </div>
  );
}