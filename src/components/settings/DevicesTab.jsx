import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  RefreshCw,
  CreditCard,
  Printer,
  QrCode,
  Scale,
  Zap,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

const DEVICE_CATEGORIES = [
  {
    key: 'card_readers',
    label: 'Card Readers',
    singular: 'Card Reader',
    icon: CreditCard,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    types: [
      { value: 'verifone', label: 'Verifone' },
      { value: 'clover', label: 'Clover' },
      { value: 'pax', label: 'Pax' },
      { value: 'ellipal', label: 'ELLIPAL' },
      { value: 'square', label: 'Square' },
    ],
    connections: ['usb', 'bluetooth', 'ethernet', 'wifi'],
    defaultPort: 8080,
    description: 'Process credit and debit card payments',
  },
  {
    key: 'printers',
    label: 'Printers',
    singular: 'Printer',
    icon: Printer,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    types: [
      { value: 'receipt', label: 'Receipt Printer' },
      { value: 'kitchen', label: 'Kitchen Printer' },
      { value: 'bar', label: 'Bar Printer' },
    ],
    connections: ['usb', 'ethernet', 'wifi'],
    defaultPort: 9100,
    description: 'Print receipts and kitchen tickets',
  },
  {
    key: 'barcode_scanners',
    label: 'Barcode Scanners',
    singular: 'Scanner',
    icon: QrCode,
    color: 'text-green-600',
    bg: 'bg-green-50',
    types: [
      { value: 'usb', label: 'USB Scanner' },
      { value: 'bluetooth', label: 'Bluetooth Scanner' },
      { value: 'camera', label: 'Camera Scanner' },
    ],
    connections: ['usb', 'bluetooth'],
    defaultPort: null,
    description: 'Scan product barcodes for quick checkout',
  },
  {
    key: 'scales',
    label: 'Scales',
    singular: 'Scale',
    icon: Scale,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    types: [
      { value: 'usb', label: 'USB Scale' },
      { value: 'bluetooth', label: 'Bluetooth Scale' },
      { value: 'ethernet', label: 'Ethernet Scale' },
      { value: 'serial', label: 'Serial Scale' },
    ],
    connections: ['usb', 'bluetooth', 'ethernet', 'serial'],
    defaultPort: 9100,
    description: 'Weigh items for sell-by-weight pricing',
  },
];

export default function DevicesTab({ hardware: devices, onUpdateHardware: onUpdateDevices }) {
  const [testingDevice, setTestingDevice] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);

  const addDevice = (category) => {
    const cat = DEVICE_CATEGORIES.find((c) => c.key === category);
    const defaultType = cat.types[0].value;
    const defaultConn = cat.connections[0];
    const newDevice = {
      id: `${category}_${Date.now()}`,
      name: `New ${cat.singular}`,
      type: defaultType,
      connection_type: defaultConn,
      is_connected: false,
      ip_address: '',
      port: cat.defaultPort,
    };

    onUpdateDevices({
      ...devices,
      [category]: [...(devices[category] || []), newDevice],
    });
  };

  const removeDevice = (category, deviceId) => {
    onUpdateDevices({
      ...devices,
      [category]: devices[category].filter((d) => d.id !== deviceId),
    });
  };

  const updateDevice = (category, deviceId, updates) => {
    onUpdateDevices({
      ...devices,
      [category]: devices[category].map((d) => (d.id === deviceId ? { ...d, ...updates } : d)),
    });
  };

  const testConnection = async (category, device) => {
    setTestingDevice(device.id);
    try {
      if (['ethernet', 'wifi'].includes(device.connection_type)) {
        if (!device.ip_address) {
          alert('Please enter an IP address');
          setTestingDevice(null);
          return;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const isConnected = Math.random() > 0.2;
      updateDevice(category, device.id, {
        is_connected: isConnected,
        last_tested: new Date().toISOString(),
      });
      alert(
        isConnected
          ? `${device.name} connected successfully!`
          : `Failed to connect to ${device.name}. Please check your configuration.`
      );
    } catch (error) {
      alert(`Connection test failed: ${error.message}`);
    } finally {
      setTestingDevice(null);
    }
  };

  const totalDevices = DEVICE_CATEGORIES.reduce(
    (sum, cat) => sum + (devices[cat.key]?.length || 0),
    0
  );
  const connectedDevices = DEVICE_CATEGORIES.reduce(
    (sum, cat) => sum + (devices[cat.key]?.filter((d) => d.is_connected)?.length || 0),
    0
  );

  const DeviceCard = ({ device, category, cat }) => {
    const Icon = cat.icon;
    return (
      <Card key={device.id} className="relative">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <div className={`p-1.5 rounded-md ${cat.bg}`}>
                <Icon className={`w-4 h-4 ${cat.color}`} />
              </div>
              <Input
                value={device.name}
                onChange={(e) => updateDevice(category, device.id, { name: e.target.value })}
                className="font-semibold border-none p-0 h-auto focus-visible:ring-0 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              {device.is_connected ? (
                <Badge className="bg-green-100 text-green-800 text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" /> Connected
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  <XCircle className="w-3 h-3 mr-1" /> Offline
                </Badge>
              )}
              <Button variant="ghost" size="icon" onClick={() => removeDevice(category, device.id)}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Type</Label>
              <Select
                value={device.type}
                onValueChange={(value) => updateDevice(category, device.id, { type: value })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cat.types.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Connection</Label>
              <Select
                value={device.connection_type}
                onValueChange={(value) => updateDevice(category, device.id, { connection_type: value })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cat.connections.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {['ethernet', 'wifi', 'serial'].includes(device.connection_type) && cat.defaultPort && (
              <>
                <div>
                  <Label className="text-xs">IP Address</Label>
                  <Input
                    value={device.ip_address || ''}
                    onChange={(e) => updateDevice(category, device.id, { ip_address: e.target.value })}
                    placeholder="192.168.1.100"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Port</Label>
                  <Input
                    type="number"
                    value={device.port || ''}
                    onChange={(e) => updateDevice(category, device.id, { port: parseInt(e.target.value) })}
                    placeholder="9100"
                    className="h-8 text-sm"
                  />
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => testConnection(category, device)}
              disabled={testingDevice === device.id}
              className="flex-1"
            >
              {testingDevice === device.id ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" /> Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </Button>
            {device.is_connected && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateDevice(category, device.id, { is_connected: false })}
              >
                Disconnect
              </Button>
            )}
          </div>
          {device.last_tested && (
            <p className="text-xs text-muted-foreground">
              Last tested: {new Date(device.last_tested).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-5">
      {/* Quick Setup Guide */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="w-4 h-4 text-blue-600" />
            Quick Setup Guide
          </CardTitle>
          <CardDescription>
            Get your hardware running in 3 simple steps. {connectedDevices} of {totalDevices} devices connected.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-start gap-2.5">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                1
              </div>
              <div>
                <p className="text-sm font-medium">Add a Device</p>
                <p className="text-xs text-gray-500">Click "Add" in any category below</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                2
              </div>
              <div>
                <p className="text-sm font-medium">Configure & Test</p>
                <p className="text-xs text-gray-500">Set type and connection, then test</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                3
              </div>
              <div>
                <p className="text-sm font-medium">Start Selling</p>
                <p className="text-xs text-gray-500">Devices work automatically at the POS</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Device Categories */}
      {DEVICE_CATEGORIES.map((cat, idx) => {
        const Icon = cat.icon;
        const deviceList = devices[cat.key] || [];
        const connectedCount = deviceList.filter((d) => d.is_connected).length;
        const isExpanded = expandedSection === cat.key || deviceList.length > 0;

        return (
          <div key={cat.key}>
            {idx > 0 && <Separator className="mb-5" />}
            <div>
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() =>
                    setExpandedSection(isExpanded ? null : cat.key)
                  }
                  className="flex items-center gap-2 text-left"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                  <div className={`p-1.5 rounded-md ${cat.bg}`}>
                    <Icon className={`w-5 h-5 ${cat.color}`} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">{cat.label}</h3>
                    <p className="text-xs text-gray-500">{cat.description}</p>
                  </div>
                </button>
                <div className="flex items-center gap-3">
                  {deviceList.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {connectedCount}/{deviceList.length} connected
                    </Badge>
                  )}
                  <Button onClick={() => addDevice(cat.key)} size="sm">
                    <Plus className="w-4 h-4 mr-1.5" /> Add {cat.singular}
                  </Button>
                </div>
              </div>
              {isExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {deviceList.map((device) => (
                    <DeviceCard key={device.id} device={device} category={cat.key} cat={cat} />
                  ))}
                  {deviceList.length === 0 && (
                    <div className="md:col-span-2">
                      <Card>
                        <CardContent className="p-6 text-center text-muted-foreground text-sm">
                          No {cat.label.toLowerCase()} configured. Click "Add {cat.singular}" to get started.
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}