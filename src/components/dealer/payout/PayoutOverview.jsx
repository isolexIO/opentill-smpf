import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DollarSign, Clock, CheckCircle, Calendar, Eye, Zap, AlertCircle,
  Loader2, RefreshCw, TrendingUp, XCircle, ArrowUpRight
} from 'lucide-react';

const STATUS_CONFIG = {
  pending:       { label: 'Pending',        className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  scheduled:     { label: 'Scheduled',      className: 'bg-blue-100 text-blue-800 border-blue-200' },
  processing:    { label: 'Processing',     className: 'bg-purple-100 text-purple-800 border-purple-200' },
  completed:     { label: 'Completed',      className: 'bg-green-100 text-green-800 border-green-200' },
  failed:        { label: 'Failed',         className: 'bg-red-100 text-red-800 border-red-200' },
  canceled:      { label: 'Canceled',       className: 'bg-gray-100 text-gray-700 border-gray-200' },
  on_hold:       { label: 'On Hold',        className: 'bg-orange-100 text-orange-800 border-orange-200' },
  manual_review: { label: 'Manual Review',  className: 'bg-rose-100 text-rose-800 border-rose-200' },
};

export default function PayoutOverview({ dealer, onUpdate }) {
  const [payouts, setPayouts]           = useState([]);
  const [preview, setPreview]           = useState(null);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [triggeringId, setTriggeringId] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [stats, setStats]               = useState({ totalEarned: 0, pending: 0, lastDate: null, nextDate: null });

  useEffect(() => { load(); }, [dealer?.id]);

  const load = async () => {
    setLoading(true);
    await Promise.all([loadPayouts(), loadPreview()]);
    setLoading(false);
  };

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([loadPayouts(), loadPreview()]);
    setRefreshing(false);
    onUpdate?.();
  };

  const loadPayouts = async () => {
    const list = await base44.entities.DealerPayout.filter({ dealer_id: dealer.legacy_dealer_id || dealer.id }, '-created_date', 50);
    setPayouts(list);
    const earned = list.filter(p => p.status === 'completed').reduce((s, p) => s + (p.commission_amount || 0), 0);
    const pending = list.filter(p => ['pending', 'scheduled', 'on_hold'].includes(p.status)).reduce((s, p) => s + (p.commission_amount || 0), 0);
    const last = list.find(p => p.status === 'completed');
    const next = list.find(p => ['scheduled', 'pending'].includes(p.status));
    setStats({ totalEarned: earned, pending, lastDate: last?.processed_at, nextDate: next?.scheduled_at });
  };

  const loadPreview = async () => {
    try {
      const { data } = await base44.functions.invoke('previewDealerPayout', { dealer_id: dealer.legacy_dealer_id || dealer.id });
      if (data?.success) setPreview(data.preview);
    } catch { /* silent */ }
  };

  const handleTrigger = async (payout) => {
    if (!confirm(`Trigger instant payout of $${payout.commission_amount.toFixed(2)}?\n\nThis will attempt to process the payout immediately using your configured payout method.`)) return;
    setTriggeringId(payout.id);
    try {
      const { data } = await base44.functions.invoke('triggerManualPayout', { payout_id: payout.id });
      if (data?.success) {
        alert(`✓ Payout triggered successfully!`);
        await refresh();
      } else {
        alert(`Failed: ${data?.error || 'Unknown error'}`);
      }
    } catch (e) {
      alert(`Error: ${e.message}`);
    } finally {
      setTriggeringId(null);
    }
  };

  const handleViewDetails = async (payout) => {
    const items = await base44.entities.DealerPayoutItem.filter({ payout_id: payout.id });
    setSelectedPayout({ ...payout, items });
  };

  const statusBadge = (status) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    return <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>;
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
    </div>
  );

  const canTrigger = (p) => ['pending', 'on_hold', 'failed', 'scheduled'].includes(p.status);

  return (
    <div className="space-y-6">
      {/* Refresh */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Earned', value: `$${stats.totalEarned.toFixed(2)}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Pending Payout', value: `$${stats.pending.toFixed(2)}`, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Last Payout', value: stats.lastDate ? new Date(stats.lastDate).toLocaleDateString() : 'None yet', icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Next Payout', value: stats.nextDate ? new Date(stats.nextDate).toLocaleDateString() : 'Not scheduled', icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 font-medium">{s.label}</span>
                <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
              </div>
              <div className="text-xl font-black text-gray-900">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upcoming Payout Preview */}
      {preview && (
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-emerald-900">Upcoming Payout Preview</CardTitle>
                <CardDescription className="text-emerald-700">
                  {new Date(preview.period_start).toLocaleDateString()} – {new Date(preview.period_end).toLocaleDateString()}
                </CardDescription>
              </div>
              <DollarSign className="w-8 h-8 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
              <div>
                <p className="text-emerald-600 font-medium text-xs uppercase tracking-wide">Gross Revenue</p>
                <p className="font-bold text-gray-900 text-lg">${(preview.gross_amount || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-emerald-600 font-medium text-xs uppercase tracking-wide">Your Commission ({preview.commission_percent}%)</p>
                <p className="font-bold text-emerald-700 text-lg">${(preview.commission_amount || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-emerald-600 font-medium text-xs uppercase tracking-wide">Est. Fees</p>
                <p className="font-bold text-gray-900 text-lg">${(preview.estimated_fees || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-emerald-600 font-medium text-xs uppercase tracking-wide">Net Payout</p>
                <p className="font-bold text-gray-900 text-lg">${(preview.net_payout || 0).toFixed(2)}</p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-emerald-200">
              <div className="flex items-center gap-2 text-sm text-emerald-700">
                <Calendar className="w-4 h-4" />
                Scheduled for <strong>{new Date(preview.scheduled_for).toLocaleDateString()}</strong>
                &nbsp;·&nbsp; {preview.merchant_count} merchants &nbsp;·&nbsp; {preview.subscription_count} subscriptions
              </div>
              {!preview.meets_minimum && (
                <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Below ${preview.minimum_payout} threshold
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payout History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
          <CardDescription>All commission payouts and instant trigger controls</CardDescription>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No payouts yet. Your first payout will appear here once commissions are calculated.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Processed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map((payout) => (
                    <TableRow key={payout.id} className="group">
                      <TableCell className="text-sm">
                        {new Date(payout.period_start).toLocaleDateString()} – {new Date(payout.period_end).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-bold text-gray-900">
                        ${(payout.commission_amount || 0).toFixed(2)}
                        {payout.carryover_amount > 0 && (
                          <span className="ml-1 text-xs text-orange-600 font-normal">(+${payout.carryover_amount.toFixed(2)} carry)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm capitalize">
                        {payout.payout_method === 'stripe_connect' ? '💳 Stripe' : payout.payout_method === 'solana' ? '◎ Solana' : '🏦 Manual'}
                      </TableCell>
                      <TableCell>{statusBadge(payout.status)}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {payout.processed_at ? new Date(payout.processed_at).toLocaleDateString() : (payout.scheduled_at ? `Sched. ${new Date(payout.scheduled_at).toLocaleDateString()}` : '—')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleViewDetails(payout)} title="View Details">
                            <Eye className="w-4 h-4" />
                          </Button>
                          {canTrigger(payout) && (
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3 text-xs"
                              onClick={() => handleTrigger(payout)}
                              disabled={triggeringId === payout.id}
                            >
                              {triggeringId === payout.id
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <><Zap className="w-3 h-3 mr-1" />Pay Now</>}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payout Details Dialog */}
      <Dialog open={!!selectedPayout} onOpenChange={() => setSelectedPayout(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-emerald-600" />
              Payout Reconciliation
            </DialogTitle>
          </DialogHeader>
          {selectedPayout && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Period</p>
                  <p className="font-semibold text-sm">{new Date(selectedPayout.period_start).toLocaleDateString()} – {new Date(selectedPayout.period_end).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Amount</p>
                  <p className="font-bold text-emerald-700 text-lg">${(selectedPayout.commission_amount || 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
                  <div className="mt-1">{statusBadge(selectedPayout.status)}</div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Method</p>
                  <p className="font-semibold text-sm capitalize">{selectedPayout.payout_method?.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Fees</p>
                  <p className="font-semibold text-sm">${(selectedPayout.fees || 0).toFixed(2)}</p>
                </div>
                {selectedPayout.processed_at && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Processed</p>
                    <p className="font-semibold text-sm">{new Date(selectedPayout.processed_at).toLocaleDateString()}</p>
                  </div>
                )}
              </div>

              {selectedPayout.items?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2 text-gray-700">Contributing Merchants</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Merchant</TableHead>
                        <TableHead>Subscription</TableHead>
                        <TableHead>Commission %</TableHead>
                        <TableHead className="text-right">Commission</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPayout.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.merchant_name}</TableCell>
                          <TableCell className="text-sm text-gray-500">${(item.amount || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-sm">{item.commission_percent}%</TableCell>
                          <TableCell className="text-right font-semibold text-emerald-700">
                            ${((item.amount || 0) * (item.commission_percent / 100)).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {selectedPayout.notes && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">{selectedPayout.notes}</AlertDescription>
                </Alert>
              )}

              {selectedPayout.error_message && (
                <Alert className="border-red-200 bg-red-50">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800 text-sm">Error: {selectedPayout.error_message}</AlertDescription>
                </Alert>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedPayout(null)}>Close</Button>
            {selectedPayout && canTrigger(selectedPayout) && (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={triggeringId === selectedPayout?.id}
                onClick={() => { setSelectedPayout(null); handleTrigger(selectedPayout); }}
              >
                <Zap className="w-4 h-4 mr-2" />
                Trigger Instant Payout
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}