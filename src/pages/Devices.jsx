
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Wifi,
  CreditCard,
  Printer,
  QrCode,
  Monitor,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import PermissionGate from '../components/PermissionGate';

const DEVICE_TYPES = {
  card_readers: {
    title: 'Card Readers',
    icon: CreditCard,
    color: 'text-blue-600',
    types: [
      { value: 'verifone', label: 'Verifone' },
      { value: 'clover', label: 'Clover' },
      { value: 'pax', label: 'Pax' },
      { value: 'square', label: 'Square' },
      { value: 'ellipal', label: 'ELLIPAL' }
    ]
  },
  printers: {
    title: 'Printers',
    icon: Printer,
    color: 'text-purple-600',
    types: [
      { value: 'receipt', label: 'Receipt Printer' },
      { value: 'kitchen', label: 'Kitchen Printer' },
      { value: 'bar', label: 'Bar Printer' }
    ]
  },
  barcode_scanners: {
    title: 'Barcode Scanners',
    icon: QrCode,
    color: 'text-green-600',
    types: [
      { value: 'usb', label: 'USB Scanner' },
      { value: 'bluetooth', label: 'Bluetooth Scanner' },
      { value: 'camera', label: 'Camera Scanner' }
    ]
  },
  displays: {
    title: 'Customer Displays',
    icon: Monitor,
    color: 'text-orange-600',
    types: [
      { value: 'wired', label: 'Wired Display' },
      { value: 'wireless', label: 'Wireless Display' }
    ]
  }
};

const CONNECTION_TYPES = [
  { value: 'usb', label: 'USB' },
  { value: 'bluetooth', label: 'Bluetooth' },
  { value: 'ethernet', label: 'Ethernet' },
  { value: 'wifi', label: 'WiFi' }
];

export default function DevicesPage() {
  const [devices, setDevices] = useState({
    card_readers: [],
    printers: [],
    barcode_scanners: [],
    displays: []
  });
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('card_readers');
  const [testingDevice, setTestingDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [newDevice, setNewDevice] = useState({
    name: '',
    type: '',
    connection_type: 'usb',
    ip_address: '',
    port: '',
    is_connected: false
  });

  useEffect(() => {
    loadUserAndDevices();
  }, []);

  const loadUserAndDevices = async () => {
    try {
      setLoading(true);
      const userData = await base44.auth.me();
      setUser(userData);

      if (userData.pos_settings?.hardware_devices) {
        setDevices(userData.pos_settings.hardware_devices);
      }
      if (userData.pos_settings) {
        setSettings(userData.pos_settings);
      }
    } catch (error) {
      console.error('Error loading devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveDevices = async (updatedDevices) => {
    try {
      const updatedSettings = {
        ...settings,
        hardware_devices: updatedDevices
      };

      await base44.auth.updateMe({
        pos_settings: updatedSettings
      });

      setDevices(updatedDevices);
      setSettings(updatedSettings);
    } catch (error) {
      console.error('Error saving devices:', error);
      alert('Failed to save device configuration');
    }
  };

  const handleAddDevice = async () => {
    if (!newDevice.name.trim() || !newDevice.type) {
      alert('Please fill in all required fields');
      return;
    }

    const device = {
      id: `${selectedCategory}_${Date.now()}`,
      name: newDevice.name,
      type: newDevice.type,
      connection_type: newDevice.connection_type,
      ip_address: newDevice.ip_address || '',
      port: newDevice.port || '',
      is_connected: false,
      last_tested: null
    };

    const updatedDevices = {
      ...devices,
      [selectedCategory]: [...(devices[selectedCategory] || []), device]
    };

    await saveDevices(updatedDevices);
    setShowAddDialog(false);
    setNewDevice({
      name: '',
      type: '',
      connection_type: 'usb',
      ip_address: '',
      port: '',
      is_connected: false
    });
  };

  const handleRemoveDevice = async (category, deviceId) => {
    if (!confirm('Are you sure you want to remove this device?')) return;

    const updatedDevices = {
      ...devices,
      [category]: devices[category].filter(d => d.id !== deviceId)
    };

    await saveDevices(updatedDevices);
  };

  const handleUpdateDevice = async (category, deviceId, updates) => {
    const updatedDevices = {
      ...devices,
      [category]: devices[category].map(d =>
        d.id === deviceId ? { ...d, ...updates } : d
      )
    };

    await saveDevices(updatedDevices);
  };

  const handleTestConnection = async (category, device) => {
    setTestingDevice(device.id);

    // Simulate testing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if device has proper configuration
    const needsNetwork = ['ethernet', 'wifi'].includes(device.connection_type);
    const isConfigured = !needsNetwork || (device.ip_address && device.port);

    if (!isConfigured) {
      alert('Please configure IP address and port for network devices');
      setTestingDevice(null);
      return;
    }

    // Update device as connected
    await handleUpdateDevice(category, device.id, {
      is_connected: true,
      last_tested: new Date().toISOString()
    });

    setTestingDevice(null);
  };

  const handleDisconnect = async (category, deviceId) => {
    await handleUpdateDevice(category, deviceId, {
      is_connected: false
    });
  };

  const DeviceCard = ({ device, category }) => {
    const deviceConfig = DEVICE_TYPES[category];
    const Icon = deviceConfig.icon;

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className={`w-5 h-5 ${deviceConfig.color}`} />
              <Input
                value={device.name}
                onChange={(e) => handleUpdateDevice(category, device.id, { name: e.target.value })}
                className="font-semibold border-none p-0 h-auto focus-visible:ring-0"
              />
            </div>
            <div className="flex items-center gap-2">
              {device.is_connected ? (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle className="w-3 h-3 mr-1" />
                  No Device Connected
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveDevice(category, device.id)}
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Device Type</Label>
              <Select
                value={device.type}
                onValueChange={(v) => handleUpdateDevice(category, device.id, { type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(deviceConfig.types || []).map((type) => ( // Fix: Added || []
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Connection Type</Label>
              <Select
                value={device.connection_type}
                onValueChange={(v) => handleUpdateDevice(category, device.id, { connection_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONNECTION_TYPES.map((conn) => (
                    <SelectItem key={conn.value} value={conn.value}>
                      {conn.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {['ethernet', 'wifi'].includes(device.connection_type) && (
              <>
                <div>
                  <Label>IP Address</Label>
                  <Input
                    placeholder="192.168.1.100"
                    value={device.ip_address || ''}
                    onChange={(e) => handleUpdateDevice(category, device.id, { ip_address: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Port</Label>
                  <Input
                    type="number"
                    placeholder="9100"
                    value={device.port || ''}
                    onChange={(e) => handleUpdateDevice(category, device.id, { port: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleTestConnection(category, device)}
              disabled={testingDevice === device.id}
              className="flex-1"
            >
              {testingDevice === device.id ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </Button>
            {device.is_connected && (
              <Button
                variant="outline"
                onClick={() => handleDisconnect(category, device.id)}
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <PermissionGate permission="configure_devices">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <Wifi className="w-8 h-8 text-cyan-600" />
                  Device Management
                </h1>
                <p className="text-gray-500 mt-1">Configure and manage your POS hardware</p>
              </div>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Device
              </Button>
            </div>
          </div>

          {/* Device Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {Object.entries(DEVICE_TYPES).map(([key, config]) => {
              const Icon = config.icon;
              const deviceList = devices[key] || [];
              const connectedCount = deviceList.filter(d => d.is_connected).length;

              return (
                <Card key={key}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">{config.title}</p>
                        <p className="text-2xl font-bold">{deviceList.length}</p>
                        <p className="text-xs text-green-600">{connectedCount} connected</p>
                      </div>
                      <Icon className={`w-8 h-8 ${config.color}`} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Devices by Category */}
          <Tabs defaultValue="card_readers" className="space-y-6">
            <TabsList className="grid grid-cols-4 w-full">
              {Object.entries(DEVICE_TYPES).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{config.title}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {Object.entries(DEVICE_TYPES).map(([key, config]) => (
              <TabsContent key={key} value={key}>
                <div className="space-y-4">
                  {devices[key]?.length === 0 ? (
                    <Card>
                      <CardContent className="p-12 text-center text-gray-500">
                        <config.icon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="font-medium">No {config.title} configured</p>
                        <p className="text-sm mt-2">Click "Add Device" to get started</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {(devices[key] || []).map((device) => ( // Fix: Added || []
                        <DeviceCard key={device.id} device={device} category={key} />
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>

          {/* Setup Instructions */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                Device Setup Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="prose max-w-none">
              <h3>Card Readers</h3>
              <ul>
                <li><strong>USB:</strong> Plug in the device and select "Test Connection"</li>
                <li><strong>Network:</strong> Enter the IP address and port (usually 8080 or 9100)</li>
                <li><strong>Bluetooth:</strong> Pair with your computer first, then connect here</li>
              </ul>

              <h3>Printers</h3>
              <ul>
                <li><strong>Receipt Printers:</strong> Use for customer receipts (default port: 9100)</li>
                <li><strong>Kitchen Printers:</strong> Automatically print orders to kitchen</li>
                <li><strong>Bar Printers:</strong> Print drink orders to bar staff</li>
              </ul>

              <h3>Barcode Scanners</h3>
              <ul>
                <li><strong>USB:</strong> Works automatically once connected</li>
                <li><strong>Camera:</strong> Uses your device's camera to scan barcodes</li>
                <li><strong>Bluetooth:</strong> Wireless scanning for mobility</li>
              </ul>

              <h3>Customer Displays</h3>
              <ul>
                <li><strong>Wired:</strong> HDMI/VGA connection to show order totals</li>
                <li><strong>Wireless:</strong> WiFi-enabled display for flexible placement</li>
              </ul>

              <p className="text-sm text-gray-500 mt-4">
                <strong>Need help?</strong> Contact support if you're having trouble connecting devices.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Device Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Device</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Device Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DEVICE_TYPES).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Device Name *</Label>
              <Input
                placeholder="e.g., Front Counter Card Reader"
                value={newDevice.name}
                onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
              />
            </div>

            <div>
              <Label>Device Type *</Label>
              <Select
                value={newDevice.type}
                onValueChange={(v) => setNewDevice({ ...newDevice, type: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {(DEVICE_TYPES[selectedCategory]?.types || []).map((type) => ( // Fix: Added || []
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Connection Type</Label>
              <Select
                value={newDevice.connection_type}
                onValueChange={(v) => setNewDevice({ ...newDevice, connection_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONNECTION_TYPES.map((conn) => (
                    <SelectItem key={conn.value} value={conn.value}>
                      {conn.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {['ethernet', 'wifi'].includes(newDevice.connection_type) && (
              <>
                <div>
                  <Label>IP Address</Label>
                  <Input
                    placeholder="192.168.1.100"
                    value={newDevice.ip_address}
                    onChange={(e) => setNewDevice({ ...newDevice, ip_address: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Port</Label>
                  <Input
                    type="number"
                    placeholder="9100"
                    value={newDevice.port}
                    onChange={(e) => setNewDevice({ ...newDevice, port: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddDevice}>
              Add Device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PermissionGate>
  );
}
