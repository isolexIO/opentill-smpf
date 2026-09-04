import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Globe, CheckCircle, Copy, ExternalLink } from 'lucide-react';
import SNSSubdomainRegistration from '@/components/dealer/SNSSubdomainRegistration';

const PARENT_DOMAIN = 'openTILL.io';

export default function Web3IdentityTab({ merchant }) {
  const [sub, setSub] = useState(merchant?.opentill_subdomain || null);
  const [status, setStatus] = useState(merchant?.subdomain_status || 'none');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSub(merchant?.opentill_subdomain || null);
    setStatus(merchant?.subdomain_status || 'none');
  }, [merchant?.id, merchant?.opentill_subdomain, merchant?.subdomain_status]);

  const full = sub ? `${sub}.${PARENT_DOMAIN}` : null;

  const refresh = async () => {
    try {
      const refreshed = await base44.entities.Merchant.get(merchant.id);
      if (refreshed) {
        setSub(refreshed.opentill_subdomain || null);
        setStatus(refreshed.subdomain_status || 'none');
        window.dispatchEvent(new CustomEvent('merchant-updated', { detail: refreshed }));
      }
    } catch {
      /* ignore */
    }
  };

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" /> openTILL Identity
          </CardTitle>
          <CardDescription>Your auto-assigned *.{PARENT_DOMAIN} subdomain</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {full ? (
            <>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-semibold text-lg break-all">{full}</p>
                  <p className="text-sm text-gray-500">DNS Subdomain</p>
                </div>
                <Badge className={status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                  {status}
                </Badge>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => copy(full)}>
                  {copied ? <CheckCircle className="w-4 h-4 mr-1 text-green-600" /> : <Copy className="w-4 h-4 mr-1" />}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
                <a href={`https://${full}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4 mr-1" /> Visit
                  </Button>
                </a>
              </div>
            </>
          ) : (
            <p className="text-gray-500 text-sm">
              Your subdomain will be assigned automatically when your account is activated.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Optional on-chain SNS identity (advanced) */}
      <SNSSubdomainRegistration ownerType="merchant" ownerId={merchant.id} onUpdate={refresh} />
    </div>
  );
}