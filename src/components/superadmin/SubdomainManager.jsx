import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Globe, CheckCircle, Clock, XCircle, 
  RefreshCw, Edit, Ban 
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function SubdomainManager({ merchant, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [action, setAction] = useState('');
  const [newSubdomain, setNewSubdomain] = useState('');

  const getStatusBadge = (status) => {
    switch (status) {
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

  const handleAction = async (actionType) => {
    setAction(actionType);
    if (actionType === 'regenerate') {
      setShowDialog(true);
    } else {
      executeAction(actionType);
    }
  };

  const executeAction = async (actionType, customName = null) => {
    setLoading(true);
    setShowDialog(false);
    try {
      const { data } = await base44.functions.invoke('generateMerchantSubdomain', {
        merchant_id: merchant.id,
        action: actionType,
        new_subdomain: customName
      });

      if (data.success) {
        alert(`Subdomain ${actionType}d successfully!`);
        if (onUpdate) onUpdate();
      } else {
        alert(data.error || `Failed to ${actionType} subdomain`);
      }
    } catch (error) {
      console.error('Action error:', error);
      alert(`Failed to ${actionType} subdomain: ` + error.message);
    } finally {
      setLoading(false);
      setNewSubdomain('');
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Merchant Subdomain
              </CardTitle>
              <CardDescription>
                Manage .chainlink-pos.sol subdomain identity
              </CardDescription>
            </div>
            {getStatusBadge(merchant.subdomain_status || 'none')}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {merchant.chainlink_subdomain ? (
            <>
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
                <div className="text-sm text-gray-600 mb-1">Current Subdomain</div>
                <div className="text-xl font-bold text-purple-900 break-all">
                  {merchant.chainlink_subdomain}.chainlink-pos.sol
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Status</span>
                  <span className="font-medium">{merchant.subdomain_status || 'pending'}</span>
                </div>
                {merchant.subdomain_wallet && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Linked Wallet</span>
                    <span className="font-mono text-xs">{merchant.subdomain_wallet.slice(0, 6)}...{merchant.subdomain_wallet.slice(-4)}</span>
                  </div>
                )}
                {merchant.subdomain_requested_at && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Requested</span>
                    <span>{new Date(merchant.subdomain_requested_at).toLocaleDateString()}</span>
                  </div>
                )}
                {merchant.subdomain_approved_at && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Approved</span>
                    <span>{new Date(merchant.subdomain_approved_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {merchant.subdomain_status === 'pending' && (
                  <Button
                    onClick={() => handleAction('approve')}
                    disabled={loading}
                    className="flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                )}
                
                <Button
                  onClick={() => handleAction('regenerate')}
                  disabled={loading}
                  variant="outline"
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Regenerate
                </Button>

                {merchant.subdomain_status !== 'disabled' && (
                  <Button
                    onClick={() => handleAction('disable')}
                    disabled={loading}
                    variant="destructive"
                    className="flex-1"
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    Disable
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No subdomain requested yet
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate Subdomain</DialogTitle>
            <DialogDescription>
              Enter a new subdomain name or leave empty to auto-generate
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="new-subdomain-name"
            value={newSubdomain}
            onChange={(e) => setNewSubdomain(e.target.value.toLowerCase())}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => executeAction('regenerate', newSubdomain)}>
              Regenerate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}