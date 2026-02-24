import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Globe, CheckCircle, Clock, XCircle, Copy, 
  ExternalLink, Loader2, AlertCircle 
} from 'lucide-react';

export default function Web3IdentityTab({ merchant }) {
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [customName, setCustomName] = useState('');
  const [subdomain, setSubdomain] = useState(null);
  const [status, setStatus] = useState('pending');

  useEffect(() => {
    if (merchant) {
      setSubdomain(merchant.opentill_subdomain);
      setStatus(merchant.subdomain_status || 'pending');
    }
  }, [merchant]);

  const handleRequestSubdomain = async () => {
    setRequesting(true);
    try {
      const { data } = await base44.functions.invoke('generateMerchantSubdomain', {
        merchant_id: merchant.id,
        action: 'request',
        new_subdomain: customName || merchant.business_name
      });

      if (data.success) {
        setSubdomain(data.subdomain);
        setStatus(data.status);
        alert('Subdomain requested successfully! Awaiting Super Admin approval.');
        window.location.reload();
      } else {
        alert(data.error || 'Failed to request subdomain');
      }
    } catch (error) {
      console.error('Request error:', error);
      alert('Failed to request subdomain: ' + error.message);
    } finally {
      setRequesting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending Approval</Badge>;
      case 'disabled':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Disabled</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Not Requested</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                openTILL Identity & Subdomain
              </CardTitle>
              <CardDescription>
                Your unique .opentill-pos.sol subdomain identity
              </CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!subdomain ? (
            <>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Request a unique subdomain to establish your Web3 identity within the openTILL ecosystem.
                  This subdomain will be used for payments, receipts, and rewards attribution.
                </AlertDescription>
              </Alert>

              <div>
                <Label>Custom Subdomain Name (Optional)</Label>
                <Input
                  placeholder={`${merchant?.business_name?.toLowerCase().replace(/[^a-z0-9-]/g, '-') || 'my-business'}`}
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value.toLowerCase())}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Leave empty to auto-generate from your business name. Only lowercase, numbers, and hyphens allowed.
                </p>
              </div>

              <Button 
                onClick={handleRequestSubdomain} 
                disabled={requesting}
                className="w-full"
              >
                {requesting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Globe className="w-4 h-4 mr-2" />}
                Request Subdomain
              </Button>
            </>
          ) : (
            <>
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm text-gray-600">Your Subdomain</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(subdomain)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <div className="text-2xl font-bold text-purple-900 break-all">
                  {subdomain}.opentill-pos.sol
                </div>
              </div>

              {status === 'pending' && (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    Your subdomain is awaiting Super Admin approval. You'll be notified once it's activated.
                  </AlertDescription>
                </Alert>
              )}

              {status === 'active' && (
                <>
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Your subdomain is <strong>active</strong> and can be used for payments, receipts, and identity verification.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    <h4 className="font-semibold">Subdomain Details</h4>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Status</span>
                        <span className="text-sm font-medium text-green-600">Active</span>
                      </div>
                      {merchant.subdomain_wallet && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Linked Wallet</span>
                          <span className="text-sm font-mono">{merchant.subdomain_wallet.slice(0, 6)}...{merchant.subdomain_wallet.slice(-4)}</span>
                        </div>
                      )}
                      {merchant.subdomain_approved_at && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Approved</span>
                          <span className="text-sm">{new Date(merchant.subdomain_approved_at).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {status === 'disabled' && (
                <Alert className="bg-red-50 border-red-200">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    Your subdomain has been disabled. Contact support for more information.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">What is a .opentill-pos.sol subdomain?</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
              <span>Acts as your unique Web3 identity within the openTILL ecosystem</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
              <span>Used for payment receipts, customer identification, and rewards attribution</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
              <span>Linked to your primary admin wallet for ownership verification</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
              <span>Can be used with NFC/QR codes for contactless payments</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}