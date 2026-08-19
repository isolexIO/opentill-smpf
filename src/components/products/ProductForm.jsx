import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";

export default function ProductForm({ product, onSave, onCancel, posMode }) {
  const departments = [
    "Appetizers",
    "Main Courses",
    "Desserts",
    "Drinks",
    "Beverages",
    "Bakery",
    "Pantry",
    "Frozen Goods",
    "Dairy",
    "Produce",
    "Snacks",
    "Other",
  ];

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    price: 0,
    department: '',
    description: '',
    image_url: '',
    stock_quantity: 0,
    low_stock_alert: 10,
    tax_rate: 0.08,
    is_active: true,
    pos_mode: posMode ? [posMode] : ['restaurant'],
    modifiers: [],
    ebt_eligible: false,
    age_restricted: false,
    minimum_age: 21,
    restriction_type: 'alcohol',
    tippable: true, // Added new field with a default value
    pricing_type: 'fixed', // 'fixed' or 'weight'
    weight_unit: 'lb', // 'lb', 'oz', 'kg', 'g'
    ...(product || {}) // Spread product at the end to override defaults
  });

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Get merchant_id from current user
    let merchantId = formData.merchant_id; // If editing existing product
    
    if (!merchantId) {
      const pinUserJSON = localStorage.getItem('pinLoggedInUser');
      if (pinUserJSON) {
        try {
          const pinUser = JSON.parse(pinUserJSON);
          merchantId = pinUser.merchant_id;
        } catch (error) {
          console.error('Error parsing user from localStorage:', error);
        }
      }
    }

    if (!merchantId) {
      alert('No merchant ID found. Please log in again.');
      return;
    }

    // Ensure merchant_id is included
    const dataToSave = {
      ...formData,
      merchant_id: merchantId
    };

    console.log('ProductForm - Saving product:', dataToSave);
    onSave(dataToSave);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{product ? 'Edit Product' : 'Add New Product'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Core Product Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>Core Product Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Product Name</Label>
                  <Input id="name" value={formData.name} onChange={(e) => handleChange("name", e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="sku">SKU (Stock Keeping Unit)</Label>
                  <Input id="sku" value={formData.sku} onChange={(e) => handleChange("sku", e.target.value)} />
                </div>
              </div>
              <div>
                <Label htmlFor="barcode">Barcode</Label>
                <Input id="barcode" value={formData.barcode} onChange={(e) => handleChange("barcode", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={formData.description} onChange={(e) => handleChange("description", e.target.value)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pricing_type">Pricing Type</Label>
                  <Select
                    value={formData.pricing_type || 'fixed'}
                    onValueChange={(value) => handleChange('pricing_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed Price (per item)</SelectItem>
                      <SelectItem value="weight">Sell by Weight</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.pricing_type === 'weight'
                      ? 'POS will prompt for weight at checkout'
                      : 'Standard pricing — one flat price per item'}
                  </p>
                </div>
                {formData.pricing_type === 'weight' && (
                  <div>
                    <Label htmlFor="weight_unit">Weight Unit</Label>
                    <Select
                      value={formData.weight_unit || 'lb'}
                      onValueChange={(value) => handleChange('weight_unit', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lb">Pounds (lb)</SelectItem>
                        <SelectItem value="oz">Ounces (oz)</SelectItem>
                        <SelectItem value="kg">Kilograms (kg)</SelectItem>
                        <SelectItem value="g">Grams (g)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">
                    {formData.pricing_type === 'weight'
                      ? `Price per ${formData.weight_unit || 'lb'}`
                      : 'Price'}
                  </Label>
                  <Input id="price" type="number" step="0.01" value={formData.price} onChange={(e) => handleChange("price", parseFloat(e.target.value) || 0)} required />
                  {formData.pricing_type === 'weight' && (
                    <p className="text-xs text-amber-600 mt-1">
                      e.g. $2.99/lb — customer pays weight × this price
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="department">Department *</Label>
                  <Select value={formData.department || ''} onValueChange={(value) => handleChange('department', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Products are organized by department on the POS screen
                  </p>
                </div>
              </div>
              <div>
                <Label htmlFor="image_url">Image URL</Label>
                <Input id="image_url" value={formData.image_url} onChange={(e) => handleChange("image_url", e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* EBT Eligibility Section */}
          <div className="p-4 border rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="ebt-eligible-switch">EBT Eligible</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="ebt-eligible-switch"
                  checked={formData.ebt_eligible || false}
                  onCheckedChange={(checked) => setFormData({...formData, ebt_eligible: checked})}
                />
                <Label htmlFor="ebt-eligible-switch" className="text-sm text-gray-600">
                  Can be purchased with EBT/SNAP benefits
                </Label>
              </div>
            </div>
          </div>

          {/* Tippable Item Section */}
          <div className="p-4 border rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="tippable-item-switch">Tippable Item</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="tippable-item-switch"
                  checked={formData.tippable !== false}
                  onCheckedChange={(checked) => setFormData({...formData, tippable: checked})}
                />
                <Label htmlFor="tippable-item-switch" className="text-sm text-gray-600">
                  Allow tips for this item (usually true for food/services, false for retail)
                </Label>
              </div>
            </div>
          </div>

          {/* Age Restriction Section */}
          <div className="border rounded-lg p-4 space-y-4">
            <div className="space-y-2"> {/* This div was added to match the outline's structure for the switch part */}
              <Label htmlFor="age-restricted-switch">Age Restricted</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="age-restricted-switch"
                  checked={formData.age_restricted || false}
                  onCheckedChange={(checked) => setFormData({...formData, age_restricted: checked})}
                />
                <Label htmlFor="age-restricted-switch" className="text-sm text-gray-600">
                  Requires age verification
                </Label>
              </div>
            </div>

            {formData.age_restricted && (
              <>
                <div>
                  <Label htmlFor="minimum-age">Minimum Age</Label>
                  <Input
                    id="minimum-age"
                    type="number"
                    min="18"
                    max="99"
                    value={formData.minimum_age}
                    onChange={(e) => setFormData({...formData, minimum_age: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label htmlFor="restriction-type">Restriction Type</Label>
                  <Select
                    value={formData.restriction_type}
                    onValueChange={(value) => setFormData({...formData, restriction_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alcohol">Alcohol</SelectItem>
                      <SelectItem value="tobacco">Tobacco</SelectItem>
                      <SelectItem value="vape">Vape Products</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          {/* Inventory & Tax Card */}
          <Card>
            <CardHeader>
              <CardTitle>Inventory & Tax</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="stock_quantity">Stock Quantity</Label>
                  <Input id="stock_quantity" type="number" value={formData.stock_quantity} onChange={(e) => handleChange("stock_quantity", parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <Label htmlFor="low_stock_alert">Low Stock Alert</Label>
                  <Input id="low_stock_alert" type="number" value={formData.low_stock_alert} onChange={(e) => handleChange("low_stock_alert", parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                  <Input id="tax_rate" type="number" step="0.01" value={formData.tax_rate * 100} onChange={(e) => handleChange("tax_rate", parseFloat(e.target.value) / 100 || 0)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Modifiers Card */}
          <Card>
            <CardHeader>
              <CardTitle>Modifiers (for Food/Beverage)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Modifiers (Grouped)</Label>
                <div className="space-y-3">
                  {formData.modifiers.map((modifier, index) => (
                    <div key={index} className="flex gap-2 items-start p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <Input
                          placeholder="Group (e.g., Size)"
                          value={modifier.group || ''}
                          onChange={(e) => {
                            const newModifiers = [...formData.modifiers];
                            newModifiers[index].group = e.target.value;
                            setFormData({ ...formData, modifiers: newModifiers });
                          }}
                        />
                        <Input
                          placeholder="Name"
                          value={modifier.name}
                          onChange={(e) => {
                            const newModifiers = [...formData.modifiers];
                            newModifiers[index].name = e.target.value;
                            setFormData({ ...formData, modifiers: newModifiers });
                          }}
                        />
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Price adj."
                          value={modifier.price_adjustment}
                          onChange={(e) => {
                            const newModifiers = [...formData.modifiers];
                            newModifiers[index].price_adjustment = parseFloat(e.target.value) || 0;
                            setFormData({ ...formData, modifiers: newModifiers });
                          }}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const newModifiers = formData.modifiers.filter((_, i) => i !== index);
                          setFormData({ ...formData, modifiers: newModifiers });
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        modifiers: [...formData.modifiers, { group: '', name: '', price_adjustment: 0, type: 'add' }]
                      });
                    }}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Modifier
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Availability Card */}
          <Card>
            <CardHeader>
              <CardTitle>Availability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Product is Active</Label>
                <Switch id="is_active" checked={formData.is_active} onCheckedChange={(checked) => handleChange("is_active", checked)} />
              </div>
              <div>
                <Label>Available in POS Modes</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                  {["restaurant", "retail", "quick_service", "food_truck"].map(mode => (
                    <div key={mode} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`mode_${mode}`}
                        checked={formData.pos_mode.includes(mode)}
                        onChange={(e) => {
                          const newModes = e.target.checked
                            ? [...formData.pos_mode, mode]
                            : formData.pos_mode.filter(m => m !== mode);
                          handleChange("pos_mode", newModes);
                        }}
                      />
                      <Label htmlFor={`mode_${mode}`} className="capitalize">{mode.replace("_", " ")}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4 mt-6">
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit">Save Product</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}