import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Heart, Scale } from 'lucide-react';
import ModifierDialog from '../online-menu/ModifierDialog';
import WeightEntryDialog from './WeightEntryDialog';

export default function ProductGrid({ 
  products = [], 
  onAddToCart, 
  posMode, 
  isMobile, 
  showImages = false,
  onToggleFavorite = null,
  isFavorite = null
}) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [weightProduct, setWeightProduct] = useState(null);

  const handleProductClick = (product) => {
    console.log('ProductGrid: Product clicked:', product.name);
    if (product.pricing_type === 'weight') {
      setWeightProduct(product);
    } else if (product.modifiers && product.modifiers.length > 0) {
      setSelectedProduct(product);
    } else {
      onAddToCart(product, []);
    }
  };

  const handleWeightConfirm = (weight) => {
    const product = { ...weightProduct };
    const unit = product.weight_unit || 'lb';
    product._weight = weight;
    product._weight_unit = unit;
    product._calculated_price = weight * (product.price || 0);
    onAddToCart(product, []);
    setWeightProduct(null);
  };

  const handleModifiersConfirm = (product, selectedModifiers) => {
    console.log('ProductGrid: Adding product with modifiers:', product.name, selectedModifiers);
    onAddToCart(product, selectedModifiers);
    setSelectedProduct(null);
  };

  if (!products || products.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No products available
      </div>
    );
  }

  console.log('ProductGrid: Rendering', products.length, 'products');

  return (
    <>
      <div className={`grid gap-3 ${
        isMobile 
          ? 'grid-cols-2' 
          : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
      }`}>
        {(products || []).map((product) => (
          <Card 
            key={product.id} 
            className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
            onClick={() => handleProductClick(product)}
          >
            {showImages && product.image_url && (
              <div className="aspect-video bg-gray-200 relative">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                {onToggleFavorite && isFavorite && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 bg-white/70 hover:bg-white rounded-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(product.id);
                    }}
                  >
                    <Heart 
                      className={`w-5 h-5 transition-all ${
                        isFavorite(product.id) ? 'text-red-500 fill-red-500' : 'text-gray-600'
                      }`} 
                    />
                  </Button>
                )}
              </div>
            )}
            <CardContent className="p-3">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{product.name}</h3>
                  {product.description && (
                    <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                      {product.description}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-2">
                {product.pricing_type === 'weight' ? (
                  <span className="font-bold text-green-600 flex items-center gap-1">
                    ${(product.price || 0).toFixed(2)}
                    <span className="text-xs font-normal text-gray-500">/{product.weight_unit || 'lb'}</span>
                    <Scale className="w-3.5 h-3.5 text-amber-500" />
                  </span>
                ) : (
                  <span className="font-bold text-green-600">
                    ${(product.price || 0).toFixed(2)}
                  </span>
                )}
                {product.modifiers && product.modifiers.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    Customizable
                  </Badge>
                )}
              </div>

              {!isMobile && (
                <Button
                  size="sm"
                  className="w-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleProductClick(product);
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add to Cart
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedProduct && (
        <ModifierDialog
          product={selectedProduct}
          onAddToCart={handleModifiersConfirm}
          onCancel={() => setSelectedProduct(null)}
        />
      )}

      {weightProduct && (
        <WeightEntryDialog
          product={weightProduct}
          open={true}
          onClose={() => setWeightProduct(null)}
          onConfirm={handleWeightConfirm}
        />
      )}
    </>
  );
}