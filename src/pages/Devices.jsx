import React, { useState, useEffect } from 'react';
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
      { value: 'pax', label: 'PAX Terminal' },
      { value: 'stripe_reader', label: 'Stripe Reader M2/S700' },
      { value: 'pax_a35', label: 'PAX A35' }
    ]
  },
  printers: {
    title: 'Receipt Printers',
    icon: Printer,
    color: 'text-emerald-600',
    types: [
      { value: 'epson', label: 'Epson POS Printer' },
      { value: 'star', label: 'Star Micronics' },
      { value: 'network_printer', label: 'Network Thermal Printer' }
    ]
  },
  workstations: {
    title: 'Workstations & Terminals',
    icon: Monitor,
    color: 'text-purple-600',
    types: [
      { value: 'pos_terminal', label: 'Primary POS Terminal' },
      { value: 'kitchen_display', label: 'Kitchen Display (KDS)' },
      { value: 'customer_display', label: 'Customer Facing Display' }
    ]
  }
};

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [merchant, setMerchant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [generatedLink, setGeneratedLink] = useState('');

  // Form State
  const [deviceName, setDeviceName] = useState('');
  const [deviceType, setDeviceType] = useState('card_readers');
  const [subType, setSubType] = useState('stripe_reader');
  const [ipAddress, setIpAddress] = useState('');
  const [serialNumber, setSerialNumber] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const user = await base44.auth.me();
      if (user) {
        // Fetch Merchant context safely
        const merchantList = await base44.entities.Merchant.filter({ owner_id: user.id });
        if (merchantList && merchantList.length > 0) {
          setMerchant(merchantList[0]);
          fetchDevices(merchantList[0].id);
        } else {
          // Fallback check for service role / staff association
          const allMerchants = await base44.entities.Merchant.list();
          if (allMerchants && allMerchants.length > 0) {
            setMerchant(allMerchants[0]);
            fetchDevices(allMerchants[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Error loading devices page data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDevices = async (merchantId) => {
    if (!merchantId) return;
    try {
      const deviceList = await base44.entities.Device.filter({ merchant_id: merchantId });
      setDevices(deviceList || []);
    } catch (err) {
      console.error('Failed to fetch devices:', err);
    }
  };

  const handleAddDevice = async (e) => {
    e.preventDefault();
    if (!merchant?.id) {
      alert('Cannot add device: No active merchant context found.');
      return;
    }

    try {
      const newDevice = await base44.entities.Device.create({
        merchant_id: merchant.id,
        name: deviceName,
        category: deviceType,
        device_type: subType,
        ip_address: ipAddress || null,
        serial_number: serialNumber || null,
        status: 'online',
        created_at: new Date().toISOString()
      });

      setDevices([...devices, newDevice]);
      setIsAddDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error('Error adding device:', err);
      alert('Failed to register device.');
    }
  };

  const handleDeleteDevice = async (deviceId) => {
    if (!confirm('Are you sure you want to remove this device?')) return;
    try {
      await base44.entities.Device.delete(deviceId);
      setDevices(devices.filter(d => d.id !== deviceId));
    } catch (err) {
      console.error('Failed to delete device:', err);
    }
  };

  const resetForm = () => {
    setDeviceName('');
    setDeviceType('card_readers');
    setSubType('stripe_reader');
    setIpAddress('');
    setSerialNumber('');
  };

  // Safe Workstation Link Generator
  const handleGenerateWorkstationLink = (device) => {
    // Determine standard active Merchant ID, fallback to custom merchant fields if primary ID is absent
    const resolvedMerchantId = merchant?.id || merchant?.merchant_id || merchant?.stripe_account_id;

    if (!resolvedMerchantId) {
      alert('Error: Merchant ID is missing or incomplete. Unable to generate link.');
      return;
    }

    setSelectedDevice(device);
    
    // Construct URL with explicit parameter fallbacks to ensure workstation parsers locate it
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/Workstation?merchant_id=${encodeURIComponent(resolvedMerchantId)}&device_id=${encodeURIComponent(device.id)}&merchantId=${encodeURIComponent(resolvedMerchantId)}`;
    
    setGeneratedLink(link);
    setIsLinkDialogOpen(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    alert('Workstation link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <PermissionGate permission="manage_devices">
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Hardware & Workstations</h1>
            <p className="text-sm text-muted-foreground">
              Manage payment terminals, printers, and workstation links for your store.
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" /> Add Hardware Device
          </Button>
        </div>

        {/* Device Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(DEVICE_TYPES).map(([key, config]) => {
            const Icon = config.icon;
            const categoryCount = devices.filter(d => d.category === key).length;

            return (
              <Card key={key}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{config.title}</CardTitle>
                  <Icon className={`w-5 h-5 ${config.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{categoryCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Active connected units
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Device Management Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4 max-w-md">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="card_readers">Readers</TabsTrigger>
            <TabsTrigger value="printers">Printers</TabsTrigger>
            <TabsTrigger value="workstations">Workstations</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <DeviceTable 
              devices={devices} 
              onDelete={handleDeleteDevice} 
              onGenerateLink={handleGenerateWorkstationLink} 
            />
          </TabsContent>
          <TabsContent value="card_readers" className="mt-4">
            <DeviceTable 
              devices={devices.filter(d => d.category === 'card_readers')} 
              onDelete={handleDeleteDevice} 
              onGenerateLink={handleGenerateWorkstationLink} 
            />
          </TabsContent>
          <TabsContent value="printers" className="mt-4">
            <DeviceTable 
              devices={devices.filter(d => d.category === 'printers')} 
              onDelete={handleDeleteDevice} 
              onGenerateLink={handleGenerateWorkstationLink} 
            />
          </TabsContent>
          <TabsContent value="workstations" className="mt-4">
            <DeviceTable 
              devices={devices.filter(d => d.category === 'workstations')} 
              onDelete={handleDeleteDevice} 
              onGenerateLink={handleGenerateWorkstationLink} 
            />
          </TabsContent>
        </Tabs>

        {/* Add Device Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Register New Device</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddDevice} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="name">Device Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Front Counter Terminal"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={deviceType} onValueChange={setDeviceType}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="card_readers">Card Reader</SelectItem>
                    <SelectItem value="printers">Receipt Printer</SelectItem>
                    <SelectItem value="workstations">Workstation / Terminal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Device Model</Label>
                <Select value={subType} onValueChange={setSubType}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEVICE_TYPES[deviceType]?.types.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ip">IP Address (Optional)</Label>
                <Input
                  id="ip"
                  placeholder="192.168.1.100"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="serial">Serial Number / Hardware ID (Optional)</Label>
                <Input
                  id="serial"
                  placeholder="SN-987654321"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                />
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Device</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Generated Workstation Link Dialog */}
        <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Workstation Access Link</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Use this formatted launch link to open the workstation interface for{' '}
                <strong className="text-foreground">{selectedDevice?.name}</strong>.
              </p>

              <div className="p-3 bg-muted rounded-md text-xs font-mono break-all border">
                {generatedLink}
              </div>

              <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>
                  This link embeds your validated Merchant ID. Ensure device network authorization before launching.
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsLinkDialogOpen(false)}>
                Close
              </Button>
              <Button onClick={copyToClipboard}>Copy Link</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGate>
  );
}

// Device Table Component
function DeviceTable({ devices, onDelete, onGenerateLink }) {
  if (devices.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
          <QrCode className="w-12 h-12 mb-3 stroke-[1.5]" />
          <p className="font-medium text-base">No devices configured</p>
          <p className="text-xs">Add hardware or workstation terminals to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground text-xs uppercase border-b">
            <tr>
              <th className="px-4 py-3">Device Name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Model/Type</th>
              <th className="px-4 py-3">IP / Serial</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {devices.map((device) => (
              <tr key={device.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{device.name}</td>
                <td className="px-4 py-3 capitalize">{device.category?.replace('_', ' ')}</td>
                <td className="px-4 py-3 uppercase text-xs">{device.device_type}</td>
                <td className="px-4 py-3 text-xs font-mono">
                  {device.ip_address || device.serial_number || 'N/A'}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={device.status === 'online' ? 'default' : 'secondary'}>
                    {device.status === 'online' ? (
                      <CheckCircle className="w-3 h-3 mr-1 text-emerald-500 inline" />
                    ) : (
                      <XCircle className="w-3 h-3 mr-1 text-slate-400 inline" />
                    )}
                    {device.status || 'Offline'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onGenerateLink(device)}
                  >
                    Link
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onDelete(device.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}