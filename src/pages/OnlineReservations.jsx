import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, Users, CheckCircle, Loader2, UtensilsCrossed, Clock, Sparkles } from 'lucide-react';

export default function OnlineReservations() {
  const urlParams = new URLSearchParams(window.location.search);
  const merchantId = urlParams.get('merchant_id');

  const [merchant, setMerchant] = useState(null);
  const [tables, setTables] = useState([]);
  const [existing, setExisting] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(null);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    customer_name: '', customer_phone: '', customer_email: '',
    party_size: 2, reservation_date: '', reservation_time: '',
    table_id: 'any', special_requests: ''
  });

  useEffect(() => {
    if (merchantId) loadAvailability();
    else { setLoading(false); setError('No merchant specified.'); }
  }, [merchantId]);

  useEffect(() => {
    if (form.reservation_date && merchantId) loadAvailability(form.reservation_date);
  }, [form.reservation_date]);

  const loadAvailability = async (date) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await base44.functions.invoke('getReservationAvailability', {
        merchant_id: merchantId, date: date || null
      });
      if (data?.success) {
        setMerchant(data.merchant);
        setTables(data.tables || []);
        setExisting(data.reservations || []);
      } else {
        setError(data?.error || 'Could not load availability');
      }
    } catch (e) {
      setError('Could not load availability');
    } finally {
      setLoading(false);
    }
  };

  // Time slots from 11:00 to 21:30 in 30-min increments
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let m = 11 * 60; m <= 21 * 60 + 30; m += 30) {
      const h = Math.floor(m / 60), mm = m % 60;
      slots.push(`${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
    }
    return slots;
  }, []);

  const takenTimes = useMemo(() => {
    const map = {};
    (existing || []).forEach(r => {
      if (r.table_id) {
        if (!map[r.table_id]) map[r.table_id] = [];
        map[r.table_id].push(r.reservation_time);
      }
    });
    return map;
  }, [existing]);

  const isSlotTaken = (tableId, time) => {
    if (tableId === 'any') return false;
    return (takenTimes[tableId] || []).includes(time);
  };

  const filteredTables = useMemo(() => {
    return (tables || []).filter(t => (t.capacity || 0) >= Number(form.party_size));
  }, [tables, form.party_size]);

  const submit = async () => {
    setError(null);
    if (!form.customer_name || !form.reservation_date || !form.reservation_time) {
      setError('Please fill in your name, date, and time.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        merchant_id: merchantId,
        table_id: form.table_id === 'any' ? null : form.table_id,
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        customer_email: form.customer_email,
        party_size: Number(form.party_size),
        reservation_date: form.reservation_date,
        reservation_time: form.reservation_time,
        duration_minutes: 90,
        special_requests: form.special_requests
      };
      const { data } = await base44.functions.invoke('createReservation', payload);
      if (data?.success) {
        setConfirmed(data.reservation);
      } else {
        setError(data?.error || 'Could not book reservation');
      }
    } catch (e) {
      setError('Could not book reservation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Reservation Confirmed!</h1>
            <p className="text-gray-600 mb-4">We can't wait to see you at {merchant?.business_name}.</p>
            <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2 text-sm mb-4">
              <div className="flex justify-between"><span className="text-gray-500">Confirmation code</span><span className="font-mono font-bold">{confirmed.confirmation_code}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Name</span><span className="font-medium">{confirmed.customer_name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Date</span><span className="font-medium">{confirmed.reservation_date}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Time</span><span className="font-medium">{formatTime(confirmed.reservation_time)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Party size</span><span className="font-medium">{confirmed.party_size} guests</span></div>
              {confirmed.table_name && <div className="flex justify-between"><span className="text-gray-500">Table</span><span className="font-medium">{confirmed.table_name}</span></div>}
            </div>
            <p className="text-xs text-gray-500">Please save your confirmation code. The restaurant will confirm your booking shortly.</p>
            <Button className="w-full mt-4" onClick={() => { setConfirmed(null); setForm({ customer_name: '', customer_phone: '', customer_email: '', party_size: 2, reservation_date: '', reservation_time: '', table_id: 'any', special_requests: '' }); }}>
              Book Another
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="text-center pt-4">
          <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <CalendarDays className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Reserve a Table</h1>
          <p className="text-gray-600 mt-1">{merchant?.business_name || 'Book your table in seconds'}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>
        ) : error && !merchant ? (
          <Card><CardContent className="p-8 text-center text-red-600">{error}</CardContent></Card>
        ) : (
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-emerald-500" />Booking Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded p-3">{error}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Full Name *</Label>
                  <Input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} placeholder="Jane Doe" />
                </div>
                <div>
                  <Label>Party Size *</Label>
                  <Select value={String(form.party_size)} onValueChange={v => setForm({ ...form, party_size: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,7,8,9,10].map(n => <SelectItem key={n} value={String(n)}>{n} {n === 1 ? 'guest' : 'guests'}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Phone</Label>
                  <Input value={form.customer_phone} onChange={e => setForm({ ...form, customer_phone: e.target.value })} placeholder="(555) 123-4567" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={form.customer_email} onChange={e => setForm({ ...form, customer_email: e.target.value })} placeholder="you@email.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date *</Label>
                  <Input type="date" min={new Date().toISOString().slice(0, 10)} value={form.reservation_date} onChange={e => setForm({ ...form, reservation_date: e.target.value })} />
                </div>
                <div>
                  <Label>Time *</Label>
                  <Select value={form.reservation_time} onValueChange={v => setForm({ ...form, reservation_time: v })}>
                    <SelectTrigger><SelectValue placeholder="Select time" /></SelectTrigger>
                    <SelectContent>
                      {timeSlots.map(t => {
                        const taken = form.table_id !== 'any' && isSlotTaken(form.table_id, t);
                        return <SelectItem key={t} value={t} disabled={taken} className={taken ? 'text-gray-400 line-through' : ''}>{formatTime(t)}{taken ? ' — booked' : ''}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Table Preference</Label>
                <Select value={form.table_id} onValueChange={v => setForm({ ...form, table_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">No preference (first available)</SelectItem>
                    {filteredTables.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} · {t.section || 'Main'} · seats {t.capacity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.party_size > 0 && filteredTables.length === 0 && tables.length > 0 && (
                  <p className="text-xs text-amber-600 mt-1">No tables fit a party of {form.party_size}. Try a smaller party size.</p>
                )}
              </div>
              <div>
                <Label>Special Requests</Label>
                <Textarea rows={2} value={form.special_requests} onChange={e => setForm({ ...form, special_requests: e.target.value })} placeholder="High chair, window seat, birthday, etc." />
              </div>
              <Button onClick={submit} disabled={submitting} className="w-full bg-emerald-600 hover:bg-emerald-700" size="lg">
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Book Reservation'}
              </Button>
              <p className="text-xs text-center text-gray-400">By booking you agree to the restaurant's cancellation policy.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function formatTime(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
}