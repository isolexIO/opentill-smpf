import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AlertCircle, Shield } from 'lucide-react';

export default function StatusManagementSection({ merchant, isAdmin, onUpdate }) {
  const [newStatus, setNewStatus] = useState(merchant.status);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const statusOptions = [
    { value: 'inactive', label: 'Inactive', color: 'secondary' },
    { value: 'active', label: 'Active', color: 'default' },
    { value: 'trial', label: 'Trial', color: 'outline' },
    { value: 'suspended', label: 'Suspended', color: 'destructive' },
    { value: 'cancelled', label: 'Cancelled', color: 'destructive' }
  ];

  const handleStatusChange = async () => {
    if (newStatus === merchant.status) {
      alert('Please select a different status');
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmChange = async () => {
    try {
      setLoading(true);
      const updateData = { status: newStatus };

      // Set activation date if changing to active
      if (newStatus === 'active' && merchant.status !== 'active') {
        updateData.activated_at = new Date().toISOString();
      }

      // Set suspension date if suspending
      if (newStatus === 'suspended') {
        updateData.suspended_at = new Date().toISOString();
      }

      // Clear suspension if reactivating
      if (newStatus === 'active' && merchant.status === 'suspended') {
        updateData.suspended_at = null;
        updateData.suspension_reason = null;
      }

      await base44.entities.Merchant.update(merchant.id, updateData);

      // Send notification email
      const statusMessages = {
        active: 'Your merchant account has been activated and is now ready to process transactions.',
        suspended: 'Your merchant account has been suspended. Please contact support for more information.',
        cancelled: 'Your merchant account has been cancelled.',
        trial: 'Your account has been converted to trial status.',
        inactive: 'Your merchant account status has been changed to inactive.'
      };

      await base44.functions.invoke('sendEmail', {
        to: merchant.owner_email,
        subject: `Account Status Updated - ${merchant.business_name}`,
        body: `Hello,

${statusMessages[newStatus]}

New Status: ${newStatus.toUpperCase()}
Updated: ${new Date().toLocaleDateString()}

If you have any questions, please contact our support team.

Best regards,
ChainLINK Support`
      });

      setShowConfirm(false);
      onUpdate?.();
    } catch (error) {
      alert('Error updating status: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  const currentStatusOption = statusOptions.find(o => o.value === merchant.status);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Status Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Current Status</label>
          <p className="text-lg font-semibold mt-1">
            <Badge variant={currentStatusOption?.color || 'secondary'}>
              {merchant.status}
            </Badge>
          </p>
        </div>

        <div>
          <label className="text-sm font-medium">Change Status To</label>
          <Select value={newStatus} onValueChange={setNewStatus}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-600 mt-2">
            Changing a merchant's status will send them a notification email.
          </p>
        </div>

        <Button
          onClick={handleStatusChange}
          disabled={loading || newStatus === merchant.status}
          variant="outline"
          className="w-full"
        >
          {loading ? 'Updating...' : 'Update Status'}
        </Button>
      </CardContent>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex gap-2 items-center">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              Confirm Status Change
            </AlertDialogTitle>
            <AlertDialogDescription>
              You're about to change {merchant.business_name}'s status from <strong>{merchant.status}</strong> to <strong>{newStatus}</strong>.
              <br /><br />
              This action will:
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Send a notification email to the merchant</li>
                <li>Update their account access immediately</li>
                {newStatus === 'suspended' && <li>Prevent them from processing transactions</li>}
                {newStatus === 'active' && <li>Allow them to resume transactions</li>}
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmChange} disabled={loading}>
              {loading ? 'Updating...' : 'Confirm Change'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}