import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Eye, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

export default function PayoutControl() {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [actionDialog, setActionDialog] = useState({ open: false, payout: null, action: null });
  const [processAmount, setProcessAmount] = useState('');

  useEffect(() => {
    loadPayouts();
  }, []);

  const loadPayouts = async () => {
    try {
      setLoading(true);
      const payoutList = await base44.entities.DealerPayout.list('-created_date', 100);
      setPayouts(payoutList);
    } catch (error) {
      console.error('Error loading payouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (payout) => {
    try {
      const items = await base44.entities.DealerPayoutItem.filter({
        payout_id: payout.id
      });
      setSelectedPayout({ ...payout, items });
    } catch (error) {
      console.error('Error loading payout details:', error);
    }
  };

  const handleApprove = async () => {
    try {
      await base44.entities.DealerPayout.update(actionDialog.payout.id, {
        status: 'approved',
        approved_by: (await base44.auth.me()).email,
        approved_at: new Date().toISOString()
      });
      await loadPayouts();
      setActionDialog({ open: false, payout: null, action: null });
    } catch (error) {
      console.error('Error approving payout:', error);
      alert('Failed to approve payout');
    }
  };

  const handleReject = async () => {
    try {
      await base44.entities.DealerPayout.update(actionDialog.payout.id, {
        status: 'rejected',
        rejected_by: (await base44.auth.me()).email,
        rejected_at: new Date().toISOString()
      });
      await loadPayouts();
      setActionDialog({ open: false, payout: null, action: null });
    } catch (error) {
      console.error('Error rejecting payout:', error);
      alert('Failed to reject payout');
    }
  };

  const handleProcess = async () => {
    try {
      const response = await base44.functions.invoke('triggerManualPayout', {
        payout_id: actionDialog.payout.id,
        manual_override_amount: processAmount ? parseFloat(processAmount) : null
      });

      if (response.data.success) {
        await loadPayouts();
        setActionDialog({ open: false, payout: null, action: null });
        setProcessAmount('');
        alert('Payout processed successfully');
      } else {
        alert('Failed to process payout: ' + response.data.error);
      }
    } catch (error) {
      console.error('Error processing payout:', error);
      alert('Failed to process payout');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { variant: 'outline', text: 'Pending Approval', color: 'text-yellow-600' },
      approved: { variant: 'default', text: 'Approved', className: 'bg-blue-500' },
      processing: { variant: 'default', text: 'Processing', className: 'bg-purple-500' },
      completed: { variant: 'default', text: 'Completed', className: 'bg-green-500' },
      rejected: { variant: 'destructive', text: 'Rejected' },
      failed: { variant: 'destructive', text: 'Failed' },
      on_hold: { variant: 'outline', text: 'On Hold' }
    };

    const badge = badges[status] || badges.pending;
    return <Badge variant={badge.variant} className={badge.className}>{badge.text}</Badge>;
  };

  const stats = {
    pending: payouts.filter(p => p.status === 'pending').length,
    approved: payouts.filter(p => p.status === 'approved').length,
    totalAmount: payouts
      .filter(p => ['completed', 'processing', 'approved'].includes(p.status))
      .reduce((sum, p) => sum + (p.commission_amount || 0), 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Approval</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Approved Ready</p>
                <p className="text-2xl font-bold">{stats.approved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Processing</p>
                <p className="text-2xl font-bold">${stats.totalAmount.toFixed(0)}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payouts List */}
      <Card>
        <CardHeader>
          <CardTitle>Payout Control Center</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ambassador</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.map((payout) => (
                <TableRow key={payout.id}>
                  <TableCell className="font-medium">
                    {payout.dealer_name || 'N/A'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(payout.period_start).toLocaleDateString()} - {new Date(payout.period_end).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-semibold">
                    ${payout.commission_amount?.toFixed(2) || '0.00'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {payout.payout_method === 'stripe_connect' ? 'Stripe' :
                     payout.payout_method === 'solana' ? 'Solana' : 'Manual'}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(payout.status)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(payout.created_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(payout)}
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>

                      {payout.status === 'pending' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActionDialog({ open: true, payout, action: 'approve' })}
                            className="text-green-600 hover:bg-green-50"
                            title="Approve"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActionDialog({ open: true, payout, action: 'reject' })}
                            className="text-red-600 hover:bg-red-50"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}

                      {payout.status === 'approved' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActionDialog({ open: true, payout, action: 'process' })}
                          className="text-blue-600 hover:bg-blue-50"
                          title="Process payout"
                        >
                          Process
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {payouts.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No payouts to manage
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      {selectedPayout && (
        <Dialog open={!!selectedPayout} onOpenChange={() => setSelectedPayout(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Payout Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Ambassador</p>
                  <p className="font-semibold">{selectedPayout.dealer_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedPayout.status)}</div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Period</p>
                  <p className="font-semibold">
                    {new Date(selectedPayout.period_start).toLocaleDateString()} - {new Date(selectedPayout.period_end).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Commission Amount</p>
                  <p className="font-semibold text-green-600">${selectedPayout.commission_amount?.toFixed(2)}</p>
                </div>
              </div>

              {selectedPayout.items && selectedPayout.items.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Contributing Merchants</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Merchant</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Commission</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPayout.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.merchant_name}</TableCell>
                          <TableCell>${item.amount?.toFixed(2)}</TableCell>
                          <TableCell>${(item.amount * (item.commission_percent / 100))?.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {selectedPayout.approved_by && (
                <div className="bg-green-50 p-3 rounded-lg text-sm">
                  <p className="text-gray-600">
                    Approved by <span className="font-semibold">{selectedPayout.approved_by}</span> on {new Date(selectedPayout.approved_at).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => !open && setActionDialog({ open: false, payout: null, action: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === 'approve' && 'Approve Payout'}
              {actionDialog.action === 'reject' && 'Reject Payout'}
              {actionDialog.action === 'process' && 'Process Payout'}
            </DialogTitle>
          </DialogHeader>

          {actionDialog.payout && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">{actionDialog.payout.dealer_name}</span> - ${actionDialog.payout.commission_amount?.toFixed(2)}
                </p>
              </div>

              {actionDialog.action === 'approve' && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This payout will be marked as approved and ready for processing.
                  </AlertDescription>
                </Alert>
              )}

              {actionDialog.action === 'reject' && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This payout will be rejected and the ambassador will be notified.
                  </AlertDescription>
                </Alert>
              )}

              {actionDialog.action === 'process' && (
                <>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Process this payout to {actionDialog.payout.payout_method === 'stripe_connect' ? 'Stripe' : actionDialog.payout.payout_method === 'solana' ? 'Solana' : 'manual'} account.
                    </AlertDescription>
                  </Alert>

                  <div>
                    <Label>Override Amount (Optional)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={processAmount}
                      onChange={(e) => setProcessAmount(e.target.value)}
                      placeholder={`Leave empty to use ${actionDialog.payout.commission_amount?.toFixed(2)}`}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog({ open: false, payout: null, action: null })}
            >
              Cancel
            </Button>
            {actionDialog.action === 'approve' && (
              <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
                Approve
              </Button>
            )}
            {actionDialog.action === 'reject' && (
              <Button onClick={handleReject} className="bg-red-600 hover:bg-red-700">
                Reject
              </Button>
            )}
            {actionDialog.action === 'process' && (
              <Button onClick={handleProcess} className="bg-blue-600 hover:bg-blue-700">
                Process
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}