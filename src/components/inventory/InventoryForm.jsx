import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const CATEGORIES = ['food', 'beverage', 'supplies', 'packaging', 'cleaning', 'other'];
const UNITS = ['unit', 'box', 'case', 'lb', 'kg', 'oz', 'liter', 'gallon'];

export default function InventoryForm({ item, merchantId, locationId, onClose, onSave }) {
  const [formData, setFormData] = useState({
    merchant_id: merchantId,
    location_id: locationId || null,
    name: '',
    sku: '',
    barcode: '',
    category: 'food',
    quantity: 0,
    unit_of_measure: 'unit',
    reorder_threshold: 10,
    cost_per_unit: 0,
    selling_price: 0,
    supplier_name: '',
    supplier_contact: '',
    supplier_url: '',
    status: 'in_stock',
    alert_enabled: true,
    hide_when_empty: false,
    notes: ''
  });

  useEffect(() => {
    if (item) {
      setFormData({ ...item });
    }
  }, [item]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Determine status based on quantity
      const status = formData.quantity === 0 ? 'out_of_stock' :
                    formData.quantity <= formData.reorder_threshold ? 'low_stock' :
                    'in_stock';

      const dataToSave = { ...formData, status };

      if (item) {
        await base44.entities.MerchantInventory.update(item.id, dataToSave);
      } else {
        await base44.entities.MerchantInventory.create(dataToSave);
      }

      // Create alert if needed
      if (status === 'low_stock' && formData.alert_enabled) {
        await base44.entities.StockAlert.create({
          merchant_id: merchantId,
          alert_type: 'low_merchant_inventory',
          inventory_item_id: item?.id || null,
          item_name: formData.name,
          current_quantity: formData.quantity,
          reorder_threshold: formData.reorder_threshold,
          status: 'active'
        });
      }

      await onSave();
      onClose();
    } catch (error) {
      console.error('Error saving inventory item:', error);
      alert('Failed to save inventory item');
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Inventory Item' : 'Add Inventory Item'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Item Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>SKU</Label>
              <Input
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              />
            </div>

            <div>
              <Label>Barcode</Label>
              <Input
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              />
            </div>

            <div>
              <Label>Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat} className="capitalize">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Current Quantity *</Label>
              <Input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                required
              />
            </div>

            <div>
              <Label>Unit of Measure *</Label>
              <Select
                value={formData.unit_of_measure}
                onValueChange={(v) => setFormData({ ...formData, unit_of_measure: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map(unit => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Reorder Threshold *</Label>
              <Input
                type="number"
                value={formData.reorder_threshold}
                onChange={(e) => setFormData({ ...formData, reorder_threshold: parseInt(e.target.value) || 10 })}
                required
              />
            </div>

            <div>
              <Label>Cost per Unit *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.cost_per_unit}
                onChange={(e) => setFormData({ ...formData, cost_per_unit: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>

            <div>
              <Label>Selling Price</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label>Supplier Name</Label>
              <Input
                value={formData.supplier_name}
                onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
              />
            </div>

            <div>
              <Label>Supplier Contact</Label>
              <Input
                value={formData.supplier_contact}
                onChange={(e) => setFormData({ ...formData, supplier_contact: e.target.value })}
                placeholder="Phone or Email"
              />
            </div>

            <div>
              <Label>Supplier URL</Label>
              <Input
                value={formData.supplier_url}
                onChange={(e) => setFormData({ ...formData, supplier_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.alert_enabled}
                onChange={(e) => setFormData({ ...formData, alert_enabled: e.target.checked })}
                className="rounded"
              />
              <span>Enable low stock alerts</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.hide_when_empty}
                onChange={(e) => setFormData({ ...formData, hide_when_empty: e.target.checked })}
                className="rounded"
              />
              <span>Hide when out of stock</span>
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {item ? 'Update Item' : 'Add Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}