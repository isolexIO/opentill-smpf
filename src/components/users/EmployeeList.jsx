import React from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Clock, DollarSign } from 'lucide-react';

export default function EmployeeList({ employees, onEdit, onRefresh }) {
  const handleDelete = async (employee) => {
    if (!confirm(`Are you sure you want to remove ${employee.full_name}?`)) return;

    try {
      const pinUser = JSON.parse(localStorage.getItem('pinLoggedInUser') || '{}');
      const session_token = localStorage.getItem('pinSessionToken');
      const { data } = await base44.functions.invoke('manageEmployee', {
        action: 'update',
        merchant_id: pinUser.merchant_id,
        session_token,
        id: employee.id,
        data: {
          is_active: false,
          termination_date: new Date().toISOString().split('T')[0]
        }
      });
      if (!data?.success) throw new Error(data?.error || 'Failed to remove employee');
      onRefresh();
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert(error.message || 'Failed to remove employee');
    }
  };

  return (
    <div className="space-y-3">
      {employees.map(employee => (
        <div
          key={employee.id}
          className="flex items-center justify-between p-4 border rounded-lg dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <div className="flex items-center gap-4 flex-1">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold">
              {employee.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold dark:text-white">{employee.full_name}</h4>
                <Badge variant={employee.is_active ? 'default' : 'secondary'} className="dark:bg-gray-700">
                  {employee.is_active ? 'Active' : 'Inactive'}
                </Badge>
                {employee.currently_clocked_in && (
                  <Badge className="bg-green-500 dark:bg-green-600">
                    <Clock className="w-3 h-3 mr-1" />
                    Clocked In
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{employee.email}</p>
              <div className="flex gap-4 mt-1 text-sm text-gray-600 dark:text-gray-300">
                <span>Role: {employee.role || 'user'}</span>
                {employee.employee_id && <span>ID: {employee.employee_id}</span>}
                {employee.hourly_rate > 0 && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    ${employee.hourly_rate}/hr
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right mr-4">
              <p className="text-sm font-medium dark:text-white">
                ${(employee.total_sales || 0).toFixed(0)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {employee.total_orders || 0} orders
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onEdit(employee)}>
              <Edit className="w-4 h-4" />
            </Button>
            {employee.is_active && (
              <Button variant="ghost" size="icon" onClick={() => handleDelete(employee)} className="text-red-600">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}