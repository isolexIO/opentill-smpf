import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import getMerchantId from '@/lib/getMerchantId';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, Users, Phone, CheckCircle, XCircle, Clock, Loader2, UtensilsCrossed } from 'lucide-react';

const STATUS_FLOW = ['pending', 'confirmed', 'seated', 'completed', 'no_show', 'cancelled'];
const STATUS_STYLE = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  seated: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-600',
  no_show: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-200 text-gray-500 line-through'
};

export default function Reservations() {
  const [merchantId, setMerchantId] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 10));
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => { init(); }, []);
  useEffect(() => { if (merchantId) loadReservations(); }, [merchantId, filterDate, filterStatus]);

  const init = async () => {
    const mid = await getMerchantId();
    setMerchantId(mid);
  };

  const loadReservations = async () => {
    if (!merchantId) return;
    setLoading(true);
    try {
      const query = { merchant_id: merchantId };
      if (filterDate) query.reservation_date = filterDate;
      if (filterStatus !== 'all') query.status = filterStatus;
      const list = await base44.entities.Reservation.filter(query, 'reservation_time', 200);
      setReservations(list || []);
    } catch (e) {
      console.error('Error loading reservations', e);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (r, status) => {
    try {
      const patch = { status };
      if (status === 'seated') patch.seated_at = new Date().toISOString();
      if (status === 'cancelled') patch.cancelled_at = new Date().toISOString();
      await base44.entities.Reservation.update(r.id, patch);
      setReservations(prev => prev.map(x => x.id === r.id ? { ...x, ...patch } : x));
    } catch (e) {
      console.error('Error updating reservation', e);
      alert('Could not update reservation');
    }
  };

  const sorted = [...reservations].sort((a, b) => (a.reservation_time || '').localeCompare(b.reservation_time || ''));

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
            <CalendarDays className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reservations</h1>
            <p className="text-sm text-gray-500">Manage guest reservations from your online booking page</p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-3 flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">Date</label>
              <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUS_FLOW.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={loadReservations}>Refresh</Button>
          </CardContent>
        </Card>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : !merchantId ? (
          <p className="text-center text-gray-500 py-16">Sign in to view reservations.</p>
        ) : sorted.length === 0 ? (
          <Card><CardContent className="p-12 text-center text-gray-500">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No reservations for this filter.</p>
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sorted.map(r => (
              <Card key={r.id} className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="font-bold text-lg">{formatTime(r.reservation_time)}</span>
                        <span className="text-xs text-gray-500">· {r.duration_minutes || 90} min</span>
                      </div>
                      <div className="font-semibold text-gray-900 mt-1">{r.customer_name}</div>
                    </div>
                    <Badge className={STATUS_STYLE[r.status] || 'bg-gray-100'}>{r.status.replace('_', ' ')}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{r.party_size} guests</span>
                    {r.table_name && <span className="flex items-center gap-1"><UtensilsCrossed className="w-3.5 h-3.5" />{r.table_name}</span>}
                    {r.customer_phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{r.customer_phone}</span>}
                    {r.confirmation_code && <span className="text-xs text-gray-400">{r.confirmation_code}</span>}
                  </div>
                  {r.special_requests && (
                    <div className="text-sm bg-amber-50 border border-amber-200 rounded p-2 text-amber-900">
                      <span className="font-medium">Notes: </span>{r.special_requests}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {r.status === 'pending' && (
                      <Button size="sm" onClick={() => updateStatus(r, 'confirmed')}><CheckCircle className="w-3.5 h-3.5 mr-1" />Confirm</Button>
                    )}
                    {r.status === 'confirmed' && (
                      <Button size="sm" onClick={() => updateStatus(r, 'seated')} className="bg-green-600 hover:bg-green-700"><UtensilsCrossed className="w-3.5 h-3.5 mr-1" />Seat</Button>
                    )}
                    {r.status === 'seated' && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(r, 'completed')}><CheckCircle className="w-3.5 h-3.5 mr-1" />Complete</Button>
                    )}
                    {(r.status === 'pending' || r.status === 'confirmed') && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => updateStatus(r, 'no_show')}>No-show</Button>
                        <Button size="sm" variant="ghost" onClick={() => updateStatus(r, 'cancelled')}><XCircle className="w-3.5 h-3.5 mr-1 text-red-500" />Cancel</Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(hhmm) {
  if (!hhmm) return '--:--';
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
}