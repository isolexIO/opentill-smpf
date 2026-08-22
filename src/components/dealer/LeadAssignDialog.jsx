import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCircle, Percent } from 'lucide-react';

export default function LeadAssignDialog({ open, onOpenChange, dealerId, token, lead, onAssigned }) {
  const [staff, setStaff] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [commissionRate, setCommissionRate] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) loadStaff();
  }, [open, dealerId]);

  useEffect(() => {
    if (lead) {
      setSelectedStaffId(lead.assigned_to || '');
      setCommissionRate(lead.commission_rate || 0);
    } else {
      setSelectedStaffId('');
      setCommissionRate(0);
    }
  }, [lead]);

  const loadStaff = async () => {
    try {
      const res = await base44.functions.invoke('manageLead', { action: 'list_staff', token, dealer_id: dealerId });
      if (res.data?.success) setStaff(res.data.staff || []);
    } catch (e) {
      console.error('Error loading staff:', e);
    }
  };

  const handleStaffChange = (staffId) => {
    setSelectedStaffId(staffId);
    const s = staff.find((u) => u.id === staffId);
    if (s && (!lead?.commission_rate || lead.commission_rate === 0)) {
      setCommissionRate(s.default_commission_rate || 0);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const selectedStaff = staff.find((s) => s.id === selectedStaffId);
      const res = await base44.functions.invoke('manageLead', {
        action: 'assign_staff',
        token,
        dealer_id: dealerId,
        lead_id: lead.id,
        staff_id: selectedStaffId,
        staff_name: selectedStaff?.full_name || '',
        commission_rate: parseFloat(commissionRate) || 0,
      });
      if (res.data?.success) {
        onAssigned?.(res.data.lead);
        onOpenChange(false);
      }
    } catch (e) {
      alert('Failed to assign: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUnassign = async () => {
    setSaving(true);
    try {
      const res = await base44.functions.invoke('manageLead', {
        action: 'assign_staff',
        token,
        dealer_id: dealerId,
        lead_id: lead.id,
        staff_id: '',
        staff_name: '',
        commission_rate: 0,
      });
      if (res.data?.success) {
        onAssigned?.(res.data.lead);
        onOpenChange(false);
      }
    } catch (e) {
      alert('Failed to unassign: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserCircle className="w-5 h-5" /> Assign Lead to Staff</DialogTitle>
          <DialogDescription>
            Assign <strong>{lead?.business_name}</strong> to a staff member and set their commission rate. The commission is earned when the lead converts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs mb-1.5 block">Staff Member</Label>
            <Select value={selectedStaffId} onValueChange={handleStaffChange}>
              <SelectTrigger><SelectValue placeholder="Select a staff member..." /></SelectTrigger>
              <SelectContent>
                {staff.length === 0 ? (
                  <SelectItem value={null} disabled>No staff members yet</SelectItem>
                ) : staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name} {s.default_commission_rate ? `(default ${s.default_commission_rate}%)` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs mb-1.5 block flex items-center gap-1"><Percent className="w-3 h-3" /> Commission Rate (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={commissionRate}
              onChange={(e) => setCommissionRate(e.target.value)}
              placeholder="e.g. 10"
              disabled={!selectedStaffId}
            />
            <p className="text-xs text-gray-500 mt-1">
              When this lead converts, the staff earns {commissionRate || 0}% of the estimated deal value
              {lead?.estimated_value > 0 && (
                <span className="font-medium text-gray-700"> = ${((lead.estimated_value * (parseFloat(commissionRate) || 0)) / 100).toFixed(2)}</span>
              )}
            </p>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            {lead?.assigned_to && (
              <Button variant="ghost" onClick={handleUnassign} disabled={saving} className="text-red-600">
                Unassign
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !selectedStaffId}>
              {saving ? 'Saving…' : 'Assign'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}