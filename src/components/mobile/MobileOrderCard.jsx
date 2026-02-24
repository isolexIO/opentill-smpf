import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

const STATUS_CONFIG = {
  preview: { label: 'Preview', color: 'bg-gray-100 text-gray-800', icon: Clock },
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-800', icon: RefreshCw },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  refunded: { label: 'Refunded', color: 'bg-red-100 text-red-800', icon: AlertCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800', icon: AlertCircle },
};

export default function MobileOrderCard({ order, isSelected, onClick }) {
  const cfg = STATUS_CONFIG[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-800', icon: AlertCircle };
  const Icon = cfg.icon;

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-xl border mb-3 cursor-pointer min-h-[56px] transition-colors active:scale-[0.99] ${
        isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="font-mono text-sm font-bold text-gray-900 dark:text-white">
          #{order.order_number}
        </span>
        <Badge className={cfg.color}>
          <Icon className="w-3 h-3 mr-1" />
          {cfg.label}
        </Badge>
      </div>
      <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
        <span>{order.customer_name || 'Walk-in'}</span>
        <span className="font-semibold text-gray-900 dark:text-white">
          ${(order.total || 0).toFixed(2)}
        </span>
      </div>
      <div className="text-xs text-gray-400 mt-1">
        {order.created_date ? format(new Date(order.created_date), 'MMM d, HH:mm') : ''}
        {order.items?.length ? ` · ${order.items.length} items` : ''}
      </div>
    </div>
  );
}