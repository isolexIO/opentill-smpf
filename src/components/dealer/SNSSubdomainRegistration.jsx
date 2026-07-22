import { useState } from 'react';
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
  Copy,
  ExternalLink,
} from 'lucide-react';

const PARENT_DOMAIN = 'opentill.sol';

export default function SNSSubdomainRegistration({ dealer, onUpdate }) {
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const current = dealer?.opentill_subdomain;
  const isActive = dealer?.subdomain_status === 'active';
  const fullDomain = current ? `${current}.${PARENT_DOMAIN}` : null;

  const cleanLabel = (val) =>
    val.toLowerCase().trim().replace(new RegExp('\\.' + PARENT_DOMAIN + '$'), '').replace(/\.sol$/, '');

  const handleSubmit = async () => {
    setError(null);
    setResult(null);
    const clean = cleanLabel(label);
    if (!/^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(clean)) {
      setError('Subdomain must be 3-32 chars: lowercase letters, numbers, and hyphens (no leading/trailing hyphen).');
      return;
    }
    try {
      setLoading(true);
      const res = await base44.functions.invoke('registerAmbassadorSNSSubdomain', {
        ambassador_id: dealer.id,
        subdomain: clean,
      });
      const data = res?.data || {};
      if (data.success) {
        setResult({ subdomain: data.subdomain, tx_signature: data.tx_signature });
        setLabel('');
        await onUpdate?.();
      } else {
        setError(data.error || 'Registration failed.');
      }
    } catch (e) {
      setError(e.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5" />
          SNS Subdomain Registration
        </CardTitle>
        <CardDescription>
          Register your unique *.{PARENT_DOMAIN} subdomain on the Solana Name Service
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isActive && fullDomain ? (
          <>
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="font-semibold text-lg">{fullDomain}</p>
                <p className="text-sm text-gray-500">SNS Subdomain</p>
              </div>
              <Badge className="bg-green-100 text-green-800">Active</Badge>
            </div>

            {result?.tx_signature && (
              <div className="text-xs text-gray-500 break-all font-mono">
                Tx: {result.tx_signature}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => copy(fullDomain)}>
                {copied ? <CheckCircle className="w-4 h-4 mr-1 text-green-600" /> : <Copy className="w-4 h-4 mr-1" />}
                {copied ? 'Copied!' : 'Copy Domain'}
              </Button>
              <a href={`https://sns.id/domain/${fullDomain}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <ExternalLink className="w-4 h-4 mr-1" /> View on SNS
                </Button>
              </a>
            </div>

            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Your subdomain is registered on-chain via Solana Name Service and owned by the openTILL
                authority wallet. It resolves to your ambassador portal.
              </AlertDescription>
            </Alert>
          </>
        ) : (
          <>
            <Alert>
              <Globe className="h-4 w-4" />
              <AlertDescription>
                Claim your <strong>*.{PARENT_DOMAIN}</strong> subdomain. Registration is minted on the
                Solana Name Service by the openTILL authority wallet — no wallet connection required.
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="subdomain">Subdomain</Label>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  id="subdomain"
                  placeholder="yourbrand"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="flex-1"
                />
                <span className="text-sm text-gray-500 whitespace-nowrap">.{PARENT_DOMAIN}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                3-32 chars, lowercase letters, numbers, and hyphens.
              </p>
            </div>

            {error && (
              <Alert className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            {result && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Registered <strong>{result.subdomain}</strong>! Tx:{' '}
                  <span className="font-mono text-xs break-all">{result.tx_signature}</span>
                </AlertDescription>
              </Alert>
            )}

            <Button onClick={handleSubmit} disabled={loading || !label}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registering on SNS...
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4 mr-2" />
                  Register on SNS
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}