import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link2, CheckCircle, Clock, XCircle, RefreshCw, Globe } from 'lucide-react';

export default function DealerSubdomainManager({ dealer, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [customName, setCustomName] = useState('');
  const [error, setError] = useState('');

  const getStatusBadge = () => {
    if (!dealer.chainlink_subdomain) {
      return <Badge variant="outline">No Subdomain</Badge>;
    }

    switch (dealer.subdomain_status) {
      case 'active':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'disabled':
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Disabled
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const handleApprove = async () => {
    setLoading(true);
    setError('');
    try {
      await base44.entities.Dealer.update(dealer.id, {
        subdomain_status: 'active',
        subdomain_approved_at: new Date().toISOString()
      });
      
      await base44.entities.SystemLog.create({
        log_type: 'super_admin_action',
        action: 'Dealer Subdomain Approved',
        description: `Approved .chainlink-pos.sol subdomain "${dealer.chainlink_subdomain}" for dealer "${dealer.name}"`,
        user_email: (await base44.auth.me()).email,
        metadata: {
          dealer_id: dealer.id,
          subdomain: dealer.chainlink_subdomain
        }
      });

      alert('Subdomain approved successfully!');
      onUpdate();
    } catch (err) {
      console.error('Error approving subdomain:', err);
      setError('Failed to approve subdomain: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!customName.trim()) {
      setError('Please enter a subdomain name');
      return;
    }

    const subdomainName = customName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/(^-|-$)/g, '');
    
    setLoading(true);
    setError('');
    try {
      await base44.entities.Dealer.update(dealer.id, {
        chainlink_subdomain: subdomainName,
        subdomain_status: 'active',
        subdomain_requested_at: new Date().toISOString(),
        subdomain_approved_at: new Date().toISOString()
      });

      await base44.entities.SystemLog.create({
        log_type: 'super_admin_action',
        action: 'Dealer Subdomain Regenerated',
        description: `Regenerated subdomain for dealer "${dealer.name}" to "${subdomainName}.chainlink-pos.sol"`,
        user_email: (await base44.auth.me()).email,
        metadata: {
          dealer_id: dealer.id,
          old_subdomain: dealer.chainlink_subdomain,
          new_subdomain: subdomainName
        }
      });

      alert('Subdomain regenerated successfully!');
      setShowRegenerateDialog(false);
      setCustomName('');
      onUpdate();
    } catch (err) {
      console.error('Error regenerating subdomain:', err);
      setError('Failed to regenerate subdomain: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!confirm('Are you sure you want to disable this subdomain?')) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      await base44.entities.Dealer.update(dealer.id, {
        subdomain_status: 'disabled'
      });

      await base44.entities.SystemLog.create({
        log_type: 'super_admin_action',
        action: 'Dealer Subdomain Disabled',
        description: `Disabled subdomain "${dealer.chainlink_subdomain}.chainlink-pos.sol" for dealer "${dealer.name}"`,
        user_email: (await base44.auth.me()).email,
        metadata: {
          dealer_id: dealer.id,
          subdomain: dealer.chainlink_subdomain
        }
      });

      alert('Subdomain disabled successfully!');
      onUpdate();
    } catch (err) {
      console.error('Error disabling subdomain:', err);
      setError('Failed to disable subdomain: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Subdomain (.chainlink-pos.sol)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {dealer.chainlink_subdomain ? (
            <>
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Globe className="w-4 h-4 text-gray-500" />
                    <span className="font-mono font-medium">
                      {dealer.chainlink_subdomain}.chainlink-pos.sol
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {dealer.subdomain_requested_at && (
                      <>Requested: {new Date(dealer.subdomain_requested_at).toLocaleDateString()}</>
                    )}
                    {dealer.subdomain_approved_at && (
                      <> • Approved: {new Date(dealer.subdomain_approved_at).toLocaleDateString()}</>
                    )}
                  </p>
                  {dealer.subdomain_wallet && (
                    <p className="text-xs text-gray-400 mt-1 font-mono">
                      Linked Wallet: {dealer.subdomain_wallet.substring(0, 8)}...{dealer.subdomain_wallet.substring(dealer.subdomain_wallet.length - 6)}
                    </p>
                  )}
                </div>
                {getStatusBadge()}
              </div>

              <div className="flex gap-2">
                {dealer.subdomain_status === 'pending' && (
                  <Button onClick={handleApprove} disabled={loading}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                )}
                {dealer.subdomain_status === 'active' && (
                  <Button variant="outline" onClick={handleDisable} disabled={loading}>
                    <XCircle className="w-4 h-4 mr-2" />
                    Disable
                  </Button>
                )}
                <Button variant="outline" onClick={() => setShowRegenerateDialog(true)} disabled={loading}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Regenerate
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <Link2 className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600 mb-4">No subdomain assigned to this dealer</p>
              <Button onClick={() => setShowRegenerateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Generate Subdomain
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Regenerate Dialog */}
      <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Subdomain</DialogTitle>
            <DialogDescription>
              Create a unique .chainlink-pos.sol subdomain for this dealer
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div>
              <Label>Subdomain Name</Label>
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                placeholder="dealer-name"
              />
              <p className="text-sm text-gray-500 mt-1">
                Will become: <span className="font-mono">{customName || 'dealer-name'}.chainlink-pos.sol</span>
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRegenerateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRegenerate} disabled={loading || !customName.trim()}>
              {loading ? 'Generating...' : 'Generate Subdomain'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}