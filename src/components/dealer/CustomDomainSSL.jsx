import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Globe,
  CheckCircle,
  AlertCircle,
  Loader2,
  Shield,
  Copy,
  ExternalLink
} from 'lucide-react';

export default function CustomDomainSSL({ dealer }) {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [customDomain, setCustomDomain] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState(null);

  useEffect(() => {
    loadCustomDomain();
  }, [dealer]);

  const loadCustomDomain = async () => {
    try {
      const domains = await base44.entities.CustomDomain.filter({
        dealer_id: dealer.legacy_dealer_id || dealer.id,
        domain_type: 'pos'
      });

      if (domains && domains.length > 0) {
        setCustomDomain(domains[0]);
        setDomain(domains[0].domain);
      }
    } catch (error) {
      console.error('Error loading custom domain:', error);
    }
  };

  const handleSetupDomain = async () => {
    if (!domain) {
      alert('Please enter a domain name');
      return;
    }

    try {
      setLoading(true);
      
      const response = await base44.functions.invoke('setupCustomDomain', {
        dealer_id: dealer.legacy_dealer_id || dealer.id,
        domain: domain
      });

      if (response.data.success) {
        await loadCustomDomain();
        alert('Domain setup initiated. Please add the DNS records below.');
      }
    } catch (error) {
      console.error('Error setting up domain:', error);
      alert('Failed to setup domain: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDomain = async () => {
    try {
      setLoading(true);
      
      const response = await base44.functions.invoke('verifyCustomDomain', {
        domain_id: customDomain.id
      });

      setVerificationStatus(response.data);
      await loadCustomDomain();

      if (response.data.verified) {
        alert('Domain verified successfully! SSL certificate is being provisioned.');
      } else {
        alert(response.data.message || 'Domain verification pending. Please ensure DNS records are configured correctly.');
      }
    } catch (error) {
      console.error('Error verifying domain:', error);
      alert('Failed to verify domain: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'verified': return 'bg-blue-100 text-blue-800';
      case 'provisioning_ssl': return 'bg-yellow-100 text-yellow-800';
      case 'dns_pending': return 'bg-orange-100 text-orange-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Custom Domain & SSL
        </CardTitle>
        <CardDescription>
          Set up a custom domain for your white-label POS system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!customDomain ? (
          <>
            <Alert>
              <Globe className="h-4 w-4" />
              <AlertDescription>
                Set up a custom domain (e.g., pos.yourbrand.com) to fully white-label your POS system. 
                SSL certificates are automatically provisioned.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <Label htmlFor="domain">Custom Domain</Label>
                <Input
                  id="domain"
                  placeholder="pos.yourbrand.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the domain or subdomain you want to use
                </p>
              </div>

              <Button onClick={handleSetupDomain} disabled={loading || !domain}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4 mr-2" />
                    Setup Domain
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Domain Status */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="font-semibold text-lg">{customDomain.domain}</p>
                <p className="text-sm text-gray-500">Custom Domain</p>
              </div>
              <Badge className={getStatusColor(customDomain.status)}>
                {customDomain.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>

            {/* SSL Status */}
            {customDomain.ssl_status && (
              <div className="flex items-center gap-2 p-4 border rounded-lg">
                <Shield className={`w-5 h-5 ${customDomain.ssl_status === 'active' ? 'text-green-500' : 'text-yellow-500'}`} />
                <div>
                  <p className="font-medium">SSL Certificate</p>
                  <p className="text-sm text-gray-500">
                    Status: {customDomain.ssl_status}
                    {customDomain.ssl_expires_at && ` • Expires: ${new Date(customDomain.ssl_expires_at).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
            )}

            {/* DNS Records */}
            {customDomain.dns_records && customDomain.dns_records.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  DNS Records
                </h4>
                <p className="text-sm text-gray-600">
                  Add these DNS records to your domain registrar:
                </p>

                {customDomain.dns_records.map((record, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{record.type}</Badge>
                      {record.verified ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-orange-500" />
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Name</p>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                            {record.name}
                          </code>
                          <button
                            onClick={() => copyToClipboard(record.name)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-500">Value</p>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded truncate">
                            {record.value}
                          </code>
                          <button
                            onClick={() => copyToClipboard(record.value)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              {customDomain.status !== 'active' && (
                <Button onClick={handleVerifyDomain} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Verify Domain
                    </>
                  )}
                </Button>
              )}

              {customDomain.status === 'active' && (
                <Alert className="bg-green-50 text-green-800 border-green-200">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your custom domain is active and SSL secured! 
                    <a 
                      href={`https://${customDomain.domain}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="ml-2 underline inline-flex items-center gap-1"
                    >
                      Visit site <ExternalLink className="w-3 h-3" />
                    </a>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Help Text */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Next steps:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Add the DNS records shown above to your domain registrar</li>
                  <li>Wait 5-10 minutes for DNS propagation</li>
                  <li>Click "Verify Domain" to check DNS records</li>
                  <li>SSL certificate will be provisioned automatically once verified</li>
                </ol>
              </AlertDescription>
            </Alert>
          </>
        )}
      </CardContent>
    </Card>
  );
}