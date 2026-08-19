import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Pencil, Trash2, Layers } from 'lucide-react';
import ModifierGroupEditor from '@/components/modifiers/ModifierGroupEditor';

export default function Modifiers() {
  const { toast } = useToast();
  const [merchantId, setMerchantId] = useState(null);
  const [groups, setGroups] = useState([]);
  const [products, setProducts] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async (mid) => {
    setLoading(true);
    try {
      const [g, p, d] = await Promise.all([
        base44.entities.ModifierGroup.filter({ merchant_id: mid }, 'sort_order'),
        base44.entities.Product.filter({ merchant_id: mid }, 'name'),
        base44.entities.Department.filter({ merchant_id: mid }, 'display_order'),
      ]);
      setGroups(g || []);
      setProducts(p || []);
      setDepartments(d || []);
    } catch (e) {
      toast({ title: 'Failed to load modifiers', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    (async () => {
      try {
        const pinUserJSON = localStorage.getItem('pinLoggedInUser');
        const me = pinUserJSON ? JSON.parse(pinUserJSON) : await base44.auth.me();
        if (me?.merchant_id) {
          setMerchantId(me.merchant_id);
          await load(me.merchant_id);
        } else {
          setLoading(false);
        }
      } catch {
        setLoading(false);
      }
    })();
  }, [load]);

  const handleDelete = async (g) => {
    if (!confirm(`Delete modifier group "${g.name}"?`)) return;
    try {
      await base44.entities.ModifierGroup.delete(g.id);
      setGroups((prev) => prev.filter((x) => x.id !== g.id));
      toast({ title: 'Group deleted' });
    } catch (e) {
      toast({ title: 'Delete failed', description: e.message, variant: 'destructive' });
    }
  };

  const toggleActive = async (g) => {
    try {
      await base44.entities.ModifierGroup.update(g.id, { is_active: !g.is_active });
      setGroups((prev) => prev.map((x) => (x.id === g.id ? { ...x, is_active: !x.is_active } : x)));
    } catch (e) {
      toast({ title: 'Update failed', description: e.message, variant: 'destructive' });
    }
  };

  if (!merchantId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-gray-500">
        {loading ? 'Loading…' : 'No merchant account linked to your user.'}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-600" /> Modifier Groups
          </h1>
          <p className="text-sm text-gray-500">
            Group modifiers and assign them to products or departments.
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setEditorOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> New Group
        </Button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No modifier groups yet. Create one to start adding options.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {groups.map((g) => {
            const scope = g.apply_to_all_products
              ? 'All products'
              : [
                  `${(g.applies_to_product_ids || []).length} products`,
                  `${(g.applies_to_department_ids || []).length} depts`,
                ].join(' · ');
            return (
              <Card key={g.id} className={!g.is_active ? 'opacity-60' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{g.name}</CardTitle>
                    <Switch checked={!!g.is_active} onCheckedChange={() => toggleActive(g)} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{g.selection_type === 'single' ? 'Pick one' : 'Pick many'}</Badge>
                    <Badge variant="outline">{(g.options || []).length} options</Badge>
                    <Badge variant="outline">{scope}</Badge>
                  </div>
                  {g.description && <p className="text-xs text-gray-500">{g.description}</p>}
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm" variant="outline"
                      onClick={() => { setEditing(g); setEditorOpen(true); }}
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(g)}>
                      <Trash2 className="w-3.5 h-3.5 mr-1 text-red-500" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {editorOpen && (
        <ModifierGroupEditor
          open={editorOpen}
          group={editing}
          merchantId={merchantId}
          products={products}
          departments={departments}
          onClose={() => setEditorOpen(false)}
          onSaved={() => load(merchantId)}
        />
      )}
    </div>
  );
}