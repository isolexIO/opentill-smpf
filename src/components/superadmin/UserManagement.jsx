import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, UserCheck, Users as UsersIcon, Mail, Shield } from 'lucide-react';
import { createPageUrl } from '@/utils';

const ROLE_COLORS = {
  admin: 'bg-red-100 text-red-800',
  super_admin: 'bg-purple-100 text-purple-800',
  root_admin: 'bg-pink-100 text-pink-800',
  dealer_admin: 'bg-blue-100 text-blue-800',
  merchant_admin: 'bg-green-100 text-green-800',
  builder: 'bg-amber-100 text-amber-800',
  user: 'bg-gray-100 text-gray-800',
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [impersonatingId, setImpersonatingId] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const allUsers = await base44.entities.User.list('-created_date', 500);
      setUsers(allUsers || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonate = async (targetUser) => {
    try {
      const currentUser = await base44.auth.me();

      // Prevent admins from impersonating other admins (safety)
      if (['admin', 'super_admin', 'root_admin'].includes(targetUser.role)) {
        if (!confirm(`You are about to impersonate another admin account (${targetUser.email}). This is a sensitive action. Continue?`)) {
          return;
        }
      }

      const impersonationUser = {
        id: currentUser.id,
        email: currentUser.email,
        full_name: currentUser.full_name,
        target_user_id: targetUser.id,
        target_user_email: targetUser.email,
        merchant_id: targetUser.merchant_id || undefined,
        dealer_id: targetUser.dealer_id || undefined,
        role: targetUser.role || 'user',
        is_impersonating: true,
        original_admin_email: currentUser.email,
        permissions: targetUser.permissions || [],
      };

      localStorage.setItem('pinLoggedInUser', JSON.stringify(impersonationUser));

      await base44.entities.SystemLog.create({
        log_type: 'super_admin_action',
        action: 'User impersonation started',
        description: `Super admin ${currentUser.email} started impersonating user: ${targetUser.email} (${targetUser.role || 'user'})`,
        user_email: currentUser.email,
        user_role: currentUser.role,
        severity: 'warning',
        metadata: {
          impersonated_user_id: targetUser.id,
          impersonated_email: targetUser.email,
          impersonated_role: targetUser.role,
        },
      });

      // Route based on the target user's role
      if (targetUser.role === 'dealer_admin' || targetUser.role === 'root_admin') {
        window.location.href = createPageUrl('DealerDashboard');
      } else if (targetUser.role === 'builder') {
        window.location.href = createPageUrl('BuilderDashboard');
      } else if (targetUser.role === 'user' && targetUser.merchant_id) {
        window.location.href = createPageUrl('CustomerPortal');
      } else if (targetUser.merchant_id) {
        window.location.href = createPageUrl('SystemMenu');
      } else if (targetUser.role === 'user') {
        window.location.href = createPageUrl('CustomerPortal');
      } else {
        window.location.href = createPageUrl('Home');
      }
    } catch (error) {
      console.error('Error impersonating user:', error);
      alert('Failed to impersonate user. Please try again.');
    } finally {
      setImpersonatingId(null);
    }
  };

  const filtered = users.filter((u) => {
    const term = searchTerm.toLowerCase();
    return (
      (u.email || '').toLowerCase().includes(term) ||
      (u.full_name || '').toLowerCase().includes(term) ||
      (u.role || '').toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="w-5 h-5" />
            User Management ({users.length} users)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by name, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 pr-4 font-medium">User</th>
                  <th className="pb-2 pr-4 font-medium">Email</th>
                  <th className="pb-2 pr-4 font-medium">Role</th>
                  <th className="pb-2 pr-4 font-medium">Merchant</th>
                  <th className="pb-2 pr-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs">
                          {(u.full_name || u.email || '?')[0].toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">{u.full_name || '—'}</span>
                      </div>
                    </td>
                    <td className="py-2 pr-4 text-gray-600">{u.email}</td>
                    <td className="py-2 pr-4">
                      <Badge className={ROLE_COLORS[u.role] || ROLE_COLORS.user}>
                        {u.role || 'user'}
                      </Badge>
                    </td>
                    <td className="py-2 pr-4 text-gray-600 text-xs">
                      {u.merchant_id ? u.merchant_id.slice(-8) : '—'}
                    </td>
                    <td className="py-2 pr-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleImpersonate(u)}
                        disabled={impersonatingId === u.id}
                        className="text-orange-600 border-orange-300 hover:bg-orange-50"
                      >
                        <UserCheck className="w-4 h-4 mr-1" />
                        {impersonatingId === u.id ? 'Loading...' : 'Impersonate'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <UsersIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>No users found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}