import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Loader2,
  Eye,
  Zap,
  Ban,
  RefreshCw,
  Calculator,
  CalendarClock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Gift,
} from 'lucide-react';

const STATUS_OPTIONS = [
  'all',
  'pending',
  'scheduled',
  'on_hold',
  'processing',
  'completed',
  'failed',
  'manual_review',
  'canceled',
];

function StatusBadge({ status }) {
  const map = {
    pending: { variant: 'outline', className: 'text-yellow-700 border-yellow-300 bg-yellow-50', label: 'Pending' },
    scheduled: { variant: 'outline', className: 'text-blue-700 border-blue-300 bg-blue-50', label: 'Scheduled' },
    on_hold: { variant: 'outline', className: 'text-amber-700 border-amber-300 bg-amber-50', label: 'On Hold' },
    processing: { variant: 'default', className: 'bg-purple-500', label: 'Processing' },
    completed: { variant: 'default', className: 'bg-green-600', label: 'Completed' },
    failed: { variant: 'destructive', className: '', label: 'Failed' },
    manual_review: { variant: 'outline', className: 'text-orange-700 border-orange-300 bg-orange-50', label: 'Manual Review' },
    canceled: { variant: 'outline', className: 'text-gray-600 border-gray-300 bg-gray-50', label: 'Canceled' },
  };
  const b = map[status] || map.pending;
  return (
    <Badge variant={b.variant} className={b.className}>{b.label}</Badge>
  );
}

export default function PayoutControl() {
  const [payouts, setPayouts] = useState([]);
  const [dealers, setDealers] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [actionDialog, setActionDialog] = useState({ open: false, payout: null, action: null });
  const [cancelReason, setCancelReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [resultMsg, setResultMsg] = useState(null);
  const [details, setDetails] = useState(null);
  const [structure, setStructure] = useState('full_stripe');
  const [stripeSplitAmount, setStripeSplitAmount] = useState(0);
  const [bonusDialog, setBonusDialog] = useState({ open: false, ambassadorId: '', amount: '', note: '' });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [payoutList, dealerList] = await Promise.all([
        base44.entities.DealerPayout.list('-created_date', 200),
        base44.entities.Ambassador.list(),
      ]);
      setPayouts(Array.isArray(payoutList) ? payoutList : []);
      setDealers(Object.fromEntries((dealerList || []).map((d) => [d.legacy_dealer_id || d.id, d])));
    } catch (error) {
      console.error('Error loading payouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const dealerFor = (payout) => dealers[payout?.dealer_id];
  const dealerName = (payout) => dealerFor(payout)?.name || (payout?.dealer_id ? payout.dealer_id.slice(-6) : 'Unknown');
  const stripeConnected = (payout) => !!dealerFor(payout)?.stripe_account_id;

  const ambassadorList = Object.values(dealers);

  const filtered = payouts.filter((p) => {
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || dealerName(p).toLowerCase().includes(q) || (p.id || '').toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const stats = {
    open: payouts.filter((p) => ['pending', 'scheduled', 'on_hold', 'manual_review', 'failed'].includes(p.status)).length,
    completed: payouts.filter((p) => p.status === 'completed').length,
    paidOut: payouts.filter((p) => p.status === 'completed').reduce((s, p) => s + (p.commission_amount || 0), 0),
    pendingAmount: payouts.filter((p) => ['pending', 'scheduled', 'on_hold', 'manual_review', 'failed'].includes(p.status)).reduce((s, p) => s + (p.commission_amount || 0), 0),
  };

  const showResult = (type, text) => setResultMsg({ type, text });

  const openAction = (payout, action) => {
    setCancelReason('');
    setResultMsg(null);
    if (action === 'trigger') {
      const base = payout.split_method
        || (payout.payout_method === 'solana' ? 'full_solana'
          : payout.payout_method === 'manual' ? 'full_solana'
          : 'full_stripe');
      setStructure(base);
      setStripeSplitAmount(
        base === 'combo'
          ? (payout.stripe_amount || (payout.commission_amount / 2))
          : (base === 'full_stripe' ? payout.commission_amount : 0)
      );
    }
    setActionDialog({ open: true, payout, action });
  };

  const confirmAction = async () => {
    const { payout, action } = actionDialog;
    if (!payout) return;
    setBusy(true);
    setResultMsg(null);
    try {
      let res;
      if (action === 'trigger') {
        const payload = { payout_id: payout.id, bypass_minimum: true };
        if (structure === 'full_stripe') {
          payload.split_method = 'full_stripe';
        } else if (structure === 'full_solana') {
          payload.split_method = 'full_solana';
        } else if (structure === 'combo') {
          payload.split_method = 'combo';
          payload.stripe_amount = stripeSplitAmount;
          payload.duc_amount = Math.max(0, (payout.commission_amount || 0) - stripeSplitAmount);
        }
        res = await base44.functions.invoke('triggerManualPayout', payload);
      } else if (action === 'cancel') {
        res = await base44.functions.invoke('cancelDealerPayout', {
          payout_id: payout.id,
          reason: cancelReason,
        });
      }
      const data = res?.data || {};
      const proc = data.result;

      if (action === 'cancel') {
        if (data.success) {
          showResult('success', 'Payout canceled.');
          await loadAll();
          setActionDialog({ open: false, payout: null, action: null });
        } else {
          showResult('error', data.error || 'Failed to cancel payout.');
        }
      } else {
        // trigger
        if (data.success && (!proc || proc.success !== false)) {
          const dest = proc?.destination || {};
          const ids = [];
          if (dest.stripe?.stripe_transfer_id) ids.push(`Stripe: ${dest.stripe.stripe_transfer_id}`);
          if (dest.solana?.tx_signature) ids.push(`$DUC: ${dest.solana.tx_signature}`);
          showResult('success', `Payout processed. ${ids.join(' • ') || 'pending confirmation'}`);
          await loadAll();
          setActionDialog({ open: false, payout: null, action: null });
        } else {
          const msg = proc?.message || proc?.error || data.error || 'Payout could not be processed.';
          showResult('error', msg);
          await loadAll();
        }
      }
    } catch (error) {
      console.error('Payout action error:', error);
      showResult('error', error.message || 'Action failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleCalculate = async () => {
    setBusy(true);
    setResultMsg(null);
    try {
      const { data } = await base44.functions.invoke('calculateDealerPayouts', {});
      showResult('success', `Recalculated payouts — ${data?.results?.created || 0} created, ${data?.results?.skipped || 0} skipped.`);
      await loadAll();
    } catch (error) {
      showResult('error', error.message || 'Recalculation failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleSchedule = async () => {
    setBusy(true);
    setResultMsg(null);
    try {
      const { data } = await base44.functions.invoke('schedulePayouts', {});
      showResult(
        'success',
        `Scheduler ran — ${data?.results?.scheduled || 0} scheduled, ${data?.results?.processed || 0} processed.`
      );
      await loadAll();
    } catch (error) {
      showResult('error', error.message || 'Scheduler failed.');
    } finally {
      setBusy(false);
    }
  };

  const openBonus = () => {
    setBonusDialog({ open: true, ambassadorId: '', amount: '', note: '' });
    setResultMsg(null);
  };

  const confirmBonus = async () => {
    const { ambassadorId, amount, note } = bonusDialog;
    const amt = Number(amount);
    if (!ambassadorId) { showResult('error', 'Select an ambassador.'); return; }
    if (!amt || amt <= 0) { showResult('error', 'Enter a valid $DUC amount.'); return; }
    setBusy(true);
    setResultMsg(null);
    try {
      const { data } = await base44.functions.invoke('sendAmbassadorBonusDUC', {
        ambassador_id: ambassadorId,
        amount: amt,
        note,
      });
      if (data?.success) {
        const sig = data?.destination?.solana?.tx_signature;
        showResult('success', `Bonus of ${amt} $DUC sent.${sig ? ` Tx: ${sig}` : ''}`);
        setBonusDialog({ open: false, ambassadorId: '', amount: '', note: '' });
        await loadAll();
      } else {
        showResult('error', data?.error || 'Bonus could not be sent.');
      }
    } catch (error) {
      showResult('error', error.message || 'Bonus failed.');
    } finally {
      setBusy(false);
    }
  };

  const viewDetails = async (payout) => {
    try {
      const items = await base44.entities.DealerPayoutItem.filter({ payout_id: payout.id });
      setDetails({ ...payout, items: items || [] });
    } catch (error) {
      setDetails({ ...payout, items: [] });
    }
  };

  const canTrigger = (status) => ['pending', 'on_hold', 'failed', 'manual_review'].includes(status);
  const canCancel = (status) => ['pending', 'scheduled', 'on_hold'].includes(status);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {resultMsg && (
        <Alert className={resultMsg.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
          {resultMsg.type === 'success' ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className={resultMsg.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {resultMsg.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Open Payouts</p>
            <p className="text-2xl font-bold">{stats.open}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Pending Amount</p>
            <p className="text-2xl font-bold">${stats.pendingAmount.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Completed</p>
            <p className="text-2xl font-bold">{stats.completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Paid Out</p>
            <p className="text-2xl font-bold text-green-600">${stats.paidOut.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Payout Operations</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={handleCalculate} disabled={busy} variant="outline">
            <Calculator className="w-4 h-4 mr-2" />
            Recalculate Payouts
          </Button>
          <Button onClick={handleSchedule} disabled={busy} variant="outline">
            <CalendarClock className="w-4 h-4 mr-2" />
            Run Scheduler
          </Button>
          <Button onClick={loadAll} disabled={busy} variant="ghost">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={openBonus} disabled={busy} className="bg-amber-500 hover:bg-amber-600 text-white">
            <Gift className="w-4 h-4 mr-2" />
            Send $DUC Bonus
          </Button>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="w-full sm:w-56">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === 'all' ? 'All Statuses' : s.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input
          placeholder="Search ambassador or payout id..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
      </div>

      {/* Payouts Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Payouts ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ambassador</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Stripe</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Transfer ID</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell className="font-medium">{dealerName(payout)}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {payout.period_start ? new Date(payout.period_start).toLocaleDateString() : '—'} –{' '}
                      {payout.period_end ? new Date(payout.period_end).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell className="font-semibold">
                      ${(payout.commission_amount || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {payout.split_method === 'combo'
                        ? `Stripe $${(payout.stripe_amount || 0).toFixed(0)} + $DUC $${(payout.duc_amount || 0).toFixed(0)}`
                        : payout.split_method === 'full_solana'
                        ? '$DUC'
                        : payout.split_method === 'full_stripe'
                        ? 'Stripe'
                        : payout.payout_method === 'stripe_connect'
                        ? 'Stripe'
                        : payout.payout_method === 'solana'
                        ? '$DUC'
                        : payout.payout_method || '—'}
                    </TableCell>
                    <TableCell>
                      {(payout.split_method === 'full_stripe' || payout.split_method === 'combo' ||
                        (!payout.split_method && payout.payout_method === 'stripe_connect')) ? (
                        stripeConnected(payout) ? (
                          <Badge className="bg-green-100 text-green-700">Connected</Badge>
                        ) : (
                          <Badge variant="outline" className="text-red-600 border-red-300">Not Connected</Badge>
                        )
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={payout.status} />
                    </TableCell>
                    <TableCell className="text-xs text-gray-500 font-mono">
                      {payout.payout_destination?.stripe?.stripe_transfer_id
                        || payout.payout_destination?.stripe_transfer_id
                        || payout.payout_destination?.solana?.tx_signature
                        || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewDetails(payout)}
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {canTrigger(payout.status) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAction(payout, 'trigger')}
                            className="text-blue-600 hover:bg-blue-50"
                            title="Trigger payout from Stripe account"
                          >
                            <Zap className="w-4 h-4 mr-1" />
                            Trigger
                          </Button>
                        )}
                        {canCancel(payout.status) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAction(payout, 'cancel')}
                            className="text-red-600 hover:bg-red-50"
                            title="Cancel payout"
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-8 text-gray-500">No payouts match the current filters.</div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      {details && (
        <Dialog open={!!details} onOpenChange={() => setDetails(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Payout Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Ambassador</p>
                  <p className="font-semibold">{dealerName(details)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <div className="mt-1">
                    <StatusBadge status={details.status} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Period</p>
                  <p className="font-semibold">
                    {details.period_start ? new Date(details.period_start).toLocaleDateString() : '—'} –{' '}
                    {details.period_end ? new Date(details.period_end).toLocaleDateString() : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Commission Amount</p>
                  <p className="font-semibold text-green-600">${(details.commission_amount || 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Gross / Root Share</p>
                  <p className="font-semibold">
                    ${(details.gross_amount || 0).toFixed(2)} / ${(details.root_share || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Stripe Transfer</p>
                  <p className="font-mono text-xs break-all">
                    {details.payout_destination?.stripe?.stripe_transfer_id
                      || details.payout_destination?.stripe_transfer_id
                      || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">$DUC Transaction</p>
                  <p className="font-mono text-xs break-all">
                    {details.payout_destination?.solana?.tx_signature || '—'}
                  </p>
                </div>
                {details.error_message && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Error</p>
                    <p className="text-sm text-red-600">{details.error_message}</p>
                  </div>
                )}
                {details.notes && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Notes</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{details.notes}</p>
                  </div>
                )}
              </div>

              {details.items && details.items.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Contributing Merchants</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Merchant</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Commission %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {details.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.merchant_name || '—'}</TableCell>
                          <TableCell>${(item.amount || 0).toFixed(2)}</TableCell>
                          <TableCell>{item.commission_percent ?? '—'}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Action Dialog */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) => !open && setActionDialog({ open: false, payout: null, action: null })}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === 'trigger' && 'Trigger Payout from Stripe'}
              {actionDialog.action === 'cancel' && 'Cancel Payout'}
            </DialogTitle>
          </DialogHeader>

          {actionDialog.payout && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">{dealerName(actionDialog.payout)}</span> — $
                  {(actionDialog.payout.commission_amount || 0).toFixed(2)} via{' '}
                  {actionDialog.payout.payout_method === 'stripe_connect'
                    ? 'Stripe Connect'
                    : actionDialog.payout.payout_method}
                </p>
              </div>

              {actionDialog.action === 'trigger' && (
                <div className="space-y-3">
                  <div>
                    <Label>Payout Structure</Label>
                    <Select value={structure} onValueChange={setStructure}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full_stripe">Stripe (full)</SelectItem>
                        <SelectItem value="full_solana">$DUC (full)</SelectItem>
                        <SelectItem value="combo">Combo (Stripe + $DUC)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {structure === 'combo' && actionDialog.payout && (
                    <div className="space-y-2">
                      <Label>Stripe Amount ($)</Label>
                      <Input
                        type="number"
                        min="0"
                        max={actionDialog.payout.commission_amount}
                        step="0.01"
                        value={stripeSplitAmount}
                        onChange={(e) => setStripeSplitAmount(parseFloat(e.target.value) || 0)}
                      />
                      <p className="text-xs text-gray-500">
                        Stripe: ${(stripeSplitAmount || 0).toFixed(2)} • $DUC: $
                        {Math.max(0, (actionDialog.payout.commission_amount || 0) - (stripeSplitAmount || 0)).toFixed(2)}
                        {' '}(total ${actionDialog.payout.commission_amount})
                      </p>
                    </div>
                  )}

                  <Alert>
                    <Zap className="h-4 w-4" />
                    <AlertDescription>
                      {structure === 'full_solana'
                        ? "Sends the full commission as $DUC tokens to the ambassador's Solana wallet. The minimum payout threshold is bypassed for platform admins."
                        : structure === 'combo'
                        ? 'Splits the commission between Stripe and $DUC — both legs are processed together. The minimum payout threshold is bypassed for platform admins.'
                        : "Transfers funds from the platform Stripe account to the ambassador's connected Stripe account. The minimum payout threshold is bypassed for platform admins."}
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {actionDialog.action === 'cancel' && (
                <>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      This payout will be canceled. The ambassador will not be paid for this period unless it is
                      recalculated.
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-2">
                    <Label htmlFor="cancel-reason">Reason (optional)</Label>
                    <Input
                      id="cancel-reason"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Reason for cancellation"
                    />
                  </div>
                </>
              )}

              {resultMsg && (
                <Alert className={resultMsg.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                  {resultMsg.type === 'success' ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className={resultMsg.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                    {resultMsg.text}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog({ open: false, payout: null, action: null })}
              disabled={busy}
            >
              Close
            </Button>
            {actionDialog.action === 'trigger' && (
              <Button onClick={confirmAction} disabled={busy} className="bg-blue-600 hover:bg-blue-700">
                {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                Trigger Payout
              </Button>
            )}
            {actionDialog.action === 'cancel' && (
              <Button onClick={confirmAction} disabled={busy} className="bg-red-600 hover:bg-red-700">
                {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Ban className="w-4 h-4 mr-2" />}
                Cancel Payout
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send $DUC Bonus Dialog */}
      <Dialog open={bonusDialog.open} onOpenChange={(open) => !open && setBonusDialog({ ...bonusDialog, open })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Ambassador Bonus ($DUC)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ambassador</Label>
              <Select
                value={bonusDialog.ambassadorId}
                onValueChange={(v) => setBonusDialog({ ...bonusDialog, ambassadorId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select ambassador" />
                </SelectTrigger>
                <SelectContent>
                  {ambassadorList.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}{a.solana_wallet_address ? '' : ' (no wallet)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>$DUC Amount</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={bonusDialog.amount}
                onChange={(e) => setBonusDialog({ ...bonusDialog, amount: e.target.value })}
                placeholder="e.g. 100"
              />
              <p className="text-xs text-gray-500">$DUC is sent 1:1 with USD to the ambassador's Solana wallet.</p>
            </div>
            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Textarea
                rows={2}
                value={bonusDialog.note}
                onChange={(e) => setBonusDialog({ ...bonusDialog, note: e.target.value })}
                placeholder="Reason / milestone / performance note"
              />
            </div>
            {resultMsg && (
              <Alert className={resultMsg.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                {resultMsg.type === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={resultMsg.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                  {resultMsg.text}
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBonusDialog({ ...bonusDialog, open: false })} disabled={busy}>
              Close
            </Button>
            <Button onClick={confirmBonus} disabled={busy} className="bg-amber-500 hover:bg-amber-600 text-white">
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Gift className="w-4 h-4 mr-2" />}
              Send Bonus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}