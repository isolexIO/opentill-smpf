import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
} from '@/components/ui/dialog';
import { 
  DollarSign, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Eye,
  Calendar,
  Loader2,
  Settings,
  BarChart3
} from 'lucide-react';
import CommissionBreakdown from './CommissionBreakdown';
import PayoutMethodSettings from './PayoutMethodSettings';
import PayoutThresholdSettings from './PayoutThresholdSettings';

export default function PayoutDashboard({ dealer, onUpdate }) {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [stats, setStats] = useState({
    totalEarned: 0,
    pendingAmount: 0,
    lastPayoutDate: null,
    nextPayoutDate: null
  });

  useEffect(() => {
    loadPayouts();
  }, [dealer]);

  const loadPayouts = async () => {
    try {
      setLoading(true);

      // Load payout history
      const payoutList = await base44.entities.DealerPayout.filter({
        dealer_id: dealer.id
      }, '-created_date', 50);

      setPayouts(payoutList);

      // Calculate stats
      const totalEarned = payoutList
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.commission_amount, 0);

      const pendingAmount = payoutList
        .filter(p => ['pending', 'scheduled', 'on_hold'].includes(p.status))
        .reduce((sum, p) => sum + p.commission_amount, 0);

      const completedPayouts = payoutList.filter(p => p.status === 'completed');
      const lastPayout = completedPayouts.length > 0 ? completedPayouts[0] : null;

      // Calculate next payout date
      const pendingPayouts = payoutList.filter(p => p.status === 'pending');
      const nextPayout = pendingPayouts.length > 0 ? pendingPayouts[0] : null;

      setStats({
        totalEarned,
        pendingAmount,
        lastPayoutDate: lastPayout?.processed_at,
        nextPayoutDate: nextPayout?.scheduled_at
      });

      // Load preview of upcoming payout
      await loadPreview();

    } catch (error) {
      console.error('Error loading payouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPreview = async () => {
    try {
      const response = await base44.functions.invoke('previewDealerPayout', {
        dealer_id: dealer.id
      });

      if (response.data.success) {
        setPreview(response.data.preview);
      }
    } catch (error) {
      console.error('Error loading payout preview:', error);
    }
  };

  const handleViewDetails = async (payout) => {
    try {
      // Load payout line items
      const items = await base44.entities.DealerPayoutItem.filter({
        payout_id: payout.id
      });

      setSelectedPayout({ ...payout, items });
    } catch (error) {
      console.error('Error loading payout details:', error);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { variant: 'outline', text: 'Pending' },
      scheduled: { variant: 'default', text: 'Scheduled', className: 'bg-blue-500' },
      processing: { variant: 'default', text: 'Processing', className: 'bg-yellow-500' },
      completed: { variant: 'default', text: 'Completed', className: 'bg-green-500' },
      failed: { variant: 'destructive', text: 'Failed' },
      canceled: { variant: 'secondary', text: 'Canceled' },
      on_hold: { variant: 'outline', text: 'On Hold', className: 'border-orange-500' }
    };

    const badge = badges[status] || badges.pending;
    return <Badge variant={badge.variant} className={badge.className}>{badge.text}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview" className="flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          <span className="hidden sm:inline">Overview</span>
        </TabsTrigger>
        <TabsTrigger value="breakdown" className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          <span className="hidden sm:inline">Commission</span>
        </TabsTrigger>
        <TabsTrigger value="methods" className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span className="hidden sm:inline">Methods</span>
        </TabsTrigger>
        <TabsTrigger value="settings" className="flex items-center gap-2">
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">Settings</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Earned</p>
                <p className="text-2xl font-bold">${stats.totalEarned.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Payout</p>
                <p className="text-2xl font-bold">${stats.pendingAmount.toFixed(2)}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Last Payout</p>
                <p className="text-sm font-semibold">
                  {stats.lastPayoutDate 
                    ? new Date(stats.lastPayoutDate).toLocaleDateString()
                    : 'No payouts yet'}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Next Payout</p>
                <p className="text-sm font-semibold">
                  {stats.nextPayoutDate 
                    ? new Date(stats.nextPayoutDate).toLocaleDateString()
                    : 'Not scheduled'}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Payout Preview */}
      {preview && preview.commission_amount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Payout</CardTitle>
            <CardDescription>
              Preview of next scheduled commission payout
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Period</p>
                <p className="font-semibold">
                  {new Date(preview.period_start).toLocaleDateString()} - {new Date(preview.period_end).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Gross Revenue</p>
                <p className="font-semibold">${preview.gross_amount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Your Commission ({preview.commission_percent}%)</p>
                <p className="font-semibold text-green-600">${preview.commission_amount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Scheduled For</p>
                <p className="font-semibold">{new Date(preview.scheduled_for).toLocaleDateString()}</p>
              </div>
            </div>

            {!preview.meets_minimum && (
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Amount is below minimum payout threshold of ${preview.minimum_payout}. 
                  This will carry over to the next payout period.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payout History */}
      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
          <CardDescription>
            All commission payouts and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No payouts yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell>
                      {new Date(payout.period_start).toLocaleDateString()} - {new Date(payout.period_end).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-semibold">
                      ${payout.commission_amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {payout.payout_method === 'stripe_connect' ? 'Stripe' : 
                       payout.payout_method === 'solana' ? 'Solana' : 'Manual'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(payout.status)}
                    </TableCell>
                    <TableCell>
                      {payout.processed_at 
                        ? new Date(payout.processed_at).toLocaleDateString()
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(payout)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payout Details Dialog */}
      {selectedPayout && (
        <Dialog open={!!selectedPayout} onOpenChange={() => setSelectedPayout(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Payout Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Period</p>
                  <p className="font-semibold">
                    {new Date(selectedPayout.period_start).toLocaleDateString()} - {new Date(selectedPayout.period_end).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedPayout.status)}</div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Commission Amount</p>
                  <p className="font-semibold text-green-600">${selectedPayout.commission_amount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Processing Fees</p>
                  <p className="font-semibold">${(selectedPayout.fees || 0).toFixed(2)}</p>
                </div>
              </div>

              {selectedPayout.items && selectedPayout.items.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Contributing Merchants</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Merchant</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Commission</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPayout.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.merchant_name}</TableCell>
                          <TableCell>${item.amount.toFixed(2)}</TableCell>
                          <TableCell>${(item.amount * (item.commission_percent / 100)).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {selectedPayout.notes && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Notes</p>
                  <p className="text-sm">{selectedPayout.notes}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}