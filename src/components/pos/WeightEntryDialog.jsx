import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Scale } from 'lucide-react';

export default function WeightEntryDialog({ product, open, onClose, onConfirm }) {
  const [weight, setWeight] = useState('');

  useEffect(() => {
    if (open) setWeight('');
  }, [open]);

  if (!product) return null;

  const unit = product.weight_unit || 'lb';
  const numericWeight = parseFloat(weight) || 0;
  const total = (numericWeight * (product.price || 0)).toFixed(2);

  const handleConfirm = () => {
    if (numericWeight <= 0) return;
    onConfirm(numericWeight);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-green-600" />
            {product.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="text-sm text-gray-500">
            Price: <span className="font-semibold text-gray-900">
              ${Number(product.price || 0).toFixed(2)} / {unit}
            </span>
          </div>
          <div className="space-y-2">
            <Label htmlFor="weight">Enter Weight ({unit})</Label>
            <Input
              id="weight"
              type="number"
              step="0.01"
              min="0"
              autoFocus
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && numericWeight > 0) handleConfirm();
              }}
              placeholder="0.00"
              className="text-2xl font-bold text-center h-14"
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
            <span className="text-sm font-medium text-green-800">Total</span>
            <span className="text-2xl font-bold text-green-700">${total}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={numericWeight <= 0} className="bg-green-600 hover:bg-green-700">
            Add to Cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}