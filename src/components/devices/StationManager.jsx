import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  CheckCircle,
  Link2,
  Pencil,
  Utensils,
  MonitorPlay,
  Monitor,
  QrCode,
  X
} from 'lucide-react';
import QRCodeLib from 'qrcode';

const LAYOUT_TYPES = [
  { value: 'counter', label: 'Counter' },
  { value: 'server', label: 'Server' },
  { value: 'bar', label: 'Bar' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'generic', label: 'Generic' },
];

const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export default function StationManager({ merchantId }) {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [stationId, setStationId] = useState('');
  const [layoutType, setLayoutType] = useState('counter');
  const [copied, setCopied] = useState('');
  const [saving, setSaving] = useState(false);
  const [qrKey, setQrKey] = useState('');
  const [qrSrc, setQrSrc] = useState('');

  useEffect(() => {
    if (merchantId) loadStations();
  }, [merchantId]);

  const loadStations = async () => {
    try {
      const list = await base44.entities.Station.filter(
        { merchant_id: merchantId },
        'sort_order',
        200
      );
      setStations(list || []);
    } catch (e) {
      console.error('StationManager: load error', e);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setStationId('');
    setLayoutType('counter');
    setEditing(null);
    setShowForm(false);
  };

  const startAdd = () => {
    setEditing(null);
    setName('');
    setStationId('');
    setLayoutType('counter');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Station name is required');
      return;
    }
    const slug = slugify(stationId || name);
    if (!slug) {
      alert('Station ID could not be generated');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await base44.entities.Station.update(editing.id, {
          name: name.trim(),
          station_id: slug,
          layout_type: layoutType,
        });
      } else {
        const existing = await base44.entities.Station.filter({
          merchant_id: merchantId,
          station_id: slug,
        });
        if (existing && existing.length > 0) {
          alert('A station with that ID already exists');
          setSaving(false);
          return;
        }
        await base44.entities.Station.create({
          merchant_id: merchantId,
          station_id: slug,
          name: name.trim(),
          layout_type: layoutType,
          is_active: true,
          sort_order: stations.length,
        });
      }
      resetForm();
      await loadStations();
    } catch (e) {
      alert('Failed to save station: ' + (e.message || e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s) => {
    if (!confirm(`Delete station "${s.name}"? Display links using this station will stop reusing its session.`)) return;
    try {
      await base44.entities.Station.delete(s.id);
      await loadStations();
    } catch (e) {
      alert('Failed to delete station: ' + (e.message || e));
    }
  };

  const handleEdit = (s) => {
    setEditing(s);
    setName(s.name);
    setStationId(s.station_id);
    setLayoutType(s.layout_type || 'generic');
    setShowForm(true);
  };

  const copyLink = async (url, key) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(key);
      setTimeout(() => setCopied(''), 2000);
    } catch {
      alert('Could not copy link:\n' + url);
    }
  };

  const toggleQr = async (key, url) => {
    if (qrKey === key) {
      setQrKey('');
      setQrSrc('');
      return;
    }
    try {
      const src = await QRCodeLib.toDataURL(url, { width: 160, margin: 1 });
      setQrSrc(src);
      setQrKey(key);
    } catch (e) {
      alert('Could not generate QR code');
    }
  };

  const origin = window.location.origin;
  const linkFor = (s, page) =>
    `${origin}${createPageUrl(page)}?merchant_id=${merchantId}&station_id=${encodeURIComponent(s.station_id)}`;

  const layoutLabel = (v) => LAYOUT_TYPES.find((t) => t.value === v)?.label || v;

  if (!merchantId) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Link2 className="w-5 h-5 text-blue-600" />
              Stations
            </CardTitle>
            <CardDescription>
              Define stations (counter, server, bar, etc.) and copy their persistent Customer / Kitchen Display and POS Terminal links — or scan the QR code to launch one on another device. Orders are routed to a station by its <code>station_id</code>.
            </CardDescription>
          </div>
          {!showForm && (
            <Button size="sm" onClick={startAdd}>
              <Plus className="w-4 h-4 mr-1" />
              Add Station
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">
                {editing ? 'Edit Station' : 'New Station'}
              </span>
              <Button variant="ghost" size="icon" onClick={resetForm} className="h-7 w-7">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Counter 1"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Station ID (slug)</Label>
                <Input
                  value={stationId}
                  onChange={(e) => setStationId(e.target.value)}
                  placeholder="auto from name"
                />
                <p className="text-[11px] text-gray-400">
                  {stationId ? `→ ${slugify(stationId)}` : `→ ${slugify(name) || '—'}`}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Layout / Type</Label>
                <div className="flex flex-wrap gap-1">
                  {LAYOUT_TYPES.map((t) => (
                    <Button
                      key={t.value}
                      size="sm"
                      variant={layoutType === t.value ? 'default' : 'outline'}
                      onClick={() => setLayoutType(t.value)}
                    >
                      {t.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={resetForm}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Station'}
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-500">Loading stations…</p>
        ) : stations.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <Link2 className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No stations yet. Add one to generate display links.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {stations.map((s) => {
              const customerUrl = linkFor(s, 'CustomerDisplay');
              const kitchenUrl = linkFor(s, 'KitchenDisplay');
              const posUrl = linkFor(s, 'POS');
              return (
                <div key={s.id} className="border rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{s.name}</span>
                      <Badge variant="secondary">{layoutLabel(s.layout_type)}</Badge>
                      <span className="text-xs text-gray-400 font-mono">/{s.station_id}</span>
                      {!s.is_active && <Badge className="bg-gray-200 text-gray-600">Inactive</Badge>}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(s)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(s)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  {[
                    { key: `c-${s.id}`, label: 'Customer Display', url: customerUrl, Icon: MonitorPlay },
                    { key: `k-${s.id}`, label: 'Kitchen Display', url: kitchenUrl, Icon: Utensils },
                    { key: `p-${s.id}`, label: 'POS Terminal', url: posUrl, Icon: Monitor },
                  ].map(({ key, label, url, Icon }) => (
                    <div key={key} className="space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <div className="flex items-center gap-2 w-40 shrink-0">
                          <Icon className="w-4 h-4 text-gray-500" />
                          <span className="text-xs font-medium">{label}</span>
                        </div>
                        <div className="flex flex-1 gap-2">
                          <Input readOnly value={url} className="flex-1 font-mono text-xs" />
                          <Button variant="outline" size="sm" onClick={() => copyLink(url, key)}>
                            {copied === key ? (
                              <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4 mr-1" />
                            )}
                            {copied === key ? 'Copied' : 'Copy'}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => window.open(url, '_blank')}>
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => toggleQr(key, url)} title="Show QR code">
                            <QrCode className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {qrKey === key && qrSrc && (
                        <div className="flex justify-center">
                          <img src={qrSrc} alt={`QR code for ${label}`} className="w-32 h-32 border rounded p-1 bg-white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}