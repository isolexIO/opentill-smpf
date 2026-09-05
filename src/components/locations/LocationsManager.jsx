import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Pencil, Trash2, MapPin, Store, Loader2, Star } from 'lucide-react';

const EMPTY = {
  name: '',
  catalog_mode: 'shared',
  address: '',
  phone: '',
  is_active: true,
  is_default: false,
  sort_order: 0,
};

export default function LocationsManager({ merchant }) {
  const { toast } = useToast();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // location object or {} for new
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!merchant?.id) return;
    try {
      setLoading(true);
      const list = await base44.entities.Location.filter({ merchant_id: merchant.id }, 'sort_order', 200);
      setLocations(list || []);
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to load locations: ' + e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [merchant?.id]);

  const openNew = () => { setEditing({ ...EMPTY }); setShowDialog(true); };
  const openEdit = (loc) => { setEditing({ ...loc }); setShowDialog(true); };

  const geocodeAddress = async (address) => {
    if (!address?.trim()) return null;
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) return null;
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
        return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
      }
    } catch (e) {
      console.warn('Geocode failed', e);
    }
    return null;
  };

  const handleSave = async () => {
    if (!editing.name?.trim()) {
      toast({ title: 'Name required', description: 'Please enter a location name.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      // Geocode the full street address to lat/lng for GPS-based auto-selection
      const coords = await geocodeAddress(editing.address);
      const payload = {
        merchant_id: merchant.id,
        dealer_id: merchant.dealer_id || null,
        name: editing.name.trim(),
        catalog_mode: editing.catalog_mode || 'shared',
        address: editing.address || '',
        phone: editing.phone || '',
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
        is_active: editing.is_active !== false,
        is_default: !!editing.is_default,
        sort_order: Number(editing.sort_order) || 0,
      };

      if (editing.id) {
        await base44.entities.Location.update(editing.id, payload);
      } else {
        await base44.entities.Location.create(payload);
      }

      // If marking default, unset other defaults
      if (payload.is_default) {
        await base44.entities.Location.updateMany(
          { merchant_id: merchant.id, is_default: true },
          { $set: { is_default: false } }
        ).catch(() => {});
      }

      toast({ title: 'Saved', description: `Location "${payload.name}" saved.` });
      setShowDialog(false);
      await load();
    } catch (e) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (loc) => {
    if (!confirm(`Delete location "${loc.name}"? Orders and stations tagged to it are retained but unlinked.`)) return;
    try {
      await base44.entities.Location.delete(loc.id);
      toast({ title: 'Deleted', description: `Location "${loc.name}" removed.` });
      await load();
    } catch (e) {
      toast({ title: 'Delete failed', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Store className="w-5 h-5" /> Locations
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage multiple store locations. Each location can share your product catalog or have its own.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" /> Add Location
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : locations.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-gray-500">
            <MapPin className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p>No locations yet. You're operating in single-location (shared) mode.</p>
            <p className="text-xs mt-1">Add a location to enable multi-store support.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {locations.map((loc) => (
            <Card key={loc.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">{loc.name}</h3>
                    {loc.is_default && (
                      <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        <Star className="w-3 h-3" /> Default
                      </span>
                    )}
                    {!loc.is_active && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {loc.catalog_mode === 'shared' ? 'Shared catalog' : 'Standalone catalog'}
                    {loc.address ? ` · ${loc.address}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(loc)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(loc)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit Location' : 'Add Location'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4 py-2">
              <div>
                <Label>Location Name</Label>
                <Input
                  value={editing.name || ''}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="e.g. Downtown, Store #2"
                />
              </div>
              <div>
                <Label>Catalog Mode</Label>
                <Select
                  value={editing.catalog_mode || 'shared'}
                  onValueChange={(v) => setEditing({ ...editing, catalog_mode: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shared">Shared — use merchant's product catalog</SelectItem>
                    <SelectItem value="standalone">Standalone — own product catalog</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  {editing.catalog_mode === 'standalone'
                    ? 'Products you tag to this location will only appear here.'
                    : 'All merchant products appear at this location.'}
                </p>
              </div>
              <div>
                <Label>Address</Label>
                <Input
                  value={editing.address || ''}
                  onChange={(e) => setEditing({ ...editing, address: e.target.value })}
                  placeholder="123 Main St, Toledo, OH"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the full street address — it's geocoded to GPS coordinates so the POS can auto-select this location when you're on-site.
                </p>
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={editing.phone || ''}
                  onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                  placeholder="+1 (419) 555-0100"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Set as default location</Label>
                  <p className="text-xs text-gray-500">Used when no location is selected</p>
                </div>
                <Switch
                  checked={!!editing.is_default}
                  onCheckedChange={(c) => setEditing({ ...editing, is_default: c })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Active</Label>
                  <p className="text-xs text-gray-500">Inactive locations are hidden from the switcher</p>
                </div>
                <Switch
                  checked={editing.is_active !== false}
                  onCheckedChange={(c) => setEditing({ ...editing, is_active: c })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}