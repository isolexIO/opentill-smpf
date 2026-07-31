import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ModifierOptionList from './ModifierOptionList';

const defaultForm = () => ({
  name: '', description: '', selection_type: 'single',
  min_required: 0, max_allowed: 0, sort_order: 0, is_active: true,
  apply_to_all_products: false,
  applies_to_product_ids: [], applies_to_department_ids: [], options: [],
});

export default function ModifierGroupEditor({
  open, onClose, onSaved, merchantId, group, products = [], departments = [],
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(defaultForm());

  useEffect(() => {
    if (open) setForm(group ? { ...group } : defaultForm());
  }, [open, group]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toggleId = (key, id) =>
    set(
      key,
      form[key].includes(id) ? form[key].filter((x) => x !== id) : [...form[key], id]
    );

  const handleSave = async () => {
    if (!form.name?.trim()) {
      toast({ title: 'Group name is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        merchant_id: merchantId,
        name: form.name.trim(),
        description: form.description || '',
        selection_type: form.selection_type || 'single',
        min_required: Number(form.min_required) || 0,
        max_allowed: Number(form.max_allowed) || 0,
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active !== false,
        apply_to_all_products: !!form.apply_to_all_products,
        applies_to_product_ids: form.apply_to_all_products ? [] : (form.applies_to_product_ids || []),
        applies_to_department_ids: form.apply_to_all_products ? [] : (form.applies_to_department_ids || []),
        options: (form.options || []).map((o, i) => ({
          ...o, id: o.id || undefined, sort_order: o.sort_order ?? i,
        })),
      };
      if (group?.id) {
        await base44.entities.ModifierGroup.update(group.id, payload);
        toast({ title: 'Modifier group updated' });
      } else {
        await base44.entities.ModifierGroup.create(payload);
        toast({ title: 'Modifier group created' });
      }
      onSaved();
      onClose();
    } catch (e) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{group ? 'Edit Modifier Group' : 'New Modifier Group'}</DialogTitle>
          <DialogDescription>
            Group options together and assign them to products or departments.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Group Name</Label>
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Milk Options" />
            </div>
            <div className="space-y-1.5">
              <Label>Selection Type</Label>
              <Select value={form.selection_type} onValueChange={(v) => set('selection_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single (pick one)</SelectItem>
                  <SelectItem value="multi">Multi (pick many)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Min Required</Label>
              <Input type="number" value={form.min_required} onChange={(e) => set('min_required', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Max Allowed (0 = unlimited)</Label>
              <Input type="number" value={form.max_allowed} onChange={(e) => set('max_allowed', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Sort Order</Label>
              <Input type="number" value={form.sort_order} onChange={(e) => set('sort_order', e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <Label className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => set('is_active', v)} /> Active
            </Label>
            <Label className="flex items-center gap-2">
              <Switch
                checked={form.apply_to_all_products}
                onCheckedChange={(v) => set('apply_to_all_products', v)}
              /> Apply to all products
            </Label>
          </div>

          <div>
            <Label className="text-sm font-semibold">Options</Label>
            <div className="mt-2">
              <ModifierOptionList options={form.options || []} onChange={(opts) => set('options', opts)} />
            </div>
          </div>

          {!form.apply_to_all_products && (
            <div className="space-y-3 border-t pt-3">
              <div>
                <Label className="text-sm font-semibold">Assign to Departments</Label>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                  {departments.map((d) => (
                    <Label key={d.id} className="flex items-center gap-2 text-sm font-normal">
                      <Checkbox
                        checked={form.applies_to_department_ids.includes(d.id)}
                        onCheckedChange={() => toggleId('applies_to_department_ids', d.id)}
                      />
                      {d.name}
                    </Label>
                  ))}
                  {departments.length === 0 && <p className="text-xs text-gray-400">No departments.</p>}
                </div>
              </div>
              <div>
                <Label className="text-sm font-semibold">Assign to Products</Label>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                  {products.map((p) => (
                    <Label key={p.id} className="flex items-center gap-2 text-sm font-normal">
                      <Checkbox
                        checked={form.applies_to_product_ids.includes(p.id)}
                        onCheckedChange={() => toggleId('applies_to_product_ids', p.id)}
                      />
                      {p.name}
                    </Label>
                  ))}
                  {products.length === 0 && <p className="text-xs text-gray-400">No products.</p>}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}