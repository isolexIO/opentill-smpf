import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Search, Trash2, Edit2 } from 'lucide-react';

export default function StaffManagement({ dealerId }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingStaff, setEditingStaff] = useState(null);
  const [formData, setFormData] = useState({ full_name: '', email: '', role: 'user' });

  useEffect(() => {
    loadStaff();
  }, [dealerId]);

  const loadStaff = async () => {
    try {
      setLoading(true);
      const users = await base44.entities.User.list();
      const dealerStaff = users.filter(u => u.dealer_id === dealerId && u.role !== 'admin');
      setStaff(dealerStaff || []);
    } catch (error) {
      console.error('Error loading staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async () => {
    if (!formData.full_name || !formData.email) {
      alert('Please fill in required fields');
      return;
    }
    try {
      await base44.users.inviteUser(formData.email, formData.role);
      setFormData({ full_name: '', email: '', role: 'user' });
      setShowCreateDialog(false);
      loadStaff();
    } catch (error) {
      alert('Error adding staff: ' + error.message);
    }
  };

  const handleDeleteStaff = async (staffId) => {
    try {
      await base44.entities.User.delete(staffId);
      loadStaff();
    } catch (error) {
      alert('Error deleting staff: ' + error.message);
    }
  };

  const filteredStaff = staff.filter(s => 
    s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="text-center py-8">Loading staff...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search staff..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" />Add Staff</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingStaff ? 'Edit Staff' : 'Add New Staff'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Full Name *</label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email *</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="staff@example.com"
                  disabled={!!editingStaff}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Role</label>
                <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Staff</SelectItem>
                    <SelectItem value="dealer_admin">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddStaff} className="w-full">
                {editingStaff ? 'Update Staff' : 'Add Staff'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {filteredStaff.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No staff members yet. Add your first team member.
            </CardContent>
          </Card>
        ) : (
          filteredStaff.map(s => (
            <Card key={s.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{s.full_name}</CardTitle>
                    <CardDescription>{s.email}</CardDescription>
                  </div>
                  <Badge>{s.role === 'dealer_admin' ? 'Manager' : 'Staff'}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDeletingId(s.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {deletingId && (
        <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Staff</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove {staff.find(s => s.id === deletingId)?.full_name} from your team?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleDeleteStaff(deletingId)} className="bg-red-600">
                Remove
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}