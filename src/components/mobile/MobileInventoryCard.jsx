import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, TrendingUp, Trash2 } from 'lucide-react';

export default function MobileInventoryCard({ item, onEdit, onRestock, onDelete }) {
  const isLow = item.quantity <= item.reorder_threshold;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-3">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <p className="font-semibold text-gray-900 dark:text-white">{item.name}</p>
          {item.sku && <p className="text-xs font-mono text-gray-400">{item.sku}</p>}
        </div>
        <Badge className={
          item.status === 'in_stock' ? 'bg-green-100 text-green-800' :
          item.status === 'low_stock' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }>
          {item.status?.replace(/_/g, ' ')}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm mb-3">
        <div>
          <p className="text-gray-400 text-xs">Quantity</p>
          <p className={`font-bold ${isLow ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
            {item.quantity} {item.unit_of_measure}
            {isLow && <span className="ml-1 text-xs bg-red-100 text-red-700 px-1 rounded">Low</span>}
          </p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Unit Cost</p>
          <p className="font-medium text-gray-900 dark:text-white">${item.cost_per_unit?.toFixed(2) || '—'}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Value</p>
          <p className="font-medium text-gray-900 dark:text-white">
            ${(item.quantity * (item.cost_per_unit || 0)).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1 min-h-[44px]" onClick={() => onEdit(item)}>
          <Edit className="w-4 h-4 mr-1" /> Edit
        </Button>
        <Button size="sm" variant="outline" className="flex-1 min-h-[44px]" onClick={() => onRestock(item)}>
          <TrendingUp className="w-4 h-4 mr-1" /> Restock
        </Button>
        <Button size="sm" variant="ghost" className="text-red-500 min-h-[44px] min-w-[44px]" onClick={() => onDelete(item)}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}