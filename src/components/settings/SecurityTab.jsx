import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Shield, Lock, Eye, Clock, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function SecurityTab({ settings, onSave }) {
  const [securitySettings, setSecuritySettings] = useState({
    two_factor_enabled: false,
    pin_lockout_attempts: 3,
    pin_lockout_duration: 30,
    session_timeout_minutes: 30,
    require_pin_change: false,
    pin_change_interval_days: 90,
    audit_logging_enabled: true,
    pci_dss_mode: false,
    ip_whitelist_enabled: false,
    ip_whitelist: [],
    failed_login_notification: true,
    ...settings?.security
  });

  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [securityCheck, setSecurityCheck] = useState(null);
  const [checkingCompliance, setCheckingCompliance] = useState(false);

  useEffect(() => {
    loadRecentAuditLogs();
  }, []);

  const loadRecentAuditLogs = async () => {
    setLoadingLogs(true);
    try {
      const user = await base44.auth.me();
      const logs = await base44.entities.AuditLog.filter(
        { merchant_id: user.merchant_id },
        '-created_date',
        10
      );
      setAuditLogs(logs);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSave = () => {
    onSave({ security: securitySettings });
  };

  const getSeverityColor = (severity) => {
    const colors = {
      info: 'bg-blue-100 text-blue-800',
      warning: 'bg-yellow-100 text-yellow-800',
      critical: 'bg-red-100 text-red-800'
    };
    return colors[severity] || colors.info;
  };

  const runSecurityCheck = async () => {
    setCheckingCompliance(true);
    try {
      const user = await base44.auth.me();
      const checks = {
        passed: [],
        warnings: [],
        critical: []
      };

      // Check 1: Two-Factor Authentication
      if (!securitySettings.two_factor_enabled) {
        checks.critical.push({
          issue: 'Two-Factor Authentication Disabled',
          description: 'Enable 2FA for all users to prevent unauthorized access',
          fix: 'Enable Two-Factor Authentication in General Security settings'
        });
      } else {
        checks.passed.push('Two-Factor Authentication Enabled');
      }

      // Check 2: Session Timeout
      if (securitySettings.session_timeout_minutes > 30) {
        checks.warnings.push({
          issue: 'Session Timeout Too Long',
          description: 'Sessions lasting over 30 minutes increase security risk',
          fix: 'Set session timeout to 30 minutes or less'
        });
      } else {
        checks.passed.push('Secure Session Timeout Configured');
      }

      // Check 3: PIN Lockout
      if (securitySettings.pin_lockout_attempts > 5) {
        checks.warnings.push({
          issue: 'PIN Lockout Attempts Too High',
          description: 'Allowing more than 5 failed attempts increases brute force risk',
          fix: 'Set PIN lockout attempts to 5 or fewer'
        });
      } else {
        checks.passed.push('Strong PIN Lockout Policy');
      }

      // Check 4: Audit Logging
      if (!securitySettings.audit_logging_enabled) {
        checks.critical.push({
          issue: 'Audit Logging Disabled',
          description: 'Without audit logs, security incidents cannot be tracked',
          fix: 'Enable Enhanced Audit Logging in PCI-DSS Compliance settings'
        });
      } else {
        checks.passed.push('Audit Logging Enabled');
      }

      // Check 5: PCI-DSS Mode
      if (!securitySettings.pci_dss_mode) {
        checks.warnings.push({
          issue: 'PCI-DSS Mode Not Enabled',
          description: 'Payment Card Industry compliance mode provides additional security',
          fix: 'Enable PCI-DSS Mode in PCI-DSS Compliance settings if processing cards'
        });
      } else {
        checks.passed.push('PCI-DSS Compliance Mode Active');
      }

      // Check 6: Failed Login Notifications
      if (!securitySettings.failed_login_notification) {
        checks.warnings.push({
          issue: 'Failed Login Notifications Disabled',
          description: 'You won\'t be alerted to potential unauthorized access attempts',
          fix: 'Enable Failed Login Notifications'
        });
      } else {
        checks.passed.push('Failed Login Notifications Enabled');
      }

      // Check 7: PIN Change Policy
      if (!securitySettings.require_pin_change) {
        checks.warnings.push({
          issue: 'No Periodic PIN Changes Required',
          description: 'Requiring regular PIN changes improves security',
          fix: 'Enable Require Periodic PIN Changes (recommended: every 90 days)'
        });
      } else {
        checks.passed.push('Periodic PIN Changes Required');
      }

      // Check 8: HTTPS/TLS
      if (window.location.protocol !== 'https:') {
        checks.critical.push({
          issue: 'Not Using HTTPS',
          description: 'Data is transmitted without encryption, exposing sensitive information',
          fix: 'Configure SSL/TLS certificate for your domain'
        });
      } else {
        checks.passed.push('HTTPS Encryption Active');
      }

      setSecurityCheck(checks);
    } catch (error) {
      console.error('Error running security check:', error);
    } finally {
      setCheckingCompliance(false);
    }
  };

  const fixAllIssues = () => {
    const updatedSettings = { ...securitySettings };
    
    // Auto-fix all issues
    updatedSettings.two_factor_enabled = true;
    updatedSettings.session_timeout_minutes = 30;
    updatedSettings.pin_lockout_attempts = 5;
    updatedSettings.audit_logging_enabled = true;
    updatedSettings.failed_login_notification = true;
    updatedSettings.require_pin_change = true;
    updatedSettings.pin_change_interval_days = 90;
    updatedSettings.pci_dss_mode = true;
    
    setSecuritySettings(updatedSettings);
    
    // Show success and re-run check
    setTimeout(() => {
      runSecurityCheck();
    }, 500);
  };

  return (
    <div className="space-y-6">
      {/* Security Check Banner */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Shield className="w-6 h-6 text-blue-600 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">Security Compliance Check</h3>
                <p className="text-sm text-blue-700 mb-3">
                  Run a comprehensive security audit to identify potential vulnerabilities
                </p>
                {securityCheck && (
                  <div className="flex gap-4 text-sm">
                    <span className="text-green-700">✓ {securityCheck.passed.length} Passed</span>
                    {securityCheck.warnings.length > 0 && (
                      <span className="text-yellow-700">⚠ {securityCheck.warnings.length} Warnings</span>
                    )}
                    {securityCheck.critical.length > 0 && (
                      <span className="text-red-700">✕ {securityCheck.critical.length} Critical</span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={runSecurityCheck} 
                disabled={checkingCompliance}
                variant="outline"
                className="bg-white"
              >
                {checkingCompliance ? 'Checking...' : 'Run Security Check'}
              </Button>
              {securityCheck && (securityCheck.warnings.length > 0 || securityCheck.critical.length > 0) && (
                <Button 
                  onClick={fixAllIssues}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Fix All Issues
                </Button>
              )}
            </div>
          </div>

          {securityCheck && (
            <div className="mt-4 space-y-3">
              {/* Critical Issues */}
              {securityCheck.critical.map((item, idx) => (
                <div key={`critical-${idx}`} className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-start gap-2">
                    <span className="text-red-600 font-bold">✕</span>
                    <div className="flex-1">
                      <h4 className="font-medium text-red-900">{item.issue}</h4>
                      <p className="text-sm text-red-700 mt-1">{item.description}</p>
                      <p className="text-xs text-red-600 mt-2 font-medium">Fix: {item.fix}</p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Warnings */}
              {securityCheck.warnings.map((item, idx) => (
                <div key={`warning-${idx}`} className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-600 font-bold">⚠</span>
                    <div className="flex-1">
                      <h4 className="font-medium text-yellow-900">{item.issue}</h4>
                      <p className="text-sm text-yellow-700 mt-1">{item.description}</p>
                      <p className="text-xs text-yellow-600 mt-2 font-medium">Fix: {item.fix}</p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Passed Checks (collapsed by default) */}
              {securityCheck.passed.length > 0 && (
                <details className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <summary className="cursor-pointer font-medium text-green-900">
                    ✓ {securityCheck.passed.length} Security Checks Passed
                  </summary>
                  <ul className="mt-2 space-y-1 text-sm text-green-700">
                    {securityCheck.passed.map((item, idx) => (
                      <li key={idx}>• {item}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">General Security</TabsTrigger>
          <TabsTrigger value="pci">PCI-DSS Compliance</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
        </TabsList>

        {/* General Security Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Authentication Security
              </CardTitle>
              <CardDescription>
                Configure login and session security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-gray-500">Require 2FA for all users</p>
                </div>
                <Switch
                  checked={securitySettings.two_factor_enabled}
                  onCheckedChange={(checked) =>
                    setSecuritySettings({ ...securitySettings, two_factor_enabled: checked })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lockoutAttempts">PIN Lockout Attempts</Label>
                  <Input
                    id="lockoutAttempts"
                    type="number"
                    min="3"
                    max="10"
                    value={securitySettings.pin_lockout_attempts}
                    onChange={(e) =>
                      setSecuritySettings({
                        ...securitySettings,
                        pin_lockout_attempts: parseInt(e.target.value)
                      })
                    }
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Failed attempts before lockout
                  </p>
                </div>

                <div>
                  <Label htmlFor="lockoutDuration">Lockout Duration (minutes)</Label>
                  <Input
                    id="lockoutDuration"
                    type="number"
                    min="15"
                    max="120"
                    value={securitySettings.pin_lockout_duration}
                    onChange={(e) =>
                      setSecuritySettings({
                        ...securitySettings,
                        pin_lockout_duration: parseInt(e.target.value)
                      })
                    }
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    How long user is locked out
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  min="5"
                  max="480"
                  value={securitySettings.session_timeout_minutes}
                  onChange={(e) =>
                    setSecuritySettings({
                      ...securitySettings,
                      session_timeout_minutes: parseInt(e.target.value)
                    })
                  }
                />
                <p className="text-xs text-gray-500 mt-1">
                  Auto-logout after inactivity
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Require Periodic PIN Changes</Label>
                  <p className="text-sm text-gray-500">Force users to update PINs regularly</p>
                </div>
                <Switch
                  checked={securitySettings.require_pin_change}
                  onCheckedChange={(checked) =>
                    setSecuritySettings({ ...securitySettings, require_pin_change: checked })
                  }
                />
              </div>

              {securitySettings.require_pin_change && (
                <div>
                  <Label htmlFor="pinChangeInterval">PIN Change Interval (days)</Label>
                  <Input
                    id="pinChangeInterval"
                    type="number"
                    min="30"
                    max="365"
                    value={securitySettings.pin_change_interval_days}
                    onChange={(e) =>
                      setSecuritySettings({
                        ...securitySettings,
                        pin_change_interval_days: parseInt(e.target.value)
                      })
                    }
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <Label>Failed Login Notifications</Label>
                  <p className="text-sm text-gray-500">Email alerts for failed login attempts</p>
                </div>
                <Switch
                  checked={securitySettings.failed_login_notification}
                  onCheckedChange={(checked) =>
                    setSecuritySettings({ ...securitySettings, failed_login_notification: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Network Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>IP Whitelist</Label>
                  <p className="text-sm text-gray-500">Restrict access to specific IP addresses</p>
                </div>
                <Switch
                  checked={securitySettings.ip_whitelist_enabled}
                  onCheckedChange={(checked) =>
                    setSecuritySettings({ ...securitySettings, ip_whitelist_enabled: checked })
                  }
                />
              </div>

              {securitySettings.ip_whitelist_enabled && (
                <div>
                  <Label>Allowed IP Addresses</Label>
                  <textarea
                    className="w-full h-24 p-2 border rounded-md"
                    placeholder="Enter one IP address per line&#10;e.g., 192.168.1.100&#10;10.0.0.50"
                    value={securitySettings.ip_whitelist.join('\n')}
                    onChange={(e) =>
                      setSecuritySettings({
                        ...securitySettings,
                        ip_whitelist: e.target.value.split('\n').filter(ip => ip.trim())
                      })
                    }
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              <Shield className="w-4 h-4 mr-2" />
              Save Security Settings
            </Button>
          </div>
        </TabsContent>

        {/* PCI-DSS Compliance Tab */}
        <TabsContent value="pci" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                PCI-DSS Compliance Mode
              </CardTitle>
              <CardDescription>
                Enable additional security controls for PCI-DSS compliance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div>
                  <Label className="text-base">Enable PCI-DSS Mode</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Activates enhanced security controls and logging
                  </p>
                </div>
                <Switch
                  checked={securitySettings.pci_dss_mode}
                  onCheckedChange={(checked) =>
                    setSecuritySettings({ ...securitySettings, pci_dss_mode: checked })
                  }
                />
              </div>

              {securitySettings.pci_dss_mode && (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                    <h4 className="font-medium text-green-900 mb-2">✓ Active Security Controls:</h4>
                    <ul className="space-y-1 text-sm text-green-800">
                      <li>• Enhanced audit logging for all transactions</li>
                      <li>• Automatic session timeout after 15 minutes</li>
                      <li>• Masked card data display (last 4 digits only)</li>
                      <li>• Encrypted data transmission (TLS 1.2+)</li>
                      <li>• No card data stored in database</li>
                      <li>• Quarterly vulnerability scans required</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-md">
                    <h4 className="font-medium text-yellow-900 mb-2">⚠️ Compliance Requirements:</h4>
                    <ul className="space-y-1 text-sm text-yellow-800">
                      <li>• Annual PCI-DSS assessment required</li>
                      <li>• Use only PCI-compliant payment terminals</li>
                      <li>• Regular security training for all staff</li>
                      <li>• Maintain firewall and antivirus protection</li>
                      <li>• Physical security for card processing areas</li>
                    </ul>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <Label>Enhanced Audit Logging</Label>
                  <p className="text-sm text-gray-500">Log all payment-related activities</p>
                </div>
                <Switch
                  checked={securitySettings.audit_logging_enabled}
                  onCheckedChange={(checked) =>
                    setSecuritySettings({ ...securitySettings, audit_logging_enabled: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Recent Audit Logs
                  </CardTitle>
                  <CardDescription>
                    View security-related activities and events
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={loadRecentAuditLogs} disabled={loadingLogs}>
                  {loadingLogs ? 'Loading...' : 'Refresh'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No audit logs available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-4 border rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={getSeverityColor(log.severity)}>
                            {log.severity}
                          </Badge>
                          <span className="font-medium">{log.action_type}</span>
                          {log.pci_relevant && (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                              PCI
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(log.created_date).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{log.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {log.actor_email}
                        </span>
                        {log.ip_address && (
                          <span>{log.ip_address}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}