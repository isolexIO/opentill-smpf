import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CreateDeliveryDialog({ open, onClose, onCreate, defaultPickup }) {
  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    delivery_address: '',
    pickup_address: defaultPickup || '',
    items_summary: '',
    total: '',
    priority: 'normal',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.delivery_address || !form.pickup_address) return;
    setSaving(true);
    try {
      await onCreate({
        ...form,
        total: form.total ? Number(form.total) : 0
      });
      setForm({ customer_name: '', customer_phone: '', delivery_address: '', pickup_address: defaultPickup || '', items_summary: '', total: '', priority: 'normal', notes: '' });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Delivery Job</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="cust">Customer name</Label>
              <Input id="cust" value={form.customer_name} onChange={(e) => set('customer_name', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.customer_phone} onChange={(e) => set('customer_phone', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="pickup">Pickup address</Label>
            <Input id="pickup" value={form.pickup_address} onChange={(e) => set('pickup_address', e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="drop">Delivery address</Label>
            <Textarea id="drop" value={form.delivery_address} onChange={(e) => set('delivery_address', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="items">Items summary</Label>
              <Input id="items" value={form.items_summary} onChange={(e) => set('items_summary', e.target.value)} placeholder="2x Pizza, 1x Soda" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="total">Total ($)</Label>
              <Input id="total" type="number" step="0.01" value={form.total} onChange={(e) => set('total', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Priority</Label>
            <Select value={form.priority} onValueChange={(v) => set('priority', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Gate code, drop instructions..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Job'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}