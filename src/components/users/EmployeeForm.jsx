import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PERMISSIONS = [
  { value: 'process_orders', label: 'Process Orders' },
  { value: 'manage_products', label: 'Manage Products' },
  { value: 'manage_customers', label: 'Manage Customers' },
  { value: 'view_reports', label: 'View Reports' },
  { value: 'manage_settings', label: 'Manage Settings' },
  { value: 'manage_users', label: 'Manage Users' },
  { value: 'manage_inventory', label: 'Manage Inventory' },
  { value: 'issue_refunds', label: 'Issue Refunds' },
  { value: 'manage_discounts', label: 'Manage Discounts' },
  { value: 'close_register', label: 'Close Register' }
];

export default function EmployeeForm({ employee, isOpen, onClose, onSave, currentUser }) {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'user',
    employee_id: '',
    pin: '',
    hourly_rate: 0,
    commission_rate: 0,
    hire_date: '',
    permissions: ['process_orders'],
    emergency_contact: {
      name: '',
      phone: '',
      relationship: ''
    },
    performance_notes: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (employee) {
      setFormData({
        full_name: employee.full_name || '',
        email: employee.email || '',
        phone: employee.phone || '',
        role: employee.role || 'user',
        employee_id: employee.employee_id || '',
        pin: employee.pin || '',
        hourly_rate: employee.hourly_rate || 0,
        commission_rate: employee.commission_rate || 0,
        hire_date: employee.hire_date || '',
        permissions: employee.permissions || ['process_orders'],
        emergency_contact: employee.emergency_contact || { name: '', phone: '', relationship: '' },
        performance_notes: employee.performance_notes || ''
      });
    }
  }, [employee]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const session_token = localStorage.getItem('pinSessionToken');
    try {
      if (employee) {
        const { data } = await base44.functions.invoke('manageEmployee', {
          action: 'update',
          merchant_id: currentUser.merchant_id,
          session_token,
          id: employee.id,
          data: formData
        });
        if (!data?.success) throw new Error(data?.error || 'Failed to update employee');
      } else {
        const { data } = await base44.functions.invoke('manageEmployee', {
          action: 'create',
          merchant_id: currentUser.merchant_id,
          session_token,
          data: formData
        });
        if (!data?.success) throw new Error(data?.error || 'Failed to create employee');
        alert(`Employee created successfully! PIN: ${data.pin}`);
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving employee:', error);
      alert(error.message || 'Failed to save employee');
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (permission) => {
    const current = formData.permissions || [];
    if (current.includes(permission)) {
      setFormData({ ...formData, permissions: current.filter(p => p !== permission) });
    } else {
      setFormData({ ...formData, permissions: [...current, permission] });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-gray-800 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="dark:text-white">
            {employee ? 'Edit Employee' : 'Add New Employee'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="dark:text-gray-200">Full Name *</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <Label className="dark:text-gray-200">Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <Label className="dark:text-gray-200">Phone</Label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <Label className="dark:text-gray-200">Employee ID</Label>
              <Input
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <Label className="dark:text-gray-200">Role</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  <SelectItem value="user" className="dark:text-white">Employee</SelectItem>
                  <SelectItem value="manager" className="dark:text-white">Manager</SelectItem>
                  <SelectItem value="admin" className="dark:text-white">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="dark:text-gray-200">PIN (4-6 digits)</Label>
              <Input
                value={formData.pin}
                onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                placeholder="Leave empty to auto-generate"
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <Label className="dark:text-gray-200">Hourly Rate ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.hourly_rate}
                onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) || 0 })}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <Label className="dark:text-gray-200">Commission Rate (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.commission_rate}
                onChange={(e) => setFormData({ ...formData, commission_rate: parseFloat(e.target.value) || 0 })}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <Label className="dark:text-gray-200">Hire Date</Label>
              <Input
                type="date"
                value={formData.hire_date}
                onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          <div>
            <Label className="dark:text-gray-200 mb-3 block">Permissions</Label>
            <div className="grid grid-cols-2 gap-3">
              {PERMISSIONS.map(perm => (
                <div key={perm.value} className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.permissions?.includes(perm.value)}
                    onCheckedChange={() => togglePermission(perm.value)}
                  />
                  <label className="text-sm dark:text-gray-300">{perm.label}</label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="dark:text-gray-200 mb-2 block">Emergency Contact</Label>
            <div className="grid grid-cols-3 gap-4">
              <Input
                placeholder="Name"
                value={formData.emergency_contact.name}
                onChange={(e) => setFormData({
                  ...formData,
                  emergency_contact: { ...formData.emergency_contact, name: e.target.value }
                })}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <Input
                placeholder="Phone"
                value={formData.emergency_contact.phone}
                onChange={(e) => setFormData({
                  ...formData,
                  emergency_contact: { ...formData.emergency_contact, phone: e.target.value }
                })}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <Input
                placeholder="Relationship"
                value={formData.emergency_contact.relationship}
                onChange={(e) => setFormData({
                  ...formData,
                  emergency_contact: { ...formData.emergency_contact, relationship: e.target.value }
                })}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          <div>
            <Label className="dark:text-gray-200">Performance Notes</Label>
            <Textarea
              value={formData.performance_notes}
              onChange={(e) => setFormData({ ...formData, performance_notes: e.target.value })}
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="dark:border-gray-600 dark:text-white">
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (employee ? 'Update' : 'Create')} Employee
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}