import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, Users, CheckCircle2, Clock, TrendingUp } from 'lucide-react';

export default function StaffEarningsPanel({ dealerId, token }) {
  const [earnings, setEarnings] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [staffFilter, setStaffFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadEarnings();
    loadStaff();
  }, [dealerId]);

  const loadEarnings = async () => {
    try {
      setLoading(true);
      const res = await base44.functions.invoke('manageLead', { action: 'list_earnings', token, dealer_id: dealerId });
      if (res.data?.success) setEarnings(res.data.earnings || []);
    } catch (e) {
      console.error('Error loading earnings:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadStaff = async () => {
    try {
      const res = await base44.functions.invoke('manageLead', { action: 'list_staff', token, dealer_id: dealerId });
      if (res.data?.success) setStaff(res.data.staff || []);
    } catch (e) {
      console.error('Error loading staff:', e);
    }
  };

  const handleMarkPaid = async (earningId) => {
    setBusy(true);
    try {
      await base44.functions.invoke('manageLead', { action: 'mark_earning_paid', token, dealer_id: dealerId, earning_id: earningId });
      await loadEarnings();
    } catch (e) {
      alert('Failed to mark as paid: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleBulkMarkPaid = async () => {
    const ids = filteredEarnings.filter((e) => e.status === 'pending').map((e) => e.id);
    if (ids.length === 0) return;
    setBusy(true);
    try {
      await base44.functions.invoke('manageLead', { action: 'bulk_mark_earnings_paid', token, dealer_id: dealerId, lead_ids: ids });
      await loadEarnings();
    } catch (e) {
      alert('Failed to mark earnings as paid: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  const filteredEarnings = earnings.filter((e) => {
    const matchesStaff = staffFilter === 'all' || e.staff_id === staffFilter;
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchesStaff && matchesStatus;
  });

  // Aggregate per staff
  const staffSummary = staff.map((s) => {
    const staffEarnings = earnings.filter((e) => e.staff_id === s.id);
    const pending = staffEarnings.filter((e) => e.status === 'pending').reduce((sum, e) => sum + (e.amount || 0), 0);
    const paid = staffEarnings.filter((e) => e.status === 'paid').reduce((sum, e) => sum + (e.amount || 0), 0);
    const total = pending + paid;
    return { ...s, pending, paid, total, count: staffEarnings.length };
  });

  const totalPending = earnings.filter((e) => e.status === 'pending').reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalPaid = earnings.filter((e) => e.status === 'paid').reduce((sum, e) => sum + (e.amount || 0), 0);

  if (loading) return <div className="text-center py-4 text-sm text-gray-500">Loading earnings...</div>;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-3">
          <div className="flex items-center gap-2 mb-1"><DollarSign className="w-4 h-4 text-green-500" /><span className="text-xs text-gray-500">Total Earnings</span></div>
          <p className="text-xl font-bold">${(totalPending + totalPaid).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <div className="flex items-center gap-2 mb-1"><Clock className="w-4 h-4 text-orange-500" /><span className="text-xs text-gray-500">Pending</span></div>
          <p className="text-xl font-bold text-orange-600">${totalPending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="w-4 h-4 text-green-500" /><span className="text-xs text-gray-500">Paid Out</span></div>
          <p className="text-xl font-bold text-green-600">${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-blue-500" /><span className="text-xs text-gray-500">Staff with Earnings</span></div>
          <p className="text-xl font-bold">{staffSummary.filter((s) => s.count > 0).length}</p>
        </CardContent></Card>
      </div>

      {/* Per-staff breakdown */}
      {staffSummary.filter((s) => s.count > 0).length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"><Users className="w-4 h-4" /> Staff Earnings Breakdown</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {staffSummary.filter((s) => s.count > 0).map((s) => (
              <div key={s.id} className="border rounded-lg p-3 bg-gray-50">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm text-gray-800 truncate">{s.full_name}</span>
                  <Badge variant="outline" className="text-xs">{s.count} {s.count === 1 ? 'deal' : 'deals'}</Badge>
                </div>
                <div className="flex items-baseline gap-1">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-lg font-bold text-gray-900">${s.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex gap-3 mt-1 text-xs">
                  <span className="text-orange-600">Pending: ${s.pending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className="text-green-600">Paid: ${s.paid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={staffFilter} onValueChange={setStaffFilter}>
          <SelectTrigger className="w-48 h-8 text-xs"><SelectValue placeholder="All staff" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Staff</SelectItem>
            {staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
        {filteredEarnings.some((e) => e.status === 'pending') && (
          <Button variant="outline" size="sm" onClick={handleBulkMarkPaid} disabled={busy} className="gap-1 h-8">
            <CheckCircle2 className="w-3.5 h-3.5" /> Mark all visible as paid
          </Button>
        )}
      </div>

      {/* Earnings table */}
      {filteredEarnings.length === 0 ? (
        <div className="text-center py-6 text-sm text-gray-400">
          No earnings records yet. Earnings are generated automatically when an assigned lead is converted.
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Staff</th>
                <th className="text-left px-3 py-2 font-medium">Lead</th>
                <th className="text-right px-3 py-2 font-medium">Deal Value</th>
                <th className="text-right px-3 py-2 font-medium">Rate</th>
                <th className="text-right px-3 py-2 font-medium">Earning</th>
                <th className="text-center px-3 py-2 font-medium">Status</th>
                <th className="text-right px-3 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredEarnings.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-800">{e.staff_name || '—'}</td>
                  <td className="px-3 py-2 text-gray-600 truncate max-w-[160px]">{e.lead_name || '—'}</td>
                  <td className="px-3 py-2 text-right text-gray-600">${(e.deal_value || 0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{e.commission_rate || 0}%</td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-900">${(e.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-3 py-2 text-center">
                    {e.status === 'paid'
                      ? <Badge className="bg-green-100 text-green-700">Paid</Badge>
                      : <Badge className="bg-orange-100 text-orange-700">Pending</Badge>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {e.status === 'pending' && (
                      <Button variant="ghost" size="sm" onClick={() => handleMarkPaid(e.id)} disabled={busy} className="h-7 text-green-600 gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Pay
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}