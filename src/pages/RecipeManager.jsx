import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import getMerchantId from '@/lib/getMerchantId';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChefHat, Plus, Trash2, Save, Loader2, UtensilsCrossed, Clock } from 'lucide-react';

const STATIONS = ['grill', 'fry', 'salad', 'bar', 'prep', 'dessert', 'general'];

export default function RecipeManager() {
  const [merchantId, setMerchantId] = useState(null);
  const [products, setProducts] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeProduct, setActiveProduct] = useState(null);
  const [draft, setDraft] = useState(null);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const mid = await getMerchantId();
    setMerchantId(mid);
    if (mid) await loadData(mid);
  };

  const loadData = async (mid) => {
    setLoading(true);
    try {
      const [prods, recs] = await Promise.all([
        base44.entities.Product.filter({ merchant_id: mid, is_active: true }, 'name', 500),
        base44.entities.Recipe.filter({ merchant_id: mid }, 'product_name', 500)
      ]);
      setProducts(prods || []);
      setRecipes(recs || []);
    } catch (e) {
      console.error('Error loading data', e);
    } finally {
      setLoading(false);
    }
  };

  const recipeForProduct = (productId) => recipes.find(r => r.product_id === productId);

  const selectProduct = (p) => {
    setActiveProduct(p.id);
    const existing = recipeForProduct(p.id);
    setDraft(existing ? { ...existing } : {
      product_id: p.id,
      product_name: p.name,
      station: 'general',
      prep_time_minutes: 10,
      servings: 1,
      ingredients: [],
      steps: [],
      allergens: [],
      plating_notes: '',
      display_on_kitchen_display: true,
      is_active: true
    });
  };

  const addIngredient = () => setDraft(d => ({ ...d, ingredients: [...(d.ingredients || []), { name: '', quantity: '', unit: '' }] }));
  const updIngredient = (i, field, val) => setDraft(d => {
    const ing = [...(d.ingredients || [])];
    ing[i] = { ...ing[i], [field]: val };
    return { ...d, ingredients: ing };
  });
  const rmIngredient = (i) => setDraft(d => ({ ...d, ingredients: (d.ingredients || []).filter((_, idx) => idx !== i) }));

  const addStep = () => setDraft(d => ({ ...d, steps: [...(d.steps || []), { step_number: (d.steps?.length || 0) + 1, instruction: '', time_minutes: 0 }] }));
  const updStep = (i, field, val) => setDraft(d => {
    const steps = [...(d.steps || [])];
    steps[i] = { ...steps[i], [field]: field === 'step_number' || field === 'time_minutes' ? Number(val) : val };
    return { ...d, steps };
  });
  const rmStep = (i) => setDraft(d => ({ ...d, steps: (d.steps || []).filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, step_number: idx + 1 })) }));

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const payload = {
        merchant_id: merchantId,
        product_id: draft.product_id,
        product_name: draft.product_name,
        station: draft.station,
        prep_time_minutes: Number(draft.prep_time_minutes) || 10,
        servings: Number(draft.servings) || 1,
        ingredients: draft.ingredients || [],
        steps: draft.steps || [],
        allergens: draft.allergens || [],
        plating_notes: draft.plating_notes || '',
        display_on_kitchen_display: draft.display_on_kitchen_display !== false,
        is_active: true
      };
      if (draft.id) {
        await base44.entities.Recipe.update(draft.id, payload);
      } else {
        const created = await base44.entities.Recipe.create(payload);
        setRecipes(prev => [...prev, created]);
      }
      await loadData(merchantId);
    } catch (e) {
      console.error('Error saving recipe', e);
      alert('Could not save recipe: ' + (e.message || 'error'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!draft?.id || !confirm('Delete this recipe?')) return;
    try {
      await base44.entities.Recipe.delete(draft.id);
      setRecipes(prev => prev.filter(r => r.id !== draft.id));
      setActiveProduct(null);
      setDraft(null);
    } catch (e) {
      console.error('Error deleting recipe', e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-orange-500 to-rose-600 rounded-xl flex items-center justify-center">
            <ChefHat className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Recipes</h1>
            <p className="text-sm text-gray-500">Prep steps & ingredients shown on the kitchen display</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Product list */}
          <Card className="h-fit">
            <CardHeader className="pb-2"><CardTitle className="text-base">Menu Items</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
              ) : products.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">No products yet.</p>
              ) : (
                <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                  {products.map(p => {
                    const has = recipeForProduct(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => selectProduct(p)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between gap-2 transition-colors ${activeProduct === p.id ? 'bg-orange-100 text-orange-900' : 'hover:bg-gray-100 text-gray-700'}`}
                      >
                        <span className="truncate flex items-center gap-2">
                          <UtensilsCrossed className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                          {p.name}
                        </span>
                        {has ? <Badge variant="secondary" className="text-[10px]">Recipe</Badge> : <Badge variant="outline" className="text-[10px] text-gray-400">—</Badge>}
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recipe editor */}
          <Card className="lg:col-span-2 h-fit">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{draft ? `Recipe · ${draft.product_name}` : 'Recipe Editor'}</CardTitle>
            </CardHeader>
            <CardContent>
              {!draft ? (
                <p className="text-sm text-gray-500 text-center py-12">Select a menu item to create or edit its recipe.</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Station</Label>
                      <Select value={draft.station} onValueChange={v => setDraft({ ...draft, station: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{STATIONS.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Prep time (min)</Label>
                      <Input type="number" min={0} value={draft.prep_time_minutes} onChange={e => setDraft({ ...draft, prep_time_minutes: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Servings</Label>
                      <Input type="number" min={1} value={draft.servings} onChange={e => setDraft({ ...draft, servings: e.target.value })} />
                    </div>
                  </div>

                  {/* Ingredients */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs">Ingredients</Label>
                      <Button size="sm" variant="ghost" onClick={addIngredient} className="h-7 text-xs"><Plus className="w-3 h-3 mr-1" />Add</Button>
                    </div>
                    <div className="space-y-1">
                      {(draft.ingredients || []).map((ing, i) => (
                        <div key={i} className="grid grid-cols-12 gap-1">
                          <Input className="col-span-6 h-8 text-sm" placeholder="Ingredient" value={ing.name} onChange={e => updIngredient(i, 'name', e.target.value)} />
                          <Input className="col-span-3 h-8 text-sm" placeholder="Qty" value={ing.quantity} onChange={e => updIngredient(i, 'quantity', e.target.value)} />
                          <Input className="col-span-2 h-8 text-sm" placeholder="Unit" value={ing.unit} onChange={e => updIngredient(i, 'unit', e.target.value)} />
                          <Button size="icon" variant="ghost" className="col-span-1 h-8" onClick={() => rmIngredient(i)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                        </div>
                      ))}
                      {(draft.ingredients || []).length === 0 && <p className="text-xs text-gray-400">No ingredients yet.</p>}
                    </div>
                  </div>

                  {/* Steps */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs">Prep Steps (shown on kitchen display)</Label>
                      <Button size="sm" variant="ghost" onClick={addStep} className="h-7 text-xs"><Plus className="w-3 h-3 mr-1" />Add Step</Button>
                    </div>
                    <div className="space-y-2">
                      {(draft.steps || []).map((s, i) => (
                        <div key={i} className="flex gap-2 items-start">
                          <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-bold shrink-0 mt-1">{s.step_number}</div>
                          <Textarea className="flex-1 text-sm" rows={2} placeholder="Instruction" value={s.instruction} onChange={e => updStep(i, 'instruction', e.target.value)} />
                          <div className="w-20 shrink-0">
                            <Input type="number" min={0} className="h-8 text-sm" placeholder="min" value={s.time_minutes} onChange={e => updStep(i, 'time_minutes', e.target.value)} />
                          </div>
                          <Button size="icon" variant="ghost" className="shrink-0" onClick={() => rmStep(i)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                        </div>
                      ))}
                      {(draft.steps || []).length === 0 && <p className="text-xs text-gray-400">No steps yet.</p>}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Allergens (comma-separated)</Label>
                    <Input value={(draft.allergens || []).join(', ')} onChange={e => setDraft({ ...draft, allergens: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="gluten, dairy, nuts" />
                  </div>
                  <div>
                    <Label className="text-xs">Plating Notes</Label>
                    <Textarea rows={2} value={draft.plating_notes || ''} onChange={e => setDraft({ ...draft, plating_notes: e.target.value })} placeholder="Final presentation instructions" />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={draft.display_on_kitchen_display !== false} onChange={e => setDraft({ ...draft, display_on_kitchen_display: e.target.checked })} />
                    Show recipe on kitchen display
                  </label>

                  <div className="flex gap-2 pt-1">
                    <Button onClick={save} disabled={saving} className="flex-1">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" />Save Recipe</>}
                    </Button>
                    {draft.id && <Button variant="destructive" onClick={remove}><Trash2 className="w-4 h-4" /></Button>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}