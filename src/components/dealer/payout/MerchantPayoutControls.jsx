import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Store, Zap, AlertCircle, Loader2, TrendingUp, Search, Users } from 'lucide-react';

export default function MerchantPayoutControls({ dealer }) {
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [selected, setSelected]   = useState(null);
  const [amount, setAmount]       = useState('');
  const [note, setNote]           = useState('');
  const [paying, setPaying]       = useState(null);
  const [msg, setMsg]             = useState(null);

  useEffect(() => { loadMerchants(); }, [dealer?.id]);

  const loadMerchants = async () => {
    setLoading(true);
    const list = await base44.entities.Merchant.filter({ dealer_id: dealer.legacy_dealer_id || dealer.id });
    // Load subscription data for each merchant
    const enriched = await Promise.all(list.map(async (m) => {
      try {
        const subs = await base44.entities.Subscription.filter({ merchant_id: m.id, status: 'active' });
        return { ...m, active_subscription: subs[0] || null };
      } catch {
        return { ...m, active_subscription: null };
      }
    }));
    setMerchants(enriched);
    setLoading(false);
  };

  const handleOpenPayout = (merchant) => {
    const sub = merchant.active_subscription;
    const commission = sub ? ((sub.price || 0) * (dealer.commission_percent / 100)) : 0;
    setAmount(commission.toFixed(2));
    setNote('');
    setSelected(merchant);
  };

  const handlePayout = async () => {
    if (!amount || parseFloat(amount) <= 0) { alert('Enter a valid amount'); return; }
    setPaying(selected.id);
    try {
      // Create a manual payout record then trigger it
      const payout = await base44.entities.DealerPayout.create({
        dealer_id: dealer.legacy_dealer_id || dealer.id,
        period_start: new Date(new Date().setDate(1)).toISOString(),
        period_end: new Date().toISOString(),
        gross_amount: parseFloat(amount),
        commission_amount: parseFloat(amount),
        root_share: 0,
        fees: 0,
        payout_method: dealer.payout_method || 'manual',
        status: 'scheduled',
        scheduled_at: new Date().toISOString(),
        notes: `Manual merchant-specific payout for ${selected.business_name}${note ? ': ' + note : ''}`,
        merchant_names: [selected.business_name],
      });

      await base44.entities.DealerPayoutItem.create({
        payout_id: payout.id,
        merchant_id: selected.id,
        merchant_name: selected.business_name,
        amount: parseFloat(amount),
        commission_percent: dealer.commission_percent,
        billing_period_start: new Date(new Date().setDate(1)).toISOString(),
        billing_period_end: new Date().toISOString(),
      });

      const { data } = await base44.functions.invoke('triggerManualPayout', { payout_id: payout.id });

      if (data?.success) {
        setMsg({ type: 'success', text: `✓ Payout of $${parseFloat(amount).toFixed(2)} triggered for ${selected.business_name}` });
      } else {
        setMsg({ type: 'error', text: data?.error || 'Payout failed' });
      }
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    } finally {
      setPaying(null);
      setSelected(null);
    }
  };

  const filtered = merchants.filter(m =>
    m.business_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.owner_email?.toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (status) => {
    const map = {
      active: 'bg-green-100 text-green-800',
      trial: 'bg-blue-100 text-blue-800',
      inactive: 'bg-gray-100 text-gray-600',
      suspended: 'bg-red-100 text-red-800',
    };
    return <Badge variant="outline" className={map[status] || map.inactive}>{status}</Badge>;
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
    </div>
  );

  return (
    <div className="space-y-6">
      {msg && (
        <Alert className={msg.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          {msg.type === 'success'
            ? <TrendingUp className="h-4 w-4 text-green-600" />
            : <AlertCircle className="h-4 w-4 text-red-600" />}
          <AlertDescription className={msg.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {msg.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Merchants', value: merchants.length, icon: Store, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Active', value: merchants.filter(m => m.status === 'active').length, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'With Subscription', value: merchants.filter(m => m.active_subscription).length, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-2xl font-black text-gray-900">{s.value}</p>
              </div>
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Merchant Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle>Merchant Payout Controls</CardTitle>
              <CardDescription>Trigger instant payouts per merchant or view their commission breakdown</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search merchants..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Merchant</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Est. Commission</TableHead>
                <TableHead>Total Revenue</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">No merchants found</TableCell>
                </TableRow>
              ) : filtered.map((m) => {
                const sub = m.active_subscription;
                const estComm = sub ? ((sub.price || 0) * (dealer.commission_percent / 100)) : 0;
                return (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-sm">{m.business_name}</p>
                        <p className="text-xs text-gray-500">{m.owner_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{statusBadge(m.status)}</TableCell>
                    <TableCell className="text-sm">
                      {sub ? (
                        <span className="text-emerald-700 font-medium">${(sub.price || 0).toFixed(2)}/mo ({sub.plan_name})</span>
                      ) : (
                        <span className="text-gray-400">No active plan</span>
                      )}
                    </TableCell>
                    <TableCell className="font-bold text-sm">
                      {estComm > 0 ? <span className="text-emerald-700">${estComm.toFixed(2)}</span> : <span className="text-gray-400">—</span>}
                    </TableCell>
                    <TableCell className="text-sm">${(m.total_revenue || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                          onClick={() => handleOpenPayout(m)}
                          disabled={paying === m.id}
                        >
                          {paying === m.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <><Zap className="w-3 h-3 mr-1" />Pay Out</>}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payout Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-600" />
              Instant Payout — {selected?.business_name}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <Alert className="bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 text-sm">
                  This creates and immediately triggers a manual payout using your configured payout method.
                </AlertDescription>
              </Alert>
              <div className="space-y-1">
                <Label>Payout Amount ($)</Label>
                <Input
                  type="number" min="0.01" step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Est. commission based on {dealer.commission_percent}% rate
                </p>
              </div>
              <div className="space-y-1">
                <Label>Note (optional)</Label>
                <Input
                  placeholder="Reason for manual payout..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handlePayout}
              disabled={paying === selected?.id || !amount || parseFloat(amount) <= 0}
            >
              {paying === selected?.id
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
                : <><Zap className="w-4 h-4 mr-2" />Trigger Payout</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}