import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { HelpCircle, Loader2, Plus } from 'lucide-react';

const STATUS_COLORS = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  waiting_on_merchant: 'bg-orange-100 text-orange-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-200 text-gray-500',
};

export default function PortalSupport({ merchantId }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!merchantId) return;
    (async () => {
      try {
        const list = await base44.entities.SupportTicket.filter(
          { merchant_id: merchantId },
          '-created_date',
          5
        );
        setTickets(list || []);
      } catch (e) {
        console.error('PortalSupport load error', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [merchantId]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-orange-600" /> Support
          </span>
          <Link to={createPageUrl('Support')}>
            <Button variant="ghost" size="sm">
              <Plus className="w-4 h-4 mr-1" /> New
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : tickets.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No support tickets.</p>
        ) : (
          <div className="space-y-2">
            {tickets.map((t) => (
              <div key={t.id} className="flex items-center justify-between text-sm border-b pb-2">
                <div className="min-w-0">
                  <div className="font-medium truncate">{t.subject}</div>
                  <div className="text-xs text-gray-500">{t.ticket_number}</div>
                </div>
                <Badge className={STATUS_COLORS[t.status] || 'bg-gray-100'}>
                  {t.status?.replace(/_/g, ' ')}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}