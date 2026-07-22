import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, MapPin, Cpu, Plus, RefreshCw, CheckCircle, AlertCircle, CreditCard } from 'lucide-react';
import BluetoothReaderPairing from '@/components/settings/BluetoothReaderPairing';

export default function StripeTerminalCard() {
  const { toast } = useToast();
  const [merchantId, setMerchantId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [status, setStatus] = useState(null); // { account_id, location_id, location, readers }
  const [error, setError] = useState(null);
  const [newReader, setNewReader] = useState({ label: '', registration_code: '', reader_type: 'verifone_p400' });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await base44.auth.me();
        if (me?.merchant_id) {
          setMerchantId(me.merchant_id);
          await loadStatus(me.merchant_id, mounted);
        } else {
          setLoading(false);
          setError('No merchant account linked to your user.');
        }
      } catch (e) {
        if (mounted) setError('Sign in to manage your Stripe Terminal.');
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const loadStatus = async (mid, mounted = true) => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('setupStripeTerminal', { merchant_id: mid });
      if (mounted) setStatus(res.data);
    } catch (e) {
      if (mounted) setError(e.response?.data?.error || e.message || 'Failed to load terminal status.');
    } finally {
      if (mounted) setLoading(false);
    }
  };

  const handleProvision = async () => {
    if (!merchantId) return;
    setProvisioning(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('setupStripeTerminal', { merchant_id: merchantId });
      setStatus(res.data);
      toast({ title: 'Terminal location ready', description: `Location ${res.data.location_id} provisioned.` });
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed to provision terminal location.');
    } finally {
      setProvisioning(false);
    }
  };

  const handleRegister = async () => {
    if (!merchantId) return;
    setRegistering(true);
    try {
      await base44.functions.invoke('registerStripeReader', {
        merchant_id: merchantId,
        label: newReader.label || undefined,
        registration_code: newReader.registration_code || undefined,
        reader_type: newReader.reader_type,
      });
      toast({ title: 'Reader registered', description: 'The reader has been registered to your location.' });
      setNewReader({ label: '', registration_code: '', reader_type: 'verifone_p400' });
      await loadStatus(merchantId);
    } catch (e) {
      toast({ title: 'Registration failed', description: e.response?.data?.error || e.message, variant: 'destructive' });
    } finally {
      setRegistering(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-600" />
              Stripe Terminal
            </CardTitle>
            <CardDescription>
              Auto-provision a Terminal location and register card readers to it. Payments route to your connected Stripe account.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => merchantId && loadStatus(merchantId)} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading terminal status...
          </div>
        )}

        {error && !loading && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {status && !loading && (
          <>
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
              <CreditCard className="w-5 h-5 text-indigo-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Connected account</p>
                <p className="text-gray-500 font-mono text-xs">{status.account_id}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <MapPin className="w-5 h-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">Terminal Location</p>
                {status.location ? (
                  <>
                    <p className="text-gray-500 font-mono text-xs">{status.location_id}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {status.location.display_name} · {status.location.address?.city}, {status.location.address?.state}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-amber-600 mt-1">No location provisioned yet.</p>
                )}
              </div>
              <Button size="sm" onClick={handleProvision} disabled={provisioning}>
                {provisioning ? <Loader2 className="w-4 h-4 animate-spin" /> : status.location ? 'Re-provision' : 'Provision'}
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">Registered Readers ({status.readers?.length || 0})</p>
              {status.readers && status.readers.length > 0 ? (
                <div className="space-y-2">
                  {status.readers.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{r.label || r.id}</p>
                        <p className="text-xs text-gray-500 font-mono">{r.id} · {r.device_type || r.type}</p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100">{r.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">No readers registered yet.</p>
              )}
            </div>

            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-semibold">Register an Internet-Connected Reader</p>
              <p className="text-xs text-gray-500">
                For Stripe M2 / Verifone P400 / Smart POS terminals. Bluetooth readers (B250M, WisePad 3) pair via the POS using the location above.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="r-label">Reader Label (optional)</Label>
                  <Input id="r-label" value={newReader.label}
                    onChange={(e) => setNewReader((r) => ({ ...r, label: e.target.value }))}
                    placeholder="Front Counter" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="r-code">Registration Code (optional)</Label>
                  <Input id="r-code" value={newReader.registration_code}
                    onChange={(e) => setNewReader((r) => ({ ...r, registration_code: e.target.value }))}
                    placeholder="From reader screen" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-type">Reader Type</Label>
                <Select value={newReader.reader_type}
                  onValueChange={(v) => setNewReader((r) => ({ ...r, reader_type: v }))}>
                  <SelectTrigger id="r-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="verifone_p400">Verifone P400</SelectItem>
                    <SelectItem value="bbpos_wisepad3s">WisePad 3 (LAN)</SelectItem>
                    <SelectItem value="mobile">Mobile Reader</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleRegister} disabled={registering || !status.location_id} className="w-full">
                {registering ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Register Reader
              </Button>
            </div>

            {status.location_id && (
              <BluetoothReaderPairing merchantId={merchantId} locationId={status.location_id} />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}