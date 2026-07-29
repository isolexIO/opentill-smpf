import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Package, AlertCircle, CheckCircle, ShoppingCart } from 'lucide-react';

const QuickCreateModal = ({ isOpen, onClose, barcode, onCreateProduct, merchantId, departments }) => {
  const [loading, setLoading] = useState(false);
  const [lookupStatus, setLookupStatus] = useState('idle');
  const [productData, setProductData] = useState({
    name: '',
    sku: barcode || '',
    barcode: barcode || '',
    price: 0,
    department: 'all',
    description: '',
    image_url: '',
    stock_quantity: 0,
    low_stock_alert: 10,
    is_active: true,
    pos_mode: ['restaurant', 'retail', 'quick_service'],
    ebt_eligible: false,
    age_restricted: false,
    minimum_age: 21
  });
  const [lookupSource, setLookupSource] = useState(null);

  useEffect(() => {
    if (!isOpen || !barcode) return;

    console.log('QuickCreateModal: Opening with barcode:', barcode);

    setLookupStatus('idle');
    setLookupSource(null);
    setProductData({
      name: '',
      sku: barcode,
      barcode: barcode,
      price: 0,
      department: 'all',
      description: '',
      image_url: '',
      stock_quantity: 0,
      low_stock_alert: 10,
      is_active: true,
      pos_mode: ['restaurant', 'retail', 'quick_service'],
      ebt_eligible: false,
      age_restricted: false,
      minimum_age: 21
    });

    const cacheKey = `product_lookup_${barcode}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const cachedData = JSON.parse(cached);
        const cacheAge = Date.now() - cachedData.timestamp;
        if (cacheAge < 7 * 24 * 60 * 60 * 1000) {
          console.log('Using cached product data:', cachedData.data);
          setProductData(prev => ({
            ...prev,
            ...cachedData.data
          }));
          setLookupStatus('found');
          setLookupSource(cachedData.source + ' (cached)');
          return;
        }
      } catch (e) {
        console.error('Cache parse error:', e);
      }
    }

    lookupProductInfo(barcode);
  }, [isOpen, barcode]);

  const lookupProductInfo = async (barcode) => {
    setLoading(true);
    setLookupStatus('searching');
    
    try {
      console.log('🔍 Looking up barcode:', barcode);

      // Try Open Food Facts first
      try {
        console.log('Trying Open Food Facts API...');
        const offUrl = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`;
        console.log('Fetching:', offUrl);
        
        const offResponse = await fetch(offUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'openTILL-POS/1.0'
          }
        });
        
        console.log('OFF Response status:', offResponse.status);
        const offData = await offResponse.json();
        console.log('OFF Response data:', offData);
        
        if (offData.status === 1 && offData.product) {
          const product = offData.product;
          console.log('✅ Found in Open Food Facts:', product.product_name);
          
          const extractedData = {
            name: product.product_name || product.product_name_en || '',
            description: product.generic_name || product.generic_name_en || product.brands || '',
            image_url: product.image_url || product.image_front_url || '',
            department: getCategoryFromOpenFoodFacts(product),
            price: 0
          };

          console.log('Extracted data:', extractedData);
          setProductData(prev => ({ ...prev, ...extractedData }));
          setLookupStatus('found');
          setLookupSource('Open Food Facts');
          cacheProductData(barcode, extractedData, 'Open Food Facts');
          setLoading(false);
          return;
        } else {
          console.log('OFF: Product not found or status !== 1');
        }
      } catch (e) {
        console.log('Open Food Facts failed:', e.message);
      }

      // Try UPC Item DB
      try {
        console.log('Trying UPC Item DB...');
        const upcUrl = `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`;
        console.log('Fetching:', upcUrl);
        
        const upcResponse = await fetch(upcUrl);
        console.log('UPC Response status:', upcResponse.status);
        const upcData = await upcResponse.json();
        console.log('UPC Response data:', upcData);
        
        if (upcData.code === 'OK' && upcData.items && upcData.items.length > 0) {
          const item = upcData.items[0];
          console.log('✅ Found in UPC Item DB:', item.title);
          
          const extractedData = {
            name: item.title || '',
            description: item.description || item.brand || '',
            image_url: item.images && item.images.length > 0 ? item.images[0] : '',
            department: getCategoryFromUPC(item.category),
            price: 0
          };

          console.log('Extracted data:', extractedData);
          setProductData(prev => ({ ...prev, ...extractedData }));
          setLookupStatus('found');
          setLookupSource('UPC Item DB');
          cacheProductData(barcode, extractedData, 'UPC Item DB');
          setLoading(false);
          return;
        } else {
          console.log('UPC: Product not found or invalid response');
        }
      } catch (e) {
        console.log('UPC Item DB failed:', e.message);
      }

      console.log('❌ Product not found in any database');
      setLookupStatus('not_found');
      setLoading(false);
      
    } catch (error) {
      console.error('Product lookup error:', error);
      setLookupStatus('not_found');
      setLoading(false);
    }
  };

  const cacheProductData = (barcode, data, source) => {
    try {
      const cacheKey = `product_lookup_${barcode}`;
      const cacheData = {
        data,
        source,
        timestamp: Date.now()
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log('💾 Cached product data:', cacheKey);
    } catch (e) {
      console.error('Failed to cache product data:', e);
    }
  };

  const getCategoryFromOpenFoodFacts = (product) => {
    const categories = product.categories_tags || [];
    if (categories.some(cat => cat.includes('beverages'))) return 'beverage';
    if (categories.some(cat => cat.includes('snacks'))) return 'food';
    if (categories.some(cat => cat.includes('dairy'))) return 'food';
    if (categories.some(cat => cat.includes('meat'))) return 'food';
    return 'food';
  };

  const getCategoryFromUPC = (category) => {
    if (!category) return 'all';
    const cat = category.toLowerCase();
    if (cat.includes('food') || cat.includes('grocery')) return 'food';
    if (cat.includes('beverage') || cat.includes('drink')) return 'beverage';
    if (cat.includes('health') || cat.includes('beauty')) return 'retail';
    return 'all';
  };

  const handleInputChange = (field, value) => {
    setProductData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = () => {
    if (!productData.name.trim()) {
      alert('Product name is required');
      return;
    }
    if (productData.price <= 0) {
      alert('Please enter a valid price greater than 0');
      return;
    }

    const fullProductData = {
      ...productData,
      merchant_id: merchantId,
      lookup_source: lookupSource,
      lookup_date: new Date().toISOString()
    };

    console.log('Creating product with data:', fullProductData);
    onCreateProduct(fullProductData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Quick Create Product - Barcode: {barcode}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {loading && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Searching product databases...
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                    Checking Open Food Facts → UPC Database
                  </p>
                </div>
              </div>
            </div>
          )}

          {lookupStatus === 'found' && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    Product information found!
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-300 mt-1">
                    Source: {lookupSource} • Review details, set price, and save to add to ticket.
                  </p>
                </div>
              </div>
            </div>
          )}

          {lookupStatus === 'not_found' && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Item not found in product databases
                  </p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-300 mt-1">
                    Please enter product details manually
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={productData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter product name"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="price">Price * (USD)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0.01"
                value={productData.price}
                onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="mt-1"
                autoFocus={lookupStatus === 'found'}
              />
            </div>

            <div>
              <Label htmlFor="department">Department</Label>
              <Select value={productData.department} onValueChange={(value) => handleInputChange('department', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All / General</SelectItem>
                  {(departments || []).map(dept => (
                    <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={productData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Product description"
                className="h-20 mt-1"
              />
            </div>

            {productData.image_url && (
              <div className="md:col-span-2">
                <Label>Product Image</Label>
                <div className="mt-2 flex items-center gap-4">
                  <img 
                    src={productData.image_url} 
                    alt="Product" 
                    className="w-32 h-32 object-cover rounded border"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      handleInputChange('image_url', '');
                    }}
                  />
                  <div className="flex-1">
                    <Input
                      value={productData.image_url}
                      onChange={(e) => handleInputChange('image_url', e.target.value)}
                      placeholder="Or enter image URL"
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="stock">Initial Stock</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={productData.stock_quantity}
                onChange={(e) => handleInputChange('stock_quantity', parseInt(e.target.value) || 0)}
                placeholder="0"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="lowStock">Low Stock Alert</Label>
              <Input
                id="lowStock"
                type="number"
                min="0"
                value={productData.low_stock_alert}
                onChange={(e) => handleInputChange('low_stock_alert', parseInt(e.target.value) || 10)}
                placeholder="10"
                className="mt-1"
              />
            </div>

            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={productData.is_active}
                  onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                />
                <Label htmlFor="active">Product is Active</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="ebt"
                  checked={productData.ebt_eligible}
                  onCheckedChange={(checked) => handleInputChange('ebt_eligible', checked)}
                />
                <Label htmlFor="ebt">EBT/SNAP Eligible</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="age"
                  checked={productData.age_restricted}
                  onCheckedChange={(checked) => handleInputChange('age_restricted', checked)}
                />
                <Label htmlFor="age">Age Restricted ({productData.minimum_age}+)</Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={loading || !productData.name.trim() || productData.price <= 0}
            className="bg-green-600 hover:bg-green-700"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Save & Add to Ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuickCreateModal;