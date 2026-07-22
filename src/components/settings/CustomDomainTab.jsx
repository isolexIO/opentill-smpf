import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
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
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Globe,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Copy,
  RefreshCw,
  Lock,
  ExternalLink
} from 'lucide-react';
import SNSSubdomainRegistration from '@/components/dealer/SNSSubdomainRegistration.jsx';

export default function CustomDomainTab() {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newDomain, setNewDomain] = useState({
    domain: '',
    domain_type: 'both',
    verification_method: 'dns_txt',
    pci_compliance_acknowledged: false
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [verifying, setVerifying] = useState(null);

  useEffect(() => {
    loadDomains();
  }, []);

  const loadDomains = async () => {
    try {
      setLoading(true);
      const pinUserJSON = localStorage.getItem('pinLoggedInUser');
      let user;
      if (pinUserJSON) {
        user = JSON.parse(pinUserJSON);
      } else {
        user = await base44.auth.me();
      }
      setCurrentUser(user);

      if (user.merchant_id) {
        const domainList = await base44.entities.CustomDomain.filter({
          merchant_id: user.merchant_id
        });
        setDomains(domainList);
      }
    } catch (error) {
      console.error('Error loading domains:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateVerificationToken = () => {
    return `chainpay-verify-${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  };

  const handleAddDomain = async () => {
    if (!newDomain.domain.trim()) {
      alert('Please enter a domain name');
      return;
    }

    if (!newDomain.pci_compliance_acknowledged) {
      alert('You must acknowledge PCI-DSS compliance requirements');
      return;
    }

    // Validate domain format
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
    if (!domainRegex.test(newDomain.domain)) {
      alert('Please enter a valid domain name (e.g., pos.mystore.com)');
      return;
    }

    try {
      const verificationToken = generateVerificationToken();
      const platformDomain = 'chainpay-platform.base44.app'; // Replace with actual platform domain

      const dnsRecords = [
        {
          type: 'TXT',
          name: `_chainpay-verification.${newDomain.domain}`,
          value: verificationToken,
          verified: false
        },
        {
          type: 'CNAME',
          name: newDomain.domain,
          value: platformDomain,
          verified: false
        },
        {
          type: 'CNAME',
          name: `www.${newDomain.domain}`,
          value: platformDomain,
          verified: false
        }
      ];

      await base44.entities.CustomDomain.create({
        merchant_id: currentUser.merchant_id,
        domain: newDomain.domain.toLowerCase(),
        domain_type: newDomain.domain_type,
        verification_method: newDomain.verification_method,
        verification_token: verificationToken,
        status: 'pending_verification',
        ssl_status: 'pending',
        dns_records: dnsRecords,
        pci_compliance_acknowledged: true,
        force_https: true
      });

      setShowAddDialog(false);
      setNewDomain({
        domain: '',
        domain_type: 'both',
        verification_method: 'dns_txt',
        pci_compliance_acknowledged: false
      });
      loadDomains();
      alert('Domain added! Please configure DNS records to verify ownership.');
    } catch (error) {
      console.error('Error adding domain:', error);
      alert('Failed to add domain. Please try again.');
    }
  };

  const handleVerifyDomain = async (domainId) => {
    try {
      setVerifying(domainId);
      
      // Call backend function to verify DNS records
      const result = await base44.functions.invoke('verifyCustomDomain', {
        domain_id: domainId
      });

      if (result.data.verified) {
        alert('Domain verified successfully! SSL certificate provisioning will begin shortly.');
        loadDomains();
      } else {
        alert(`Verification failed: ${result.data.message || 'DNS records not found'}`);
      }
    } catch (error) {
      console.error('Error verifying domain:', error);
      alert('Failed to verify domain. Please ensure DNS records are correctly configured.');
    } finally {
      setVerifying(null);
    }
  };

  const handleDeleteDomain = async (domainId) => {
    if (!window.confirm('Are you sure you want to remove this custom domain? This action cannot be undone.')) {
      return;
    }

    try {
      await base44.entities.CustomDomain.delete(domainId);
      loadDomains();
    } catch (error) {
      console.error('Error deleting domain:', error);
      alert('Failed to delete domain.');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending_verification: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending Verification' },
      verified: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle, label: 'Verified' },
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Active' },
      failed: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Failed' },
      suspended: { color: 'bg-gray-100 text-gray-800', icon: AlertCircle, label: 'Suspended' }
    };

    const config = statusConfig[status] || statusConfig.pending_verification;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getSSLBadge = (sslStatus) => {
    const sslConfig = {
      pending: { color: 'bg-gray-100 text-gray-800', icon: Clock, label: 'Pending' },
      provisioning: { color: 'bg-blue-100 text-blue-800', icon: RefreshCw, label: 'Provisioning' },
      active: { color: 'bg-green-100 text-green-800', icon: Lock, label: 'Secure (HTTPS)' },
      failed: { color: 'bg-red-100 text-red-800', icon: AlertCircle, label: 'Failed' },
      expired: { color: 'bg-orange-100 text-orange-800', icon: AlertCircle, label: 'Expired' }
    };

    const config = sslConfig[sslStatus] || sslConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Loading custom domains...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* SNS subdomain registration */}
      {currentUser?.merchant_id && (
        <SNSSubdomainRegistration ownerType="merchant" ownerId={currentUser.merchant_id} onUpdate={loadDomains} />
      )}

      {/* PCI-DSS Compliance Notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>PCI-DSS Compliance:</strong> All custom domains are automatically configured with HTTPS/SSL encryption. 
          Payment card data is never stored on your custom domain and is processed through PCI-DSS Level 1 certified payment gateways.
          Custom domains are subject to security audits and must maintain SSL certificates.
        </AlertDescription>
      </Alert>

      {/* Add Domain Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Custom Domains</h3>
          <p className="text-sm text-gray-500">Use your own domain for POS and online ordering</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Globe className="w-4 h-4 mr-2" />
          Add Custom Domain
        </Button>
      </div>

      {/* Domain List */}
      {domains.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Globe className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No custom domains configured</p>
            <p className="text-sm text-gray-400">Add a custom domain to white-label your POS and online ordering system</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {domains.map((domain) => (
            <Card key={domain.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Globe className="w-5 h-5 text-blue-600" />
                      {domain.domain}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      {getStatusBadge(domain.status)}
                      {getSSLBadge(domain.ssl_status)}
                      <Badge variant="outline" className="capitalize">
                        {domain.domain_type.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {domain.status === 'active' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`https://${domain.domain}`, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteDomain(domain.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {domain.status === 'pending_verification' && (
                  <>
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Please add the following DNS records to your domain registrar to verify ownership and activate your custom domain.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm">Required DNS Records:</h4>
                      {domain.dns_records?.map((record, index) => (
                        <Card key={index} className="bg-gray-50">
                          <CardContent className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                              <div>
                                <Label className="text-xs text-gray-500">Type</Label>
                                <p className="font-mono font-semibold">{record.type}</p>
                              </div>
                              <div className="md:col-span-2">
                                <Label className="text-xs text-gray-500">Name</Label>
                                <div className="flex items-center gap-2">
                                  <p className="font-mono text-sm truncate">{record.name}</p>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => copyToClipboard(record.name)}
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                              <div className="md:col-span-1">
                                <Label className="text-xs text-gray-500">Status</Label>
                                <p className="text-sm">
                                  {record.verified ? (
                                    <span className="text-green-600 flex items-center gap-1">
                                      <CheckCircle className="w-4 h-4" /> Verified
                                    </span>
                                  ) : (
                                    <span className="text-gray-500">Pending</span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="mt-2">
                              <Label className="text-xs text-gray-500">Value</Label>
                              <div className="flex items-center gap-2">
                                <p className="font-mono text-xs text-gray-700 bg-white p-2 rounded border flex-1 overflow-x-auto">
                                  {record.value}
                                </p>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => copyToClipboard(record.value)}
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <Button
                      onClick={() => handleVerifyDomain(domain.id)}
                      disabled={verifying === domain.id}
                      className="w-full"
                    >
                      {verifying === domain.id ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Verify Domain
                        </>
                      )}
                    </Button>
                  </>
                )}

                {domain.status === 'verified' && domain.ssl_status === 'provisioning' && (
                  <Alert>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <AlertDescription>
                      SSL certificate is being provisioned. This usually takes 5-15 minutes. Your domain will be activated automatically once the certificate is issued.
                    </AlertDescription>
                  </Alert>
                )}

                {domain.status === 'active' && (
                  <Alert>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      <strong>Your custom domain is active!</strong>
                      <br />
                      {domain.domain_type === 'pos' && `POS access: https://${domain.domain}`}
                      {domain.domain_type === 'online_ordering' && `Online ordering: https://${domain.domain}`}
                      {domain.domain_type === 'both' && `Access your system at: https://${domain.domain}`}
                    </AlertDescription>
                  </Alert>
                )}

                {domain.status === 'failed' && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Verification failed:</strong> {domain.error_message || 'Please check DNS configuration'}
                    </AlertDescription>
                  </Alert>
                )}

                {domain.ssl_expires_at && (
                  <p className="text-xs text-gray-500">
                    SSL Certificate expires: {new Date(domain.ssl_expires_at).toLocaleDateString()} (auto-renewed)
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Domain Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Custom Domain</DialogTitle>
            <DialogDescription>
              Connect your own domain name for white-labeled POS and online ordering access.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="domain">Domain Name</Label>
              <Input
                id="domain"
                placeholder="pos.mystore.com"
                value={newDomain.domain}
                onChange={(e) => setNewDomain({ ...newDomain, domain: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Use a subdomain (e.g., pos.yourstore.com) for easier setup
              </p>
            </div>

            <div>
              <Label>Usage</Label>
              <Select
                value={newDomain.domain_type}
                onValueChange={(value) => setNewDomain({ ...newDomain, domain_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pos">POS System Only</SelectItem>
                  <SelectItem value="online_ordering">Online Ordering Only</SelectItem>
                  <SelectItem value="both">Both POS & Online Ordering</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>PCI-DSS Compliance Requirements:</strong>
                <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                  <li>HTTPS/SSL is mandatory and auto-configured</li>
                  <li>Payment card data is never stored on your domain</li>
                  <li>All transactions processed via certified gateways</li>
                  <li>Domain must maintain valid SSL certificate</li>
                  <li>Security monitoring is automatically enabled</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="pci-compliance"
                checked={newDomain.pci_compliance_acknowledged}
                onCheckedChange={(checked) => 
                  setNewDomain({ ...newDomain, pci_compliance_acknowledged: checked })
                }
              />
              <label
                htmlFor="pci-compliance"
                className="text-sm leading-tight cursor-pointer"
              >
                I understand and acknowledge the PCI-DSS compliance requirements for custom domains. 
                I will maintain DNS records and will not modify payment processing security settings.
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddDomain} disabled={!newDomain.pci_compliance_acknowledged}>
              <Globe className="w-4 h-4 mr-2" />
              Add Domain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}