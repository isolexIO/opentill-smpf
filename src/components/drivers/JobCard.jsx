import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, MapPin, Navigation, Package, CheckCircle2 } from 'lucide-react';

const STATUS_STYLE = {
  available: 'bg-blue-100 text-blue-700',
  accepted: 'bg-amber-100 text-amber-700',
  picked_up: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-600'
};

export default function JobCard({ job, isMine, onAccept, onPickup, onDeliver }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <div className="font-semibold truncate">{job.order_number || 'Delivery'}</div>
            <div className="text-sm text-gray-600 truncate">
              {job.customer_name || 'Customer'}
              {job.customer_phone && ` · ${job.customer_phone}`}
            </div>
          </div>
          <Badge className={STATUS_STYLE[job.status] || STATUS_STYLE.available}>
            {job.status.replace('_', ' ')}
          </Badge>
        </div>

        <div className="text-sm space-y-1">
          <div className="flex gap-2">
            <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
            <span><span className="text-gray-500">From:</span> {job.pickup_address}</span>
          </div>
          <div className="flex gap-2">
            <Navigation className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
            <span><span className="text-gray-500">To:</span> {job.delivery_address}</span>
          </div>
        </div>

        {job.items_summary && (
          <div className="flex gap-2 text-sm text-gray-600">
            <Package className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
            <span>{job.items_summary}</span>
          </div>
        )}
        {job.notes && <div className="text-xs text-gray-500 italic">{job.notes}</div>}
        {job.total ? <div className="text-sm font-medium">Total: ${Number(job.total).toFixed(2)}</div> : null}

        <div className="flex flex-wrap gap-2 pt-1">
          {job.status === 'available' && (
            <Button size="sm" onClick={() => onAccept(job)} disabled={!onAccept}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> Accept
            </Button>
          )}
          {isMine && job.status === 'accepted' && (
            <Button size="sm" onClick={() => onPickup(job)}>
              <Package className="w-4 h-4 mr-1" /> Picked Up
            </Button>
          )}
          {isMine && job.status === 'picked_up' && (
            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => onDeliver(job)}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> Mark Delivered
            </Button>
          )}
          {job.customer_phone && (
            <Button size="sm" variant="outline" onClick={() => (window.location.href = `tel:${job.customer_phone}`)}>
              <Phone className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}