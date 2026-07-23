import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Monitor,
  MonitorPlay,
  Smartphone,
  Tablet,
  Globe,
  Utensils,
  XCircle,
  Clock,
  Wifi,
  WifiOff,
  RefreshCw,
  Power,
  Search,
  Plus,
  Copy,
  ExternalLink,
  Trash2
} from 'lucide-react';

export default function DeviceMonitorPage() {
  const [sessions, setSessions] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [user, setUser] = useState(null);
  const [merchant, setMerchant] = useState(null);

  // Link Generator & Modal States
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [generatedLinks, setGeneratedLinks] = useState({ main: '', customerDisplay: '' });

  // Add Workstation Form State
  const [deviceName, setDeviceName] = useState('');
  const [deviceType, setDeviceType] = useState('workstation');

  useEffect(() => {
    loadUserAndMerchant();
    loadSessions();

    const interval = setInterval(() => {
      loadSessions();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const loadUserAndMerchant = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      if (currentUser) {
        const merchants = await base44.entities.Merchant.filter({ owner_id: currentUser.id });
        if (merchants && merchants.length > 0) {
          setMerchant(merchants[0]);
          fetchDevices(merchants[0].id);
        } else {
          const allMerchants = await base44.entities.Merchant.list();
          if (allMerchants && allMerchants.length > 0) {
            setMerchant(allMerchants[0]);
            fetchDevices(allMerchants[0].id);
          }
        }
      }
    } catch (error) {
      console.error('Error loading user/merchant context:', error);
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

  const loadSessions = async () => {
    try {
      setLoading(true);
      let sessionData = [];

      try {
        sessionData = await base44.entities.DeviceSession.list();
      } catch (err) {
        if (base44.asServiceRole) {
          sessionData = await base44.asServiceRole().entities.DeviceSession.list();
        }
      }

      setSessions(sessionData || []);
    } catch (error) {
      console.error('Failed to load device sessions:', error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  // Safe online check (< 2 mins heartbeat)
  const isOnline = (lastActiveAt) => {
    if (!lastActiveAt) return false;
    const diffInMinutes = (new Date() - new Date(lastActiveAt)) / (1000 * 60);
    return diffInMinutes < 2;
  };

  // Disconnect a single session
  const handleDisconnect = async (sessionId) => {
    if (!confirm('Are you sure you want to disconnect this device session?')) return;
    try {
      await base44.entities.DeviceSession.delete(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (error) {
      console.error('Failed to disconnect device:', error);
    }
  };

  // Purge all stale/offline sessions
  const handlePurgeOffline = async () => {
    const offlineSessions = sessions.filter((s) => !isOnline(s.last_active_at));
    if (offlineSessions.length === 0) {
      alert('No inactive sessions to purge.');
      return;
    }

    if (!confirm(`Clear ${offlineSessions.length} inactive device session(s)?`)) return;

    try {
      await Promise.all(
        offlineSessions.map((s) => base44.entities.DeviceSession.delete(s.id))
      );
      setSessions((prev) => prev.filter((s) => isOnline(s.last_active_at)));
    } catch (error) {
      console.error('Failed to purge inactive sessions:', error);
    }
  };

  // Add new Workstation or Display
  const handleAddWorkstation = async (e) => {
    e.preventDefault();
    if (!merchant?.id) {
      alert('Cannot add workstation: No active merchant record loaded.');
      return;
    }

    try {
      const newDevice = await base44.entities.Device.create({
        merchant_id: merchant.id,
        name: deviceName,
        category: 'workstations',
        device_type: deviceType,
        status: 'online',
        created_at: new Date().toISOString()
      });

      setDevices([...devices, newDevice]);
      setIsAddDialogOpen(false);
      setDeviceName('');
      setDeviceType('workstation');
      handleGenerateLinks(newDevice);
    } catch (err) {
      console.error('Error creating workstation:', err);
      alert('Failed to register workstation.');
    }
  };

  // Generate links for Workstation & Customer Display
  const handleGenerateLinks = (device) => {
    const resolvedMerchantId = merchant?.id || merchant?.merchant_id || merchant?.stripe_account_id;

    if (!resolvedMerchantId) {
      alert('Error: Merchant ID could not be determined.');
      return;
    }

    const baseUrl = window.location.origin;
    const stationSlug = device.name ? encodeURIComponent(device.name.toLowerCase().replace(/\s+/g, '-')) : 'counter';

    const mainPosLink = `${baseUrl}/Workstation?merchant_id=${resolvedMerchantId}&station_id=${stationSlug}&device_id=${device.id}`;
    const displayLink = `${baseUrl}/customerdisplay?merchant_id=${resolvedMerchantId}&station_id=${stationSlug}`;

    setSelectedDevice(device);
    setGeneratedLinks({
      main: mainPosLink,
      customerDisplay: displayLink
    });
    setIsLinkDialogOpen(true);
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    alert(`${label} copied to clipboard!`);
  };

  const getDeviceIcon = (deviceType) => {
    switch (deviceType?.toLowerCase()) {
      case 'pos_terminal':
      case 'workstation':
        return <Monitor className="w-5 h-5 text-purple-600" />;
      case 'customer_display':
        return <MonitorPlay className="w-5 h-5 text-blue-600" />;
      case 'kitchen_display':
      case 'kds':
        return <Utensils className="w-5 h-5 text-amber-600" />;
      case 'tablet':
        return <Tablet className="w-5 h-5 text-emerald-600" />;
      case 'mobile':
        return <Smartphone className="w-5 h-5 text-indigo-600" />;
      default:
        return <Globe className="w-5 h-5 text-slate-500" />;
    }
  };

  const filteredSessions = sessions.filter((session) => {
    const matchesSearch =
      (session.station_name && session.station_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (session.device_name && session.device_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (session.station_id && session.station_id.toLowerCase().includes(searchTerm.toLowerCase()));

    const activeStatus = isOnline(session.last_active_at);
    if (filterStatus === 'online') return matchesSearch && activeStatus;
    if (filterStatus === 'offline') return matchesSearch && !activeStatus;
    return matchesSearch;
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Live Device & Station Monitor</h1>
          <p className="text-sm text-muted-foreground">
            Track connected POS stations, customer displays, and terminal heartbeats in real-time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsAddDialogOpen(true)} className="sm:w-auto">
            <Plus className="w-4 h-4 mr-2" /> Add Workstation
          </Button>
          <Button onClick={loadSessions} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Registered Workstations List with Link Generators */}
      {devices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configured Workstations & Displays</CardTitle>
            <CardDescription>
              Generate launcher links for active terminals and customer screens.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {devices.map((device) => (
              <div key={device.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                <div className="flex items-center gap-2.5">
                  {getDeviceIcon(device.device_type)}
                  <div>
                    <p className="font-semibold text-sm leading-tight">{device.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{device.device_type?.replace('_', ' ')}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleGenerateLinks(device)}>
                  Get Links
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Real-time Sessions Grid */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Active Terminal Sessions</CardTitle>
              <CardDescription>
                Connected browser windows, kiosks, and customer screens.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs text-destructive hover:text-destructive"
                onClick={handlePurgeOffline}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Purge Inactive
              </Button>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Filter station..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-[160px] sm:w-[200px] text-xs"
                />
              </div>

              <div className="flex border rounded-md p-0.5 bg-muted">
                <Button
                  size="sm"
                  variant={filterStatus === 'all' ? 'default' : 'ghost'}
                  className="text-xs h-7 px-2.5"
                  onClick={() => setFilterStatus('all')}
                >
                  All
                </Button>
                <Button
                  size="sm"
                  variant={filterStatus === 'online' ? 'default' : 'ghost'}
                  className="text-xs h-7 px-2.5"
                  onClick={() => setFilterStatus('online')}
                >
                  Online
                </Button>
                <Button
                  size="sm"
                  variant={filterStatus === 'offline' ? 'default' : 'ghost'}
                  className="text-xs h-7 px-2.5"
                  onClick={() => setFilterStatus('offline')}
                >
                  Offline
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading && sessions.length === 0 ? (
            <div className="flex items-center justify-center p-12">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground space-y-2">
              <WifiOff className="w-10 h-10 mx-auto stroke-1" />
              <p className="font-medium text-sm">No device sessions found</p>
              <p className="text-xs">
                Launch a workstation or display link to create an active session.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSessions.map((session) => {
                const online = isOnline(session.last_active_at);

                return (
                  <Card key={session.id} className="border relative overflow-hidden">
                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-md bg-muted">
                            {getDeviceIcon(session.device_type)}
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm leading-tight">
                              {session.station_name || session.station_id || 'Unnamed Station'}
                            </h4>
                            <p className="text-xs text-muted-foreground capitalize">
                              {session.device_type?.replace('_', ' ') || 'Workstation'}
                            </p>
                          </div>
                        </div>

                        <Badge variant={online ? 'default' : 'secondary'} className="text-[10px]">
                          {online ? (
                            <Wifi className="w-3 h-3 mr-1 text-emerald-400 inline" />
                          ) : (
                            <XCircle className="w-3 h-3 mr-1 text-slate-400 inline" />
                          )}
                          {online ? 'Online' : 'Inactive'}
                        </Badge>
                      </div>

                      <div className="text-xs space-y-1 font-mono bg-muted/40 p-2.5 rounded text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Station ID:</span>
                          <span className="text-foreground">{session.station_id || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>IP Address:</span>
                          <span className="text-foreground">{session.ip_address || '127.0.0.1'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Heartbeat:
                          </span>
                          <span className="text-foreground">
                            {session.last_active_at
                              ? new Date(session.last_active_at).toLocaleTimeString()
                              : 'Never'}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive text-xs h-8"
                          onClick={() => handleDisconnect(session.id)}
                        >
                          <Power className="w-3.5 h-3.5 mr-1" /> Disconnect
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Workstation Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Station / Display</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddWorkstation} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Station Name</Label>
              <Input
                id="name"
                placeholder="e.g. Register 1 or Front Display"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Role / Type</Label>
              <Select value={deviceType} onValueChange={setDeviceType}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="workstation">POS Workstation</SelectItem>
                  <SelectItem value="customer_display">Customer Facing Display</SelectItem>
                  <SelectItem value="kitchen_display">Kitchen Display System (KDS)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Station</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Workstation & Customer Display Links Modal */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Station Launch Links</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Generated links for <strong className="text-foreground">{selectedDevice?.name}</strong>:
            </p>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                POS Workstation Link
              </Label>
              <div className="flex gap-2 items-center">
                <div className="p-2 bg-muted rounded text-xs font-mono break-all border flex-1">
                  {generatedLinks.main}
                </div>
                <Button size="sm" variant="outline" onClick={() => copyToClipboard(generatedLinks.main, 'Workstation Link')}>
                  <Copy className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => window.open(generatedLinks.main, '_blank')}>
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Customer Facing Display Link
              </Label>
              <div className="flex gap-2 items-center">
                <div className="p-2 bg-muted rounded text-xs font-mono break-all border flex-1">
                  {generatedLinks.customerDisplay}
                </div>
                <Button size="sm" variant="outline" onClick={() => copyToClipboard(generatedLinks.customerDisplay, 'Customer Display Link')}>
                  <Copy className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => window.open(generatedLinks.customerDisplay, '_blank')}>
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsLinkDialogOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}