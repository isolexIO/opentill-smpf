import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import StationManager from '@/components/devices/StationManager';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Monitor,
  MonitorPlay,
  Smartphone,
  Tablet,
  Globe,
  Utensils,
  Wifi,
  WifiOff,
  RefreshCw,
  Search
} from 'lucide-react';

export default function DeviceMonitorPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUser();
    loadSessions();

    const interval = setInterval(loadSessions, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      console.warn('User loading warning/unauthenticated session:', error);
    }
  };

  const loadSessions = async () => {
    setLoading(true);
    try {
      let activeSessions = [];

      if (base44.entities?.DeviceSession) {
        activeSessions = await base44.entities.DeviceSession.findMany();
      } else if (base44.entities?.Device) {
        activeSessions = await base44.entities.Device.findMany();
      }

      setSessions(activeSessions || []);
    } catch (error) {
      console.warn('Error or schema missing for Device/DeviceSession query:', error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const merchantId = user?.merchant_id || user?.id || '699dac675e801d77b9f99da2';

  const filteredSessions = sessions.filter((s) => {
    const matchesSearch =
      s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'online' && (s.status === 'online' || s.active)) ||
      (filterStatus === 'offline' && (s.status === 'offline' || !s.active));
    return matchesSearch && matchesStatus;
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
      {/* Station Link Generator & Pair Component */}
      <StationManager merchantId={merchantId} />

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4 border-t">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Connected Station Telemetry</h2>
          <p className="text-sm text-slate-500">
            Real-time ping status across customer displays and kitchen screens.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadSessions} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Sync Hardware
          </Button>
        </div>
      </div>

      {/* Metrics Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Active Terminals</p>
              <p className="text-2xl font-bold">{sessions.length}</p>
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
              <p className="text-xs text-slate-500 font-medium">Offline / Disconnected</p>
              <p className="text-2xl font-bold text-slate-600">
                {sessions.filter((s) => s.status === 'offline' || !s.active).length}
              </p>
            </div>
            <div className="p-2 bg-slate-100 rounded-lg">
              <WifiOff className="w-5 h-5 text-slate-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <Input
            placeholder="Search active devices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Session Grid */}
      {loading && sessions.length === 0 ? (
        <div className="py-12 text-center text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
          <p>Scanning active terminal endpoints...</p>
        </div>
      ) : filteredSessions.length === 0 ? (
        <Card className="p-12 text-center">
          <Monitor className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-900">No active device sessions found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Launch customer facing display or kitchen links using the manager above to establish active telemetry sessions.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSessions.map((session) => (
            <Card key={session.id || session._id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-slate-100 rounded-md">
                      {getDeviceIcon(session.type)}
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">
                        {session.name || `Station ${session.id?.slice(-4)}`}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {session.location || 'Main Counter'}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant={session.status === 'online' || session.active ? 'default' : 'secondary'}
                    className={
                      session.status === 'online' || session.active
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }
                  >
                    {session.status === 'online' || session.active ? 'Online' : 'Offline'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="text-xs space-y-2 text-slate-600">
                <div className="flex justify-between border-t pt-2">
                  <span className="text-slate-400">Merchant MID:</span>
                  <span className="font-mono">{session.merchant_id || merchantId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Last Ping:</span>
                  <span>
                    {session.updatedAt ? new Date(session.updatedAt).toLocaleTimeString() : 'Just now'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}