import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { CreditCard, Loader2 } from 'lucide-react';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  void: 'bg-gray-200 text-gray-500',
  refunded: 'bg-yellow-100 text-yellow-700',
};

export default function PortalBilling({ merchantId }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!merchantId) return;
    (async () => {
      try {
        const list = await base44.entities.Invoice.filter(
          { merchant_id: merchantId },
          '-created_date',
          20
        );
        setInvoices(list || []);
      } catch (e) {
        console.error('PortalBilling load error', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [merchantId]);

  const totalDue = invoices
    .filter((i) => i.status === 'sent' || i.status === 'overdue')
    .reduce((s, i) => s + (i.amount || 0), 0);
  const totalPaid = invoices
    .filter((i) => i.status === 'paid')
    .reduce((s, i) => s + (i.amount || 0), 0);

  const summaryCards = [
    { label: 'Total Paid', value: totalPaid, color: 'text-green-600' },
    { label: 'Outstanding', value: totalDue, color: totalDue > 0 ? 'text-red-600' : 'text-gray-600' },
    { label: 'Invoices', value: invoices.length, color: 'text-blue-600', isCount: true },
  ];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-purple-600" /> Billing &amp; Invoices
          </span>
          <Link to={createPageUrl('Invoices')}>
            <Button variant="ghost" size="sm">View All</Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {summaryCards.map((s) => (
            <div key={s.label} className="text-center p-2 rounded-lg bg-gray-50">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={`text-sm font-bold ${s.color}`}>
                {s.isCount ? s.value : `$${s.value.toFixed(2)}`}
              </p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No invoices yet.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between text-sm border-b pb-2 last:border-0"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{inv.invoice_number}</div>
                  <div className="text-xs text-gray-500">
                    ${(inv.amount || 0).toFixed(2)}
                    {inv.due_date && ` · Due ${new Date(inv.due_date).toLocaleDateString()}`}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {(inv.status === 'sent' || inv.status === 'overdue') && (
                    <Link to={createPageUrl(`PayInvoice?id=${inv.id}`)}>
                      <Button size="sm" variant="outline" className="h-7 text-xs">
                        Pay
                      </Button>
                    </Link>
                  )}
                  <Badge className={STATUS_COLORS[inv.status] || 'bg-gray-100'}>
                    {inv.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}