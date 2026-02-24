import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Search,
  Download,
  AlertCircle,
  Info,
  AlertTriangle,
  XCircle,
  RefreshCw
} from 'lucide-react';

const LOG_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'super_admin_action', label: 'Super Admin Actions' },
  { value: 'merchant_action', label: 'Merchant Actions' },
  { value: 'payment_event', label: 'Payment Events' },
  { value: 'integration_event', label: 'Integration Events' },
  { value: 'device_event', label: 'Device Events' },
  { value: 'error', label: 'Errors' },
  { value: 'security', label: 'Security' },
  { value: 'subscription_event', label: 'Subscription Events' }
];

const SEVERITY_LEVELS = [
  { value: 'all', label: 'All Severities' },
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'error', label: 'Error' },
  { value: 'critical', label: 'Critical' }
];

export default function SystemLogs() {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [searchTerm, typeFilter, severityFilter, logs]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const logList = await base44.entities.SystemLog.list('-created_date', 100);
      setLogs(logList);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = logs;

    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user_email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(log => log.log_type === typeFilter);
    }

    if (severityFilter !== 'all') {
      filtered = filtered.filter(log => log.severity === severityFilter);
    }

    setFilteredLogs(filtered);
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'critical':
        return <AlertCircle className="w-4 h-4 text-red-700" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityBadge = (severity) => {
    const configs = {
      info: { color: 'bg-blue-100 text-blue-800', label: 'Info' },
      warning: { color: 'bg-yellow-100 text-yellow-800', label: 'Warning' },
      error: { color: 'bg-red-100 text-red-800', label: 'Error' },
      critical: { color: 'bg-red-200 text-red-900', label: 'Critical' }
    };
    const config = configs[severity] || configs.info;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'Type', 'Severity', 'Action', 'Description', 'User', 'IP Address'].join(','),
      ...filteredLogs.map(log => [
        new Date(log.created_date).toISOString(),
        log.log_type,
        log.severity,
        log.action,
        log.description?.replace(/,/g, ';'),
        log.user_email,
        log.ip_address
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-logs-${new Date().toISOString()}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            System Logs
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadLogs}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={exportLogs}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {LOG_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              {SEVERITY_LEVELS.map(level => (
                <SelectItem key={level.value} value={level.value}>
                  {level.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Mobile card layout */}
        <div className="md:hidden space-y-3">
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p>Loading logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No logs found</div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-start gap-2 mb-2">
                  {getSeverityIcon(log.severity)}
                  {getSeverityBadge(log.severity)}
                </div>
                <p className="font-semibold text-gray-900 dark:text-white mb-2">{log.action}</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Type:</span><Badge variant="outline" className="text-xs">{log.log_type.replace(/_/g, ' ')}</Badge></div>
                  <div className="flex justify-between"><span className="text-gray-500">User:</span><span>{log.user_email || 'System'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Time:</span><span>{new Date(log.created_date).toLocaleString()}</span></div>
                  {log.description && <p className="text-gray-600 dark:text-gray-400 mt-2">{log.description}</p>}
                  {log.ip_address && <div className="text-xs text-gray-500 mt-2">IP: {log.ip_address}</div>}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop table layout */}
        <div className="hidden md:block border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading logs...
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No logs found
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{getSeverityIcon(log.severity)}</TableCell>
                    <TableCell className="text-sm">{new Date(log.created_date).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {log.log_type.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{log.action}</TableCell>
                    <TableCell className="text-sm">
                      {log.user_email || 'System'}
                      {log.user_role && <div className="text-xs text-gray-500">{log.user_role}</div>}
                    </TableCell>
                    <TableCell>{getSeverityBadge(log.severity)}</TableCell>
                    <TableCell className="text-sm max-w-md truncate">
                      {log.description}
                      {log.ip_address && <div className="text-xs text-gray-500 mt-1">IP: {log.ip_address}</div>}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 text-sm text-gray-500 text-center">
          Showing {filteredLogs.length} of {logs.length} logs
        </div>
      </CardContent>
    </Card>
  );
}