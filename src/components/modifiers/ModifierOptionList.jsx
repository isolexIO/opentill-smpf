import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2 } from 'lucide-react';

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36);

export default function ModifierOptionList({ options, onChange }) {
  const update = (id, patch) =>
    onChange(options.map((o) => (o.id === id ? { ...o, ...patch } : o)));

  const add = () =>
    onChange([
      ...options,
      { id: uid(), name: '', price_adjustment: 0, is_default: false, sort_order: options.length },
    ]);

  const remove = (id) => onChange(options.filter((o) => o.id !== id));

  return (
    <div className="space-y-2">
      {options.map((o) => (
        <div key={o.id} className="flex items-center gap-2">
          <Input
            placeholder="Option name (e.g. Whole Milk)"
            value={o.name}
            onChange={(e) => update(o.id, { name: e.target.value })}
            className="flex-1"
          />
          <div className="flex items-center gap-1 w-28">
            <span className="text-xs text-gray-400">$</span>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={o.price_adjustment}
              onChange={(e) =>
                update(o.id, { price_adjustment: Number(e.target.value) || 0 })
              }
            />
          </div>
          <Label className="flex items-center gap-1 text-xs whitespace-nowrap">
            <Switch
              checked={!!o.is_default}
              onCheckedChange={(v) => update(o.id, { is_default: v })}
            />
            Default
          </Label>
          <Button variant="ghost" size="icon" onClick={() => remove(o.id)}>
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add}>
        <Plus className="w-4 h-4 mr-1" /> Add Option
      </Button>
    </div>
  );
}