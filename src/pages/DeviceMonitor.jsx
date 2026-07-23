import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
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
  XCircle,
  Clock,
  Wifi,
  WifiOff,
  RefreshCw,
  Power,
  Search
} from 'lucide-react';

export default function DeviceMonitorPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [user, setUser] = useState(null);
  const [merchant, setMerchant] = useState(null);

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
        } else {
          const allMerchants = await base44.entities.Merchant.list();
          if (allMerchants && allMerchants.length > 0) {
            setMerchant(allMerchants[0]);
          }
        }
      }
    } catch (error) {
      console.error('Error loading user/merchant context:', error);
    }
  };

  const loadSessions = async () => {
    try {
      setLoading(true);
      let sessionData = [];
      
      try {
        sessionData = await base44.entities.DeviceSession.list();
      } catch (err) {
        // Fallback for service role if RLS blocks standard client list call
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

  const handleDisconnect = async (sessionId) => {
    if (!confirm('Are you sure you want to disconnect this device session?')) return;
    try {
      await base44.entities.DeviceSession.delete(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (error) {
      console.error('Failed to disconnect device:', error);
    }
  };

  const isOnline = (lastActiveAt) => {
    if (!lastActiveAt) return false;
    const diffInMinutes = (new Date() - new Date(lastActiveAt)) / (1000 * 60);
    return diffInMinutes < 2;
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
            Track connected POS stations, active customer displays, and terminal heartbeats in real-time.
          </p>
        </div>
        <Button onClick={loadSessions} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Status
        </Button>
      </div>

      {/* Real-time Session Overview */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Active Terminal Sessions</CardTitle>
              <CardDescription>
                Connected browsers, dedicated workstations, and customer displays.
              </CardDescription>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Filter by station or device..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-[200px] sm:w-[250px] text-xs"
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
              <p className="font-medium text-sm">No active device sessions found</p>
              <p className="text-xs">
                Launch a station link from the Devices page to establish a terminal session.
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
                          <Power className="w-3.5 h-3.5 mr-1" /> Disconnect Session
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
    </div>
  );
}