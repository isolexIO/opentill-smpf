import { useState } from 'react';
import { loadStripeTerminal } from '@stripe/terminal-js/pure';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bluetooth, Loader2, Plus, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Client-side discovery + pairing of Bluetooth Stripe Terminal readers
// (BBPOS B250M, WisePad 3) using a connection token issued for the merchant's
// connected Stripe account. Internet-connected readers are registered via the
// backend (registerStripeReader); this handles the Bluetooth pairing path.
export default function BluetoothReaderPairing({ merchantId, locationId }) {
  const { toast } = useToast();
  const [terminal, setTerminal] = useState(null);
  const [discovering, setDiscovering] = useState(false);
  const [connecting, setConnecting] = useState(null);
  const [readers, setReaders] = useState([]);
  const [error, setError] = useState(null);

  const getTerminal = async () => {
    if (terminal) return terminal;
    const StripeTerminal = await loadStripeTerminal();
    const t = StripeTerminal.create({
      onFetchConnectionToken: async () => {
        const res = await base44.functions.invoke('createTerminalConnectionToken', {
          merchant_id: merchantId,
        });
        if (!res.data?.connection_token) {
          throw new Error('Failed to fetch Terminal connection token.');
        }
        return res.data.connection_token;
      },
      onUnexpectedReaderDisconnect: () => {
        toast({ title: 'Reader disconnected', description: 'A paired reader disconnected.', variant: 'destructive' });
      },
    });
    setTerminal(t);
    return t;
  };

  const handleDiscover = async () => {
    setDiscovering(true);
    setError(null);
    setReaders([]);
    try {
      const t = await getTerminal();
      const result = await t.discoverReaders({ type: 'bluetooth', locationId });
      if (result.error) {
        setError(result.error.message);
      } else {
        const found = result.discoveredReaders || [];
        setReaders(found);
        if (found.length === 0) {
          setError('No Bluetooth readers found. Make sure the reader is powered on and in pairing mode.');
        }
      }
    } catch (e) {
      setError(e.message || 'Discovery failed. Bluetooth pairing requires HTTPS and a supported browser.');
    } finally {
      setDiscovering(false);
    }
  };

  const handleConnect = async (reader) => {
    setConnecting(reader.serialNumber);
    setError(null);
    try {
      const t = await getTerminal();
      const result = await t.connectReader(reader);
      if (result.error) {
        setError(result.error.message);
      } else {
        toast({ title: 'Reader paired', description: `${reader.label || reader.serialNumber} connected.` });
        setReaders([]);
      }
    } catch (e) {
      setError(e.message || 'Connection failed.');
    } finally {
      setConnecting(null);
    }
  };

  return (
    <div className="space-y-3 p-4 border-t">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold flex items-center gap-2">
            <Bluetooth className="w-4 h-4 text-blue-600" /> Pair a Bluetooth Reader
          </p>
          <p className="text-xs text-gray-500">
            For B250M / WisePad 3. Requires HTTPS and a Bluetooth-capable browser.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={handleDiscover} disabled={discovering || !locationId}>
          {discovering ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Bluetooth className="w-4 h-4 mr-1" />}
          Discover
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {readers.length > 0 && (
        <div className="space-y-2">
          {readers.map((r) => (
            <div key={r.serialNumber} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="text-sm font-medium">{r.label || r.serialNumber}</p>
                <p className="text-xs text-gray-500">
                  {r.deviceType || 'Bluetooth reader'} · {r.serialNumber}
                </p>
              </div>
              <Button size="sm" onClick={() => handleConnect(r)} disabled={connecting === r.serialNumber}>
                {connecting === r.serialNumber ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-1" />
                )}
                Pair
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}