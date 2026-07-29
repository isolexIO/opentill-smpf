import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Building2, Loader2, CheckCircle2 } from 'lucide-react';

export default function PortalProfile({ merchantId }) {
  const [merchant, setMerchant] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!merchantId) return;
    (async () => {
      try {
        const list = await base44.entities.Merchant.filter({ id: merchantId });
        if (list && list[0]) {
          const m = list[0];
          setMerchant(m);
          setForm({
            business_name: m.business_name || '',
            display_name: m.display_name || '',
            owner_name: m.owner_name || '',
            owner_email: m.owner_email || '',
            phone: m.phone || '',
            address: m.address || '',
            tax_id: m.tax_id || '',
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
      setSaved(true);
      toast({ title: 'Profile saved', description: 'Your business details have been updated.' });
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      toast({ title: 'Save failed', description: e.message || String(e), variant: 'destructive' });
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

  const field = (name, label, opts = {}) => (
    <div className={opts.className}>
      <Label className="text-xs text-gray-500">{label}</Label>
      <Input
        value={form[name] || ''}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        type={opts.type || 'text'}
      />
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" /> Business Profile
          </span>
          <Badge className="capitalize bg-gray-100 text-gray-700">{merchant.status}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {field('business_name', 'Business Name')}
        {field('display_name', 'Display Name (optional)')}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {field('owner_name', 'Owner Name')}
          {field('owner_email', 'Owner Email', { type: 'email' })}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {field('phone', 'Phone')}
          {field('tax_id', 'Tax ID')}
        </div>
        {field('address', 'Address')}
        <div className="flex items-center justify-end pt-1">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              'Saving…'
            ) : saved ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-1" /> Saved
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}