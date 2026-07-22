import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Label } from '@/components/ui/label';
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
  Search,
  Copy,
  ExternalLink,
  Link2,
  CheckCircle
} from 'lucide-react';

export default function DeviceMonitorPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [user, setUser] = useState(null);
  const [stationId, setStationId] = useState('main');
  const [copied, setCopied] = useState('');

  useEffect(() => {
    loadUser();
    loadSessions();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(loadSessions, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadSessions = async () => {
    try {
      const currentUser = user || await base44.auth.me();
      const allSessions = await base44.entities.DeviceSession.filter({
        merchant_id: currentUser.merchant_id
      }, '-last_heartbeat');
      
      // Filter out old offline sessions (more than 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const activeSessions = allSessions.filter(session => {
        if (session.status === 'offline') {
          const lastHeartbeat = new Date(session.last_heartbeat);
          return lastHeartbeat > fiveMinutesAgo;
        }
        return true;
      });

      setSessions(activeSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleForceDisconnect = async (sessionId) => {
    if (!confirm('Are you sure you want to disconnect this device? This will log out the user.')) {
      return;
    }

    try {
      console.log('DeviceMonitor: Disconnecting session:', sessionId);
      
      const response = await base44.functions.invoke('forceDisconnectSession', {
        session_id: sessionId
      });
      
      console.log('DeviceMonitor: Disconnect response:', response.data);

      if (response.data?.success) {
        alert('Device disconnected successfully');
        await loadSessions();
      } else {
        const errorMsg = response.data?.error || 'Failed to disconnect device';
        console.error('DeviceMonitor: Disconnect failed:', errorMsg);
        alert('Failed to disconnect device: ' + errorMsg);
      }
    } catch (error) {
      console.error('DeviceMonitor: Error disconnecting device:', error);
      
      // Provide user-friendly error messages
      let errorMsg = 'Failed to disconnect device';
      if (error.response?.status === 403) {
        errorMsg = 'You do not have permission to disconnect this device';
      } else if (error.response?.status === 404) {
        errorMsg = 'Device session not found';
      } else if (error.message) {
        errorMsg += ': ' + error.message;
      }
      
      alert(errorMsg);
    }
  };

  const copyLink = async (url, field) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(field);
      setTimeout(() => setCopied(''), 2000);
    } catch (e) {
      alert('Could not copy link:\n' + url);
    }
  };

  const getDeviceIcon = (deviceType) => {
    const icons = {
      pos: Monitor,
      customer_display: MonitorPlay,
      kitchen_display: Utensils,
      tablet: Tablet,
      mobile: Smartphone,
      web: Globe
    };
    return icons[deviceType] || Monitor;
  };

  const getStatusColor = (status, lastHeartbeat) => {
    const heartbeatDate = new Date(lastHeartbeat);
    const now = new Date();
    const diffMinutes = (now - heartbeatDate) / 1000 / 60;

    if (status === 'offline') return 'bg-gray-200 text-gray-700';
    if (diffMinutes > 2) return 'bg-red-100 text-red-700';
    if (status === 'error') return 'bg-red-100 text-red-700';
    if (status === 'idle') return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  };

  const getStatusIcon = (status, lastHeartbeat) => {
    const heartbeatDate = new Date(lastHeartbeat);
    const now = new Date();
    const diffMinutes = (now - heartbeatDate) / 1000 / 60;

    if (status === 'offline' || diffMinutes > 2) return WifiOff;
    if (status === 'error') return XCircle;
    if (status === 'idle') return Clock;
    return Wifi;
  };

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = 
      session.device_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.station_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.user_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || session.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: sessions.length,
    online: sessions.filter(s => s.status === 'online').length,
    idle: sessions.filter(s => s.status === 'idle').length,
    offline: sessions.filter(s => s.status === 'offline').length,
    error: sessions.filter(s => s.status === 'error').length
  };

  const origin = window.location.origin;
  const customerDisplayUrl = user?.merchant_id
    ? `${origin}${createPageUrl('CustomerDisplay')}?merchant_id=${user.merchant_id}&station_id=${encodeURIComponent(stationId)}`
    : '';
  const kitchenDisplayUrl = user?.merchant_id
    ? `${origin}${createPageUrl('KitchenDisplay')}?merchant_id=${user.merchant_id}&station_id=${encodeURIComponent(stationId)}`
    : '';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-600" />
          <p className="text-gray-500">Loading devices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Device Monitor</h1>
          <p className="text-gray-500 mt-1">Real-time monitoring of connected devices</p>
        </div>
        <Button onClick={loadSessions} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Public Display Links */}
      {user?.merchant_id && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Link2 className="w-5 h-5 text-blue-600" />
              Public Display Links
            </CardTitle>
            <CardDescription>
              Copy these stable links to open the displays in a browser. Each station gets its own persistent endpoint — refreshing the page reattaches to the same session instead of creating a duplicate.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 max-w-sm">
              <Label className="text-xs text-gray-500 whitespace-nowrap">Station ID</Label>
              <Input
                value={stationId}
                onChange={(e) => setStationId(e.target.value)}
                placeholder="e.g. register-1, kitchen"
                className="flex-1"
              />
            </div>
            {[
              { key: 'customer', label: 'Customer Display', url: customerDisplayUrl, Icon: MonitorPlay },
              { key: 'kitchen', label: 'Kitchen Display', url: kitchenDisplayUrl, Icon: Utensils },
            ].map(({ key, label, url, Icon }) => (
              <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex items-center gap-2 w-40 shrink-0">
                  <Icon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium">{label}</span>
                </div>
                <div className="flex flex-1 gap-2">
                  <Input readOnly value={url} className="flex-1 font-mono text-xs" />
                  <Button variant="outline" size="sm" onClick={() => copyLink(url, key)}>
                    {copied === key ? <CheckCircle className="w-4 h-4 mr-1 text-green-600" /> : <Copy className="w-4 h-4 mr-1" />}
                    {copied === key ? 'Copied' : 'Copy'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => window.open(url, '_blank')}>
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-500">Total Devices</p>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Wifi className="w-4 h-4 text-green-600" />
                <p className="text-sm text-gray-500">Online</p>
              </div>
              <p className="text-3xl font-bold text-green-600">{stats.online}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-yellow-600" />
                <p className="text-sm text-gray-500">Idle</p>
              </div>
              <p className="text-3xl font-bold text-yellow-600">{stats.idle}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <WifiOff className="w-4 h-4 text-gray-600" />
                <p className="text-sm text-gray-500">Offline</p>
              </div>
              <p className="text-3xl font-bold text-gray-600">{stats.offline}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <XCircle className="w-4 h-4 text-red-600" />
                <p className="text-sm text-gray-500">Error</p>
              </div>
              <p className="text-3xl font-bold text-red-600">{stats.error}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search devices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex gap-2">
          {['all', 'online', 'idle', 'offline', 'error'].map((status) => (
            <Button
              key={status}
              variant={filterStatus === status ? 'default' : 'outline'}
              onClick={() => setFilterStatus(status)}
              size="sm"
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Device List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredSessions.map((session) => {
          const DeviceIcon = getDeviceIcon(session.device_type);
          const StatusIcon = getStatusIcon(session.status, session.last_heartbeat);
          const heartbeatDate = new Date(session.last_heartbeat);
          const now = new Date();
          const diffMinutes = Math.floor((now - heartbeatDate) / 1000 / 60);

          return (
            <Card key={session.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <DeviceIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{session.device_name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Badge className={getStatusColor(session.status, session.last_heartbeat)}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {session.status}
                        </Badge>
                        {session.station_name && (
                          <span className="text-sm">• {session.station_name}</span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  {session.status !== 'offline' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleForceDisconnect(session.session_id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Power className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {session.user_name && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">User:</span>
                      <span className="font-medium">{session.user_name}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">IP Address:</span>
                    <span className="font-mono text-xs">{session.ip_address}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Last Heartbeat:</span>
                    <span className={diffMinutes > 2 ? 'text-red-600 font-medium' : ''}>
                      {diffMinutes === 0 ? 'Just now' : `${diffMinutes}m ago`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Connected:</span>
                    <span>{new Date(session.connected_at).toLocaleString()}</span>
                  </div>
                  {session.active_order_number && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Active Order:</span>
                      <Badge variant="outline">{session.active_order_number}</Badge>
                    </div>
                  )}
                  {session.error_message && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
                      {session.error_message}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredSessions.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Monitor className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No devices found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}