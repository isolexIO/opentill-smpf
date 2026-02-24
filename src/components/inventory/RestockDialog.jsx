
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp } from 'lucide-react';

export default function RestockDialog({ item, onClose, onComplete }) {
  const [quantity, setQuantity] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!quantity || parseInt(quantity) <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    setSaving(true);

    try {
      const newQuantity = item.quantity + parseInt(quantity);
      const status = newQuantity <= item.reorder_threshold ? 'low_stock' : 'in_stock';

      // Optimistic update: immediately call onComplete to update UI
      await onComplete();

      await base44.entities.MerchantInventory.update(item.id, {
        quantity: newQuantity,
        status,
        last_restock_date: new Date().toISOString(),
        last_restock_quantity: parseInt(quantity)
      });

      // Resolve alerts if stock is now above threshold
      if (newQuantity > item.reorder_threshold) {
        const alerts = await base44.entities.StockAlert.filter({
          inventory_item_id: item.id,
          status: 'active'
        });

        for (const alert of alerts) {
          await base44.entities.StockAlert.update(alert.id, {
            status: 'resolved',
            resolved_at: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Error restocking item:', error);
      alert('Failed to restock item');
    } finally {
      setSaving(false);
    }
  };

  const newTotal = item.quantity + (parseInt(quantity) || 0);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Restock Item
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">{item.name}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Current Stock:</span>
                <span className="ml-2 font-medium">{item.quantity} {item.unit_of_measure}</span>
              </div>
              <div>
                <span className="text-gray-500">Reorder Level:</span>
                <span className="ml-2 font-medium">{item.reorder_threshold} {item.unit_of_measure}</span>
              </div>
            </div>
          </div>

          <div>
            <Label>Quantity to Add *</Label>
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter quantity"
              required
            />
          </div>

          {quantity && parseInt(quantity) > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <p className="text-sm">
                <span className="text-gray-600 dark:text-gray-400">New Total:</span>
                <span className="ml-2 text-lg font-bold text-blue-600 dark:text-blue-400">
                  {newTotal} {item.unit_of_measure}
                </span>
              </p>
              {newTotal > item.reorder_threshold && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  ✓ Above reorder threshold
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Restocking...' : 'Confirm Restock'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
