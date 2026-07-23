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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showPairModal, setShowPairModal] = useState(false);
  const [newDevice, setNewDevice] = useState({ name: '', type: 'terminal', location: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      // Safely fetch entities with fallbacks if schemas aren't defined yet
      let sessionData = [];
      let deviceData = [];

      if (base44.entities?.DeviceSession) {
        sessionData = await base44.entities.DeviceSession.findMany();
      } else if (base44.entities?.Device) {
        sessionData = await base44.entities.Device.findMany();
      }

      if (base44.entities?.Device) {
        deviceData = await base44.entities.Device.findMany();
      }

      setSessions(sessionData || []);
      setDevices(deviceData || []);
    } catch (err) {
      console.warn("Device/DeviceSession entity query fallback:", err);
      setSessions([]);
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePairDevice = async (e) => {
    e.preventDefault();
    try {
      if (base44.entities?.Device) {
        await base44.entities.Device.create(newDevice);
      } else {
        console.warn("Device entity schema missing. Pre-registering local state.");
        setDevices((prev) => [...prev, { ...newDevice, id: Date.now().toString(), status: 'offline' }]);
      }
      setShowPairModal(false);
      setNewDevice({ name: '', type: 'terminal', location: '' });
      fetchData();
    } catch (err) {
      console.error("Failed to register device:", err);
    }
  };

  const filteredSessions = sessions.filter((s) => {
    const matchesSearch =
      s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchesType = typeFilter === 'all' || s.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getDeviceIcon = (type) => {
    switch (type) {
      case 'kds':
        return <Utensils className="w-5 h-5 text-amber-500" />;
      case 'display':
        return <MonitorPlay className="w-5 h-5 text-blue-500" />;
      case 'mobile':
        return <Smartphone className="w-5 h-5 text-purple-500" />;
      case 'tablet':
        return <Tablet className="w-5 h-5 text-indigo-500" />;
      case 'web':
        return <Globe className="w-5 h-5 text-emerald-500" />;
      default:
        return <Monitor className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Device & Session Monitor</h1>
          <p className="text-sm text-slate-500">
            Track real-time active POS terminals, KDS screens, and connected customer displays.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowPairModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Pair New Device
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Terminals</p>
              <p className="text-2xl font-bold">{devices.length || sessions.length}</p>
            </div>
            <div className="p-2 bg-slate-100 rounded-lg">
              <Monitor className="w-5 h-5 text-slate-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Online Sessions</p>
              <p className="text-2xl font-bold text-emerald-600">
                {sessions.filter((s) => s.status === 'online' || s.active).length}
              </p>
            </div>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Wifi className="w-5 h-5 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Offline / Standby</p>
              <p className="text-2xl font-bold text-slate-600">
                {sessions.filter((s) => s.status === 'offline' || !s.active).length}
              </p>
            </div>
            <div className="p-2 bg-slate-100 rounded-lg">
              <WifiOff className="w-5 h-5 text-slate-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Kitchen Displays (KDS)</p>
              <p className="text-2xl font-bold text-amber-600">
                {sessions.filter((s) => s.type === 'kds').length}
              </p>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg">
              <Utensils className="w-5 h-5 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input
              placeholder="Search by device name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="terminal">Terminal</SelectItem>
                <SelectItem value="kds">Kitchen Display</SelectItem>
                <SelectItem value="display">Customer Display</SelectItem>
                <SelectItem value="mobile">Mobile POS</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Main Grid */}
      {loading ? (
        <div className="py-12 text-center text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
          <p>Syncing active hardware sessions...</p>
        </div>
      ) : filteredSessions.length === 0 ? (
        <Card className="p-12 text-center">
          <Monitor className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-900">No active device sessions</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Pair terminal endpoints or launch workstation sessions to display connection telemetry here.
          </p>
          <Button className="mt-4" onClick={() => setShowPairModal(true)}>
            <Plus className="w-4 h-4 mr-2" /> Pair Device
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSessions.map((session) => (
            <Card key={session.id || session._id} className="relative overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-slate-100 rounded-md">
                      {getDeviceIcon(session.type)}
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">
                        {session.name || `Terminal #${session.id?.slice(-4)}`}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {session.location || 'Front Counter'}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant={session.status === 'online' || session.active ? 'default' : 'secondary'}
                    className={
                      session.status === 'online' || session.active
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-600'
                    }
                  >
                    {session.status === 'online' || session.active ? 'Online' : 'Offline'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="text-xs space-y-2 text-slate-600">
                <div className="flex justify-between border-t pt-2">
                  <span className="text-slate-400">Device ID:</span>
                  <span className="font-mono">{session.id || session._id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">IP Address:</span>
                  <span>{session.ipAddress || '192.168.1.100'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Last Ping:</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {session.updatedAt ? new Date(session.updatedAt).toLocaleTimeString() : 'Just now'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal for Registering/Pairing Device */}
      <Dialog open={showPairModal} onOpenChange={setShowPairModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pair New Terminal or Display</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePairDevice} className="space-y-4 py-2">
            <div>
              <Label htmlFor="deviceName">Device Name</Label>
              <Input
                id="deviceName"
                placeholder="e.g. Front Register #1"
                value={newDevice.name}
                onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="deviceType">Device Type</Label>
              <Select
                value={newDevice.type}
                onValueChange={(val) => setNewDevice({ ...newDevice, type: val })}
              >
                <SelectTrigger id="deviceType">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="terminal">POS Terminal</SelectItem>
                  <SelectItem value="kds">Kitchen Display (KDS)</SelectItem>
                  <SelectItem value="display">Customer Facing Display</SelectItem>
                  <SelectItem value="mobile">Handheld / Mobile</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="deviceLocation">Location / Department</Label>
              <Input
                id="deviceLocation"
                placeholder="e.g. Main Bar / Kitchen Station"
                value={newDevice.location}
                onChange={(e) => setNewDevice({ ...newDevice, location: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowPairModal(false)}>
                Cancel
              </Button>
              <Button type="submit">Pair Device</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}