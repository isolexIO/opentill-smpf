import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Clock } from 'lucide-react';

export default function MobileUserCard({ employee, onEdit }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-3">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">{employee.full_name}</p>
          <p className="text-sm text-gray-500">{employee.email}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge className={employee.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}>
            {employee.is_active ? 'Active' : 'Inactive'}
          </Badge>
          {employee.currently_clocked_in && (
            <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Clocked In
            </Badge>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>
          <p className="text-gray-400 text-xs">Role</p>
          <p className="font-medium text-gray-900 dark:text-white capitalize">{employee.role || '—'}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Hours Worked</p>
          <p className="font-medium text-gray-900 dark:text-white">
            {(employee.total_hours_worked || 0).toFixed(1)}h
          </p>
        </div>
      </div>
      <Button size="sm" variant="outline" className="w-full min-h-[44px]" onClick={() => onEdit(employee)}>
        <Edit className="w-4 h-4 mr-2" /> Edit Employee
      </Button>
    </div>
  );
}