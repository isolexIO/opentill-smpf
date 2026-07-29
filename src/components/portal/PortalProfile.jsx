import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Loader2 } from 'lucide-react';

export default function PortalProfile({ merchantId }) {
  const [merchant, setMerchant] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!merchantId) return;
    (async () => {
      try {
        const list = await base44.entities.Merchant.filter({ id: merchantId });
        if (list && list[0]) {
          setMerchant(list[0]);
          setForm({
            business_name: list[0].business_name || '',
            phone: list[0].phone || '',
            address: list[0].address || '',
            tax_id: list[0].tax_id || '',
          });
        }
      } catch (e) {
        console.error('PortalProfile load error', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [merchantId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.Merchant.update(merchant.id, form);
      setMerchant({ ...merchant, ...form });
    } catch (e) {
      alert('Failed to save: ' + (e.message || e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (!merchant) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">Merchant not found.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-600" /> Business Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs text-gray-500">Business Name</Label>
          <Input
            value={form.business_name || ''}
            onChange={(e) => setForm({ ...form, business_name: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-gray-500">Phone</Label>
            <Input
              value={form.phone || ''}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Tax ID</Label>
            <Input
              value={form.tax_id || ''}
              onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
            />
          </div>
        </div>
        <div>
          <Label className="text-xs text-gray-500">Address</Label>
          <Input
            value={form.address || ''}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-gray-500 capitalize">Status: {merchant.status}</span>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}