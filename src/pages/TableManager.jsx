import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import getMerchantId from '@/lib/getMerchantId';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Save, X, Grid3x3, Users, Loader2 } from 'lucide-react';

const STATUS_COLORS = {
  available: 'bg-green-100 border-green-400 text-green-800',
  occupied: 'bg-red-100 border-red-400 text-red-800',
  reserved: 'bg-amber-100 border-amber-400 text-amber-800',
  cleaning: 'bg-blue-100 border-blue-400 text-blue-800',
  inactive: 'bg-gray-100 border-gray-300 text-gray-500'
};

const SHAPES = ['square', 'round', 'rectangle'];
const STATUSES = ['available', 'occupied', 'reserved', 'cleaning', 'inactive'];
const GRID_COLS = 12;
const GRID_ROWS = 8;

export default function TableManager() {
  const [merchantId, setMerchantId] = useState(null);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState(null);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const mid = await getMerchantId();
    setMerchantId(mid);
    if (mid) await loadTables(mid);
  };

  const loadTables = async (mid) => {
    setLoading(true);
    try {
      const list = await base44.entities.RestaurantTable.filter({ merchant_id: mid }, 'sort_order', 200);
      setTables(list || []);
    } catch (e) {
      console.error('Error loading tables', e);
    } finally {
      setLoading(false);
    }
  };

  const startAdd = () => {
    setSelected(null);
    setDraft({
      name: `T${tables.length + 1}`,
      table_number: String(tables.length + 1),
      capacity: 4,
      shape: 'square',
      section: 'Main',
      x: 0, y: 0, width: 1, height: 1,
      status: 'available'
    });
  };

  const startEdit = (t) => {
    setSelected(t.id);
    setDraft({ ...t });
  };

  const closeDraft = () => { setSelected(null); setDraft(null); };

  const saveDraft = async () => {
    if (!draft.name) return;
    setSaving(true);
    try {
      if (draft.id) {
        await base44.entities.RestaurantTable.update(draft.id, {
          name: draft.name, table_number: draft.table_number, capacity: Number(draft.capacity),
          shape: draft.shape, section: draft.section, x: Number(draft.x), y: Number(draft.y),
          width: Number(draft.width) || 1, height: Number(draft.height) || 1,
          status: draft.status, is_active: draft.is_active !== false, sort_order: Number(draft.sort_order) || 0
        });
      } else {
        const created = await base44.entities.RestaurantTable.create({
          merchant_id: merchantId,
          name: draft.name, table_number: draft.table_number, capacity: Number(draft.capacity),
          shape: draft.shape, section: draft.section, x: Number(draft.x), y: Number(draft.y),
          width: Number(draft.width) || 1, height: Number(draft.height) || 1,
          status: draft.status, is_active: true, sort_order: tables.length
        });
        setTables(prev => [...prev, created]);
      }
      await loadTables(merchantId);
      closeDraft();
    } catch (e) {
      console.error('Error saving table', e);
      alert('Could not save table: ' + (e.message || 'unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const removeTable = async (t) => {
    if (!confirm(`Delete table "${t.name}"?`)) return;
    try {
      await base44.entities.RestaurantTable.delete(t.id);
      setTables(prev => prev.filter(x => x.id !== t.id));
      if (selected === t.id) closeDraft();
    } catch (e) {
      console.error('Error deleting table', e);
      alert('Could not delete table');
    }
  };

  const setStatus = async (t, status) => {
    try {
      await base44.entities.RestaurantTable.update(t.id, { status });
      setTables(prev => prev.map(x => x.id === t.id ? { ...x, status } : x));
      if (draft && draft.id === t.id) setDraft(d => ({ ...d, status }));
    } catch (e) {
      console.error('Error updating status', e);
    }
  };

  const sections = useMemo(() => {
    const map = {};
    (tables || []).forEach(t => {
      const s = t.section || 'Main';
      if (!map[s]) map[s] = [];
      map[s].push(t);
    });
    return map;
  }, [tables]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Grid3x3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Table Mapping</h1>
              <p className="text-sm text-gray-500">Design your floor plan and manage table status</p>
            </div>
          </div>
          <Button onClick={startAdd} disabled={loading || !merchantId}>
            <Plus className="w-4 h-4 mr-2" /> Add Table
          </Button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs">
          {STATUSES.map(s => (
            <div key={s} className={`px-2 py-1 rounded-md border capitalize ${STATUS_COLORS[s]}`}>{s}</div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Floor plan */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Floor Plan</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
              ) : !merchantId ? (
                <p className="text-center text-gray-500 py-16">Sign in to manage your tables.</p>
              ) : tables.length === 0 ? (
                <div className="text-center text-gray-400 py-16">
                  <Grid3x3 className="w-10 h-10 mx-auto mb-3" />
                  <p>No tables yet. Click "Add Table" to start your floor plan.</p>
                </div>
              ) : (
                <div
                  className="grid gap-2 p-3 bg-gray-100 rounded-lg border border-gray-200"
                  style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`, gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`, minHeight: 420 }}
                >
                  {tables.map(t => (
                    <button
                      key={t.id}
                      onClick={() => startEdit(t)}
                      className={`relative flex flex-col items-center justify-center border-2 rounded-lg p-1 transition-all hover:scale-105 hover:shadow-md ${STATUS_COLORS[t.status] || STATUS_COLORS.available} ${selected === t.id ? 'ring-2 ring-indigo-500' : ''}`}
                      style={{
                        gridColumn: `${(t.x || 0) + 1} / span ${t.width || 1}`,
                        gridRow: `${(t.y || 0) + 1} / span ${t.height || 1}`,
                        borderRadius: t.shape === 'round' ? '9999px' : t.shape === 'rectangle' ? '8px' : '12px'
                      }}
                      title={t.section ? `${t.section} · ${t.status}` : t.status}
                    >
                      <span className="font-bold text-sm leading-tight">{t.name}</span>
                      <span className="flex items-center gap-0.5 text-[10px] opacity-80">
                        <Users className="w-2.5 h-2.5" />{t.capacity}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Side panel */}
          <Card className="h-fit">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{draft?.id ? 'Edit Table' : 'New Table'}</CardTitle>
            </CardHeader>
            <CardContent>
              {!draft ? (
                <p className="text-sm text-gray-500 text-center py-8">Select a table on the floor plan to edit, or click "Add Table".</p>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Table #</Label>
                      <Input value={draft.table_number || ''} onChange={e => setDraft({ ...draft, table_number: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Capacity</Label>
                      <Input type="number" min={1} value={draft.capacity} onChange={e => setDraft({ ...draft, capacity: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Section</Label>
                      <Input value={draft.section || ''} onChange={e => setDraft({ ...draft, section: e.target.value })} placeholder="Main" />
                    </div>
                    <div>
                      <Label className="text-xs">Shape</Label>
                      <Select value={draft.shape} onValueChange={v => setDraft({ ...draft, shape: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{SHAPES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <Label className="text-xs">Col</Label>
                      <Input type="number" min={0} max={GRID_COLS - 1} value={draft.x} onChange={e => setDraft({ ...draft, x: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Row</Label>
                      <Input type="number" min={0} max={GRID_ROWS - 1} value={draft.y} onChange={e => setDraft({ ...draft, y: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">W</Label>
                      <Input type="number" min={1} max={GRID_COLS} value={draft.width} onChange={e => setDraft({ ...draft, width: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">H</Label>
                      <Input type="number" min={1} max={GRID_ROWS} value={draft.height} onChange={e => setDraft({ ...draft, height: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Status</Label>
                    <Select value={draft.status} onValueChange={v => setDraft({ ...draft, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button onClick={saveDraft} disabled={saving} className="flex-1">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" />Save</>}
                    </Button>
                    {draft.id && (
                      <Button variant="destructive" onClick={() => removeTable(draft)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="outline" onClick={closeDraft}><X className="w-4 h-4" /></Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick status toggles */}
        {tables.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Quick Status</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {tables.map(t => (
                  <div key={t.id} className="flex items-center justify-between gap-2 p-2 rounded-lg border bg-white">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{t.name}</div>
                      <div className="text-xs text-gray-500">{t.section || 'Main'} · seats {t.capacity}</div>
                    </div>
                    <Select value={t.status} onValueChange={v => setStatus(t, v)}>
                      <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}