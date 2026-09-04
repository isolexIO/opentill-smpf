import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Globe, CheckCircle, Clock, XCircle,
  RefreshCw, Ban, ExternalLink, Copy
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const PARENT_DOMAIN = 'openTILL.io';

export default function SubdomainManager({ merchant, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  const subdomain = merchant?.opentill_subdomain;
  const status = merchant?.subdomain_status || (subdomain ? 'pending' : 'none');
  const fullDomain = subdomain ? `${subdomain}.${PARENT_DOMAIN}` : null;

  const getStatusBadge = (s) => {
    switch (s) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'disabled':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Disabled</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">None</Badge>;
    }
  };

  const run = async (payload) => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('assignEntitySubdomain', payload);
      if (data.success) {
        if (onUpdate) onUpdate();
      } else {
        alert(data.error || 'Failed');
      }
    } catch (e) {
      alert('Failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setShowDialog(false);
    await run({ entity_type: 'merchant', entity_id: merchant.id, force: true });
  };

  const handleDisable = async () => {
    if (!confirm('Disable this subdomain? It will stop resolving until re-enabled.')) return;
    await run({ entity_type: 'merchant', entity_id: merchant.id, disable: true });
  };

  const handleEnable = async () => {
    await run({ entity_type: 'merchant', entity_id: merchant.id });
  };

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              openTILL Identity
            </CardTitle>
            <CardDescription>Auto-assigned *.{PARENT_DOMAIN} DNS subdomain</CardDescription>
          </div>
          {getStatusBadge(status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {fullDomain ? (
          <>
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
              <div className="text-sm text-gray-600 mb-1">Current Subdomain</div>
              <div className="text-xl font-bold text-purple-900 break-all">{fullDomain}</div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Status</span>
                <span className="font-medium">{status}</span>
              </div>
              {merchant.subdomain_wallet && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Linked Wallet</span>
                  <span className="font-mono text-xs">{merchant.subdomain_wallet.slice(0, 6)}...{merchant.subdomain_wallet.slice(-4)}</span>
                </div>
              )}
              {merchant.subdomain_approved_at && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Assigned</span>
                  <span>{new Date(merchant.subdomain_approved_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => copy(fullDomain)}>
                {copied ? <CheckCircle className="w-4 h-4 mr-1 text-green-600" /> : <Copy className="w-4 h-4 mr-1" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <a href={`https://${fullDomain}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <ExternalLink className="w-4 h-4 mr-1" /> Visit
                </Button>
              </a>
              <Button variant="outline" size="sm" onClick={() => setShowDialog(true)} disabled={loading}>
                <RefreshCw className="w-4 h-4 mr-1" /> Regenerate
              </Button>
              {status !== 'disabled' ? (
                <Button variant="destructive" size="sm" onClick={handleDisable} disabled={loading}>
                  <Ban className="w-4 h-4 mr-1" /> Disable
                </Button>
              ) : (
                <Button size="sm" onClick={handleEnable} disabled={loading}>
                  <CheckCircle className="w-4 h-4 mr-1" /> Re-enable
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-6 space-y-3">
            <p className="text-gray-500">No subdomain assigned yet.</p>
            <Button onClick={() => run({ entity_type: 'merchant', entity_id: merchant.id })} disabled={loading}>
              <Globe className="w-4 h-4 mr-2" /> Assign subdomain
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate subdomain?</DialogTitle>
            <DialogDescription>
              A new unique subdomain will be generated from the business name. The old one will be replaced.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleRegenerate}>Regenerate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}