import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Users, Plus, Mail, Shield, Edit, Trash2, CheckCircle,
  AlertCircle, Loader2, ChevronDown, ChevronUp, UserPlus, Key, Clock
} from 'lucide-react';

// ── Role definitions ────────────────────────────────────────────────────────
const ROLES = [
  {
    id: 'merchant_admin',
    label: 'Admin',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    description: 'Full system access — manage everything',
  },
  {
    id: 'manager',
    label: 'Manager',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    description: 'Operations, reports, inventory',
  },
  {
    id: 'cashier',
    label: 'Cashier',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    description: 'Process orders & payments only',
  },
  {
    id: 'kitchen',
    label: 'Kitchen Staff',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    description: 'View and manage kitchen display',
  },
  {
    id: 'delivery',
    label: 'Delivery',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    description: 'View and manage deliveries',
  },
  {
    id: 'viewer',
    label: 'Viewer',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300',
    description: 'Read-only access to reports',
  },
];

// ── Permission groups ────────────────────────────────────────────────────────
const PERMISSION_GROUPS = [
  {
    id: 'pos',
    label: 'Point of Sale',
    icon: '🛒',
    permissions: [
      { id: 'process_orders', label: 'Process Orders', desc: 'Create, edit and complete orders' },
      { id: 'process_refunds', label: 'Issue Refunds', desc: 'Refund completed transactions' },
      { id: 'apply_discounts', label: 'Apply Discounts', desc: 'Add discounts and comps to orders' },
      { id: 'void_orders', label: 'Void Orders', desc: 'Cancel and void active orders' },
      { id: 'open_cash_drawer', label: 'Open Cash Drawer', desc: 'Manually open the cash drawer' },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory & Products',
    icon: '📦',
    permissions: [
      { id: 'manage_products', label: 'Manage Products', desc: 'Add, edit and remove products' },
      { id: 'manage_inventory', label: 'Manage Inventory', desc: 'Stock management and reordering' },
      { id: 'view_inventory', label: 'View Inventory', desc: 'Read-only inventory access' },
    ],
  },
  {
    id: 'customers',
    label: 'Customers',
    icon: '👤',
    permissions: [
      { id: 'manage_customers', label: 'Manage Customers', desc: 'Add, edit and view customers' },
      { id: 'view_customer_data', label: 'View Customer Data', desc: 'Read customer profiles and history' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports & Analytics',
    icon: '📊',
    permissions: [
      { id: 'view_reports', label: 'View Reports', desc: 'Access sales and analytics' },
      { id: 'export_reports', label: 'Export Reports', desc: 'Download CSV/PDF exports' },
      { id: 'view_employee_reports', label: 'View Staff Reports', desc: 'See performance and time data' },
    ],
  },
  {
    id: 'admin',
    label: 'Administration',
    icon: '⚙️',
    permissions: [
      { id: 'manage_users', label: 'Manage Staff', desc: 'Invite, edit and remove staff members' },
      { id: 'manage_settings', label: 'Manage Settings', desc: 'Configure all system settings' },
      { id: 'configure_payments', label: 'Configure Payments', desc: 'Set up payment gateways' },
      { id: 'configure_devices', label: 'Configure Devices', desc: 'Manage hardware and terminals' },
    ],
  },
];

const ROLE_DEFAULTS = {
  merchant_admin: PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.id)),
  manager: ['process_orders', 'process_refunds', 'apply_discounts', 'manage_products', 'manage_inventory', 'view_inventory', 'manage_customers', 'view_customer_data', 'view_reports', 'export_reports', 'view_employee_reports'],
  cashier: ['process_orders', 'apply_discounts', 'view_customer_data', 'open_cash_drawer'],
  kitchen: ['process_orders'],
  delivery: ['process_orders', 'view_customer_data'],
  viewer: ['view_reports', 'view_inventory', 'view_customer_data'],
};

// ── Helper ───────────────────────────────────────────────────────────────────
function roleMeta(roleId) {
  return ROLES.find(r => r.id === roleId) || { label: roleId, color: 'bg-gray-100 text-gray-700' };
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// ── Staff row ────────────────────────────────────────────────────────────────
function StaffRow({ employee, onEdit, onToggleActive }) {
  const role = roleMeta(employee.role);
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-700/30 transition-colors">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
        {initials(employee.full_name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">{employee.full_name || 'Unnamed'}</span>
          <Badge className={`text-[10px] px-2 py-0 ${role.color}`}>{role.label}</Badge>
          {!employee.is_active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
          {employee.currently_clocked_in && (
            <Badge className="text-[10px] bg-green-500 text-white">
              <Clock className="w-2.5 h-2.5 mr-1" />Clocked In
            </Badge>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{employee.email}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
          {(employee.permissions || []).length} permissions
          {employee.employee_id && ` · ID: ${employee.employee_id}`}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Switch
          checked={!!employee.is_active}
          onCheckedChange={() => onToggleActive(employee)}
          title={employee.is_active ? 'Deactivate' : 'Activate'}
        />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(employee)}>
          <Edit className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── Permission editor ────────────────────────────────────────────────────────
function PermissionEditor({ permissions, onChange }) {
  const [openGroups, setOpenGroups] = useState(['pos']);
  const toggle = (gId) => setOpenGroups(prev => prev.includes(gId) ? prev.filter(x => x !== gId) : [...prev, gId]);
  const allIds = PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.id));
  const allSelected = allIds.every(id => permissions.includes(id));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Permissions</span>
        <button
          type="button"
          onClick={() => onChange(allSelected ? [] : allIds)}
          className="text-xs text-blue-600 hover:underline"
        >
          {allSelected ? 'Deselect all' : 'Select all'}
        </button>
      </div>
      {PERMISSION_GROUPS.map(group => {
        const groupPerms = group.permissions.map(p => p.id);
        const allChecked = groupPerms.every(id => permissions.includes(id));
        const someChecked = groupPerms.some(id => permissions.includes(id));
        const isOpen = openGroups.includes(group.id);
        return (
          <div key={group.id} className="border border-slate-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => toggle(group.id)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-gray-700/50 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{group.icon}</span>
                <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">{group.label}</span>
                <Badge variant="outline" className="text-[10px] px-1.5">
                  {groupPerms.filter(id => permissions.includes(id)).length}/{groupPerms.length}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allChecked}
                  data-state={someChecked && !allChecked ? 'indeterminate' : allChecked ? 'checked' : 'unchecked'}
                  onCheckedChange={(v) => {
                    if (v) onChange([...new Set([...permissions, ...groupPerms])]);
                    else onChange(permissions.filter(id => !groupPerms.includes(id)));
                  }}
                  onClick={e => e.stopPropagation()}
                />
                {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </button>
            {isOpen && (
              <div className="divide-y divide-slate-100 dark:divide-gray-700/50">
                {group.permissions.map(perm => (
                  <label key={perm.id} className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700/30">
                    <Checkbox
                      checked={permissions.includes(perm.id)}
                      onCheckedChange={() => {
                        const next = permissions.includes(perm.id)
                          ? permissions.filter(id => id !== perm.id)
                          : [...permissions, perm.id];
                        onChange(next);
                      }}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{perm.label}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{perm.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Staff form dialog ────────────────────────────────────────────────────────
function StaffFormDialog({ isOpen, onClose, employee, onSave, currentUser }) {
  const isEdit = !!employee;
  const [form, setForm] = useState({
    full_name: '', email: '', pin: '', role: 'cashier',
    employee_id: '', hourly_rate: 0, permissions: [...(ROLE_DEFAULTS.cashier)],
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [inviteByEmail, setInviteByEmail] = useState(!isEdit);

  useEffect(() => {
    if (employee) {
      setForm({
        full_name: employee.full_name || '',
        email: employee.email || '',
        pin: employee.pin || '',
        role: employee.role || 'cashier',
        employee_id: employee.employee_id || '',
        hourly_rate: employee.hourly_rate || 0,
        permissions: employee.permissions || [...(ROLE_DEFAULTS.cashier)],
      });
    } else {
      setForm({ full_name: '', email: '', pin: '', role: 'cashier', employee_id: '', hourly_rate: 0, permissions: [...(ROLE_DEFAULTS.cashier)] });
      setInviteByEmail(true);
    }
    setMsg(null);
  }, [employee, isOpen]);

  const handleRoleChange = (role) => {
    setForm(f => ({ ...f, role, permissions: [...(ROLE_DEFAULTS[role] || [])] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email) { setMsg({ type: 'error', text: 'Email is required' }); return; }
    if (!isEdit && !inviteByEmail && form.pin.length < 4) {
      setMsg({ type: 'error', text: 'PIN must be at least 4 digits' }); return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await base44.entities.User.update(employee.id, {
          full_name: form.full_name,
          role: form.role,
          pin: form.pin || employee.pin,
          employee_id: form.employee_id,
          hourly_rate: form.hourly_rate,
          permissions: form.permissions,
        });
        setMsg({ type: 'success', text: 'Staff member updated!' });
      } else if (inviteByEmail) {
        // Invite via platform
        await base44.users.inviteUser(form.email, form.role === 'merchant_admin' ? 'admin' : 'user');
        // Also create a User record pre-populated
        await base44.entities.User.create({
          full_name: form.full_name || form.email.split('@')[0],
          email: form.email,
          role: form.role,
          employee_id: form.employee_id,
          hourly_rate: form.hourly_rate,
          permissions: form.permissions,
          merchant_id: currentUser.merchant_id,
          dealer_id: currentUser.dealer_id,
          is_active: true,
          total_sales: 0,
          total_orders: 0,
          total_hours_worked: 0,
          currently_clocked_in: false,
        });
        setMsg({ type: 'success', text: `Invitation sent to ${form.email}!` });
      } else {
        const pin = form.pin || Math.floor(1000 + Math.random() * 9000).toString();
        await base44.entities.User.create({
          ...form,
          pin,
          merchant_id: currentUser.merchant_id,
          dealer_id: currentUser.dealer_id,
          is_active: true,
          total_sales: 0,
          total_orders: 0,
          total_hours_worked: 0,
          currently_clocked_in: false,
        });
        setMsg({ type: 'success', text: `Staff member created! PIN: ${pin}` });
      }
      setTimeout(() => { onSave(); onClose(); }, 1200);
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto dark:bg-gray-800 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 dark:text-white">
            {isEdit ? <><Edit className="w-4 h-4" /> Edit Staff Member</> : <><UserPlus className="w-4 h-4" /> Add Staff Member</>}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Add method toggle (new only) */}
          {!isEdit && (
            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-gray-700 rounded-xl">
              <button
                type="button"
                onClick={() => setInviteByEmail(true)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${inviteByEmail ? 'bg-white dark:bg-gray-600 shadow text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
              >
                <Mail className="w-4 h-4" /> Invite by Email
              </button>
              <button
                type="button"
                onClick={() => setInviteByEmail(false)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${!inviteByEmail ? 'bg-white dark:bg-gray-600 shadow text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
              >
                <Key className="w-4 h-4" /> Create with PIN
              </button>
            </div>
          )}

          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3">
            {!inviteByEmail && (
              <div className="col-span-2">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Full Name</Label>
                <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  placeholder="Jane Smith" className="mt-1 dark:bg-gray-700 dark:border-gray-600" />
              </div>
            )}
            {inviteByEmail && (
              <div>
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Full Name (optional)</Label>
                <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  placeholder="Jane Smith" className="mt-1 dark:bg-gray-700 dark:border-gray-600" />
              </div>
            )}
            <div className={inviteByEmail ? '' : 'col-span-2'}>
              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Email *</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="staff@example.com" required className="mt-1 dark:bg-gray-700 dark:border-gray-600" />
            </div>
            {!inviteByEmail && (
              <div>
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">PIN (4-6 digits)</Label>
                <Input value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/, '').slice(0, 6) }))}
                  placeholder="Auto-generate if empty" className="mt-1 font-mono dark:bg-gray-700 dark:border-gray-600" />
              </div>
            )}
            <div>
              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Employee ID</Label>
              <Input value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}
                placeholder="EMP-001" className="mt-1 dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Hourly Rate ($)</Label>
              <Input type="number" step="0.01" value={form.hourly_rate}
                onChange={e => setForm(f => ({ ...f, hourly_rate: parseFloat(e.target.value) || 0 }))}
                className="mt-1 dark:bg-gray-700 dark:border-gray-600" />
            </div>
          </div>

          {/* Role */}
          <div>
            <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-2">Role</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ROLES.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleRoleChange(r.id)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${form.role === r.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-gray-600 hover:border-slate-300'}`}
                >
                  <Badge className={`text-[10px] mb-1 ${r.color}`}>{r.label}</Badge>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">{r.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Permissions */}
          <PermissionEditor
            permissions={form.permissions}
            onChange={(p) => setForm(f => ({ ...f, permissions: p }))}
          />

          {msg && (
            <Alert className={msg.type === 'success' ? 'bg-green-50 border-green-200 dark:bg-green-900/20' : 'bg-red-50 border-red-200 dark:bg-red-900/20'}>
              {msg.type === 'success' ? <CheckCircle className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-red-500" />}
              <AlertDescription className={msg.type === 'success' ? 'text-green-800 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
                {msg.text}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="dark:border-gray-600 dark:text-white">Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : isEdit ? 'Save Changes' : inviteByEmail ? 'Send Invite' : 'Create Staff'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function StaffManagementTab({ merchant }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const u = JSON.parse(localStorage.getItem('pinLoggedInUser')) || await base44.auth.me();
      setCurrentUser(u);
      const list = await base44.entities.User.filter({ merchant_id: u.merchant_id });
      setStaff(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (employee) => {
    await base44.entities.User.update(employee.id, { is_active: !employee.is_active });
    loadData();
  };

  const filtered = staff.filter(s => {
    const matchesSearch = !search ||
      s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || s.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const active = staff.filter(s => s.is_active);
  const clockedIn = staff.filter(s => s.currently_clocked_in);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-500" /> Staff Management
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Invite employees, assign roles, and configure granular POS access permissions.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Staff', value: staff.length, icon: '👥' },
          { label: 'Active', value: active.length, icon: '✅' },
          { label: 'Clocked In', value: clockedIn.length, icon: '🟢' },
        ].map(s => (
          <Card key={s.label} className="dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="p-4 flex items-center gap-3">
              <span className="text-2xl">{s.icon}</span>
              <div>
                <p className="text-xl font-bold dark:text-white">{s.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40 dark:bg-gray-700 dark:border-gray-600">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
            <SelectItem value="all">All Roles</SelectItem>
            {ROLES.map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button
          className="bg-blue-600 hover:bg-blue-700 gap-2"
          onClick={() => { setEditing(null); setShowForm(true); }}
        >
          <Plus className="w-4 h-4" /> Add Staff
        </Button>
      </div>

      {/* Role legend */}
      <div className="flex flex-wrap gap-2">
        {ROLES.map(r => (
          <Badge key={r.id} className={`text-[11px] cursor-pointer ${r.color} ${roleFilter === r.id ? 'ring-2 ring-offset-1 ring-blue-500' : ''}`}
            onClick={() => setRoleFilter(v => v === r.id ? 'all' : r.id)}>
            {r.label}
          </Badge>
        ))}
      </div>

      {/* Staff list */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="p-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No staff members found</p>
              <p className="text-sm mt-1">Click "Add Staff" to invite your first employee.</p>
            </div>
          ) : (
            filtered.map(emp => (
              <StaffRow
                key={emp.id}
                employee={emp}
                onEdit={(e) => { setEditing(e); setShowForm(true); }}
                onToggleActive={handleToggleActive}
              />
            ))
          )}
        </CardContent>
      </Card>

      <StaffFormDialog
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        employee={editing}
        onSave={loadData}
        currentUser={currentUser}
      />
    </div>
  );
}