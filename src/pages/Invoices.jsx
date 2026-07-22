import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger
} from '@/components/ui/dialog';
import { Plus, Copy, Send, FileText, ExternalLink, CheckCircle2, Ban } from 'lucide-react';

const EMPTY = { customer_name: '', customer_email: '', amount: '', due_date: '', notes: '', currency: 'USD' };

export default function Invoices() {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      let u = null;
      const pin = localStorage.getItem('pinLoggedInUser');
      if (pin) { try { u = JSON.parse(pin); } catch (_) {} }
      if (!u) u = await base44.auth.me();
      setUser(u);
      if (u?.merchant_id) {
        const list = await base44.entities.Invoice.filter({ merchant_id: u.merchant_id }, '-created_date', 100);
        setInvoices(list || []);
      }
    } catch (e) {
      console.error('Load invoices error:', e);
    } finally {
      setLoading(false);
    }
  };

  const paylinkFor = (inv) => `${window.location.origin}/PayInvoice?invoice=${inv.id}&token=${inv.pay_token}`;

  const createInvoice = async () => {
    if (!form.customer_name || !form.amount) {
      toast({ title: 'Required', description: 'Customer name and amount are required.', variant: 'destructive' });
      return;
    }
    try {
      setCreating(true);
      const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
      const invoice_number = 'INV-' + Date.now().toString().slice(-6);
      const created = await base44.entities.Invoice.create({
        merchant_id: user.merchant_id,
        invoice_number,
        customer_name: form.customer_name,
        customer_email: form.customer_email,
        amount: parseFloat(form.amount),
        currency: form.currency || 'USD',
        due_date: form.due_date || undefined,
        notes: form.notes,
        status: 'draft',
        pay_token: token,
        created_by_name: user.full_name || user.email
      });
      setInvoices((prev) => [created, ...prev]);
      setForm(EMPTY);
      setDialogOpen(false);
      toast({ title: 'Invoice created', description: invoice_number });
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const copyLink = async (inv) => {
    try {
      await navigator.clipboard.writeText(paylinkFor(inv));
      toast({ title: 'Paylink copied', description: 'Share it with your customer to get paid.' });
    } catch (_) {
      toast({ title: 'Copy failed', description: 'Copy the URL manually.', variant: 'destructive' });
    }
  };

  const markSent = async (inv) => {
    try {
      await base44.entities.Invoice.update(inv.id, { status: 'sent', sent_at: new Date().toISOString() });
      setInvoices((prev) => prev.map((i) => i.id === inv.id ? { ...i, status: 'sent', sent_at: new Date().toISOString() } : i));
      toast({ title: 'Marked as sent' });
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const voidInvoice = async (inv) => {
    if (!confirm('Void this invoice?')) return;
    try {
      await base44.entities.Invoice.update(inv.id, { status: 'void' });
      setInvoices((prev) => prev.map((i) => i.id === inv.id ? { ...i, status: 'void' } : i));
      toast({ title: 'Invoice voided' });
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const StatusBadge = ({ status }) => {
    if (status === 'paid') return <Badge className="bg-green-600 text-white">Paid</Badge>;
    if (status === 'overdue') return <Badge variant="destructive">Overdue</Badge>;
    if (status === 'void') return <Badge variant="secondary">Void</Badge>;
    if (status === 'sent') return <Badge variant="default">Sent</Badge>;
    return <Badge variant="outline">Draft</Badge>;
  };

  const fmtMoney = (n, c) => new Intl.NumberFormat('en-US', { style: 'currency', currency: c || 'USD' }).format(n || 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-emerald-600" />
              Invoices & Paylinks
            </h1>
            <p className="text-sm text-gray-500">Create an invoice and share a paylink so customers can pay online.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> New Invoice</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>New Invoice</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Customer Name *</Label>
                  <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} placeholder="Jane Smith" />
                </div>
                <div className="space-y-2">
                  <Label>Customer Email</Label>
                  <Input type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} placeholder="jane@example.com" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Amount *</Label>
                    <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} placeholder="USD" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Notes / Memo</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Shown to the customer on the pay page" rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={createInvoice} disabled={creating}>
                  {creating ? 'Creating…' : 'Create Invoice'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {invoices.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No invoices yet. Create your first invoice to generate a paylink.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {invoices.map((inv) => (
              <Card key={inv.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{inv.invoice_number}</span>
                        <StatusBadge status={inv.status} />
                      </div>
                      <p className="text-sm text-gray-600">
                        {inv.customer_name || '—'}
                        {inv.customer_email ? ` · ${inv.customer_email}` : ''}
                      </p>
                      {inv.due_date && <p className="text-xs text-gray-400">Due {new Date(inv.due_date).toLocaleDateString()}</p>}
                      {inv.notes && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{inv.notes}</p>}
                    </div>
                    <div className="flex flex-col md:items-end gap-2">
                      <span className="text-lg font-bold text-gray-900">{fmtMoney(inv.amount, inv.currency)}</span>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="default" onClick={() => copyLink(inv)}>
                          <Copy className="w-4 h-4 mr-1" /> Copy Paylink
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => window.open(paylinkFor(inv), '_blank')}>
                          <ExternalLink className="w-4 h-4 mr-1" /> Preview
                        </Button>
                        {inv.status === 'draft' && (
                          <Button size="sm" variant="outline" onClick={() => markSent(inv)}>
                            <Send className="w-4 h-4 mr-1" /> Mark Sent
                          </Button>
                        )}
                        {!['paid', 'void'].includes(inv.status) && (
                          <Button size="sm" variant="ghost" onClick={() => voidInvoice(inv)}>
                            <Ban className="w-4 h-4 mr-1" /> Void
                          </Button>
                        )}
                      </div>
                    </div>
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