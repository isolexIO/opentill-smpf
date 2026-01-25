import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { Mail, Phone, MapPin, CreditCard, Package } from 'lucide-react';

export default function MerchantDetailsModal({ merchant, open, onOpenChange, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState(merchant || {});

  if (!merchant) return null;

  const handleSave = async () => {
    try {
      setSaving(true);
      await base44.entities.Merchant.update(merchant.id, editData);
      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      alert('Error updating merchant: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {merchant.business_name}
            <Badge variant={merchant.status === 'active' ? 'default' : 'destructive'}>
              {merchant.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Business Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Business Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isEditing ? (
                <>
                  <div>
                    <label className="text-sm font-medium">Business Name</label>
                    <Input
                      value={editData.business_name}
                      onChange={(e) => setEditData({...editData, business_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Owner Name</label>
                    <Input
                      value={editData.owner_name || ''}
                      onChange={(e) => setEditData({...editData, owner_name: e.target.value})}
                    />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm"><strong>Business Name:</strong> {merchant.business_name}</p>
                  <p className="text-sm"><strong>Owner:</strong> {merchant.owner_name || 'Not set'}</p>
                </>
              )}
              <p className="text-sm"><strong>Plan:</strong> <Badge>{merchant.subscription_plan}</Badge></p>
              <p className="text-sm"><strong>Tax ID:</strong> {merchant.tax_id || 'Not set'}</p>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isEditing ? (
                <>
                  <div>
                    <label className="text-sm font-medium">Owner Email</label>
                    <Input
                      type="email"
                      value={editData.owner_email}
                      onChange={(e) => setEditData({...editData, owner_email: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <Input
                      value={editData.phone || ''}
                      onChange={(e) => setEditData({...editData, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Address</label>
                    <Input
                      value={editData.address || ''}
                      onChange={(e) => setEditData({...editData, address: e.target.value})}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex gap-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-gray-600">Email</p>
                      <p>{merchant.owner_email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-gray-600">Phone</p>
                      <p>{merchant.phone || 'Not set'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-gray-600">Address</p>
                      <p>{merchant.address || 'Not set'}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Performance Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Performance</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-xl font-bold">${(merchant.total_revenue || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-xl font-bold">{merchant.total_orders || 0}</p>
              </div>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><strong>Status:</strong> {merchant.status}</p>
              {merchant.activated_at && <p><strong>Activated:</strong> {new Date(merchant.activated_at).toLocaleDateString()}</p>}
              {merchant.trial_ends_at && <p><strong>Trial Ends:</strong> {new Date(merchant.trial_ends_at).toLocaleDateString()}</p>}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>Edit</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}