import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Calendar,
  Plus,
  Mail,
  Phone,
  Clock,
  Check,
  X,
  StickyNote,
  Phone as PhoneIcon,
  Video,
  TrendingUp,
} from 'lucide-react';

const STATUS_CONFIG = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-700' },
  contacted: { label: 'Contacted', color: 'bg-yellow-100 text-yellow-700' },
  qualified: { label: 'Qualified', color: 'bg-purple-100 text-purple-700' },
  proposal_sent: { label: 'Proposal Sent', color: 'bg-indigo-100 text-indigo-700' },
  converted: { label: 'Converted', color: 'bg-green-100 text-green-700' },
  lost: { label: 'Lost', color: 'bg-red-100 text-red-700' },
};

export default function LeadDetailDialog({
  lead,
  isOpen,
  onClose,
  onAddNote,
  onAddAppointment,
  onUpdateAppointment,
  onLogCall,
  onSendInvite,
  inviteLink,
}) {
  const [note, setNote] = useState('');
  const [showApptForm, setShowApptForm] = useState(false);
  const [apptTitle, setApptTitle] = useState('');
  const [apptDate, setApptDate] = useState('');
  const [apptTime, setApptTime] = useState('');
  const [apptDuration, setApptDuration] = useState(30);
  const [apptNotes, setApptNotes] = useState('');
  const [saving, setSaving] = useState(false);

  if (!lead) return null;

  const statusCfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;
  const activities = [...(lead.activities || [])].reverse();
  const appointments = lead.appointments || [];
  const upcomingAppts = appointments.filter((a) => a.status === 'scheduled');

  const handleSaveNote = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await onAddNote(lead.id, note.trim());
      setNote('');
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAppt = async () => {
    if (!apptDate) return;
    setSaving(true);
    try {
      await onAddAppointment(lead.id, {
        title: apptTitle || 'Meeting',
        date: apptDate,
        time: apptTime || '12:00',
        duration_minutes: parseInt(apptDuration) || 30,
        notes: apptNotes,
      });
      setApptTitle('');
      setApptDate('');
      setApptTime('');
      setApptDuration(30);
      setApptNotes('');
      setShowApptForm(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleApptStatus = async (apptId, status) => {
    await onUpdateAppointment(lead.id, { id: apptId, status });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {lead.business_name}
            <Badge className={statusCfg.color}>{statusCfg.label}</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Contact Info */}
        <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-4">
          {lead.contact_name && (
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> {lead.contact_name}
            </span>
          )}
          {lead.email && (
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3" /> {lead.email}
            </span>
          )}
          {lead.phone && (
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" /> {lead.phone}
            </span>
          )}
          {lead.estimated_value > 0 && (
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> ${lead.estimated_value.toLocaleString()}/mo
            </span>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 mb-4">
          {lead.email && (
            <Button size="sm" variant="outline" onClick={() => onSendInvite(lead)} className="gap-1">
              <Mail className="w-3 h-3" /> Send Invite
            </Button>
          )}
          {lead.phone && (
            <Button size="sm" variant="outline" onClick={() => onLogCall(lead.id)} className="gap-1">
              <PhoneIcon className="w-3 h-3" /> Log Call
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setShowApptForm((s) => !s)} className="gap-1">
            <Calendar className="w-3 h-3" /> Schedule Appointment
          </Button>
        </div>

        {/* Appointment Form */}
        {showApptForm && (
          <div className="bg-blue-50 rounded-lg p-3 space-y-2 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold">New Appointment</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Title</Label>
                <Input
                  value={apptTitle}
                  onChange={(e) => setApptTitle(e.target.value)}
                  placeholder="e.g. Initial Consultation"
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Duration (min)</Label>
                <Input
                  type="number"
                  value={apptDuration}
                  onChange={(e) => setApptDuration(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Date</Label>
                <Input type="date" value={apptDate} onChange={(e) => setApptDate(e.target.value)} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Time</Label>
                <Input type="time" value={apptTime} onChange={(e) => setApptTime(e.target.value)} className="h-9" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Input
                value={apptNotes}
                onChange={(e) => setApptNotes(e.target.value)}
                placeholder="Meeting agenda or notes…"
                className="h-9"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => setShowApptForm(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveAppt} disabled={!apptDate || saving}>
                {saving ? 'Saving…' : 'Schedule'}
              </Button>
            </div>
          </div>
        )}

        {/* Appointments */}
        {appointments.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
              <Calendar className="w-4 h-4" /> Appointments ({upcomingAppts.length} upcoming)
            </h4>
            <div className="space-y-2">
              {appointments
                .slice()
                .reverse()
                .map((appt) => (
                  <div
                    key={appt.id}
                    className="flex items-center justify-between p-2 rounded-lg border bg-white"
                  >
                    <div>
                      <p className="text-sm font-medium">{appt.title || 'Meeting'}</p>
                      <p className="text-xs text-gray-500">
                        {appt.date ? new Date(appt.date).toLocaleDateString() : ''} {appt.time || ''} · {appt.duration_minutes || 30}min
                      </p>
                      {appt.notes && <p className="text-xs text-gray-400 mt-1">{appt.notes}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      {appt.status === 'scheduled' && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-green-600"
                            onClick={() => handleApptStatus(appt.id, 'completed')}
                            title="Mark completed"
                          >
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-500"
                            onClick={() => handleApptStatus(appt.id, 'cancelled')}
                            title="Cancel"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                      <Badge
                        variant="outline"
                        className={
                          appt.status === 'completed'
                            ? 'text-green-600 border-green-300'
                            : appt.status === 'cancelled'
                              ? 'text-red-500 border-red-300'
                              : 'text-blue-600 border-blue-300'
                        }
                      >
                        {appt.status}
                      </Badge>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Quick Note Input */}
        <div className="mb-4">
          <Label className="text-sm font-semibold flex items-center gap-1 mb-2">
            <StickyNote className="w-4 h-4" /> Add Note
          </Label>
          <div className="flex gap-2">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note about this lead…"
              rows={2}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleSaveNote();
                }
              }}
            />
            <Button onClick={handleSaveNote} disabled={!note.trim() || saving} className="self-end">
              {saving ? '…' : 'Add'}
            </Button>
          </div>
        </div>

        {/* Activity Timeline */}
        {activities.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Activity Timeline</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {activities.map((activity, i) => (
                <div key={i} className="flex gap-2 text-sm">
                  <div className="shrink-0 mt-0.5">
                    {activity.type === 'note' && <StickyNote className="w-3 h-3 text-gray-400" />}
                    {activity.type === 'email' && <Mail className="w-3 h-3 text-blue-400" />}
                    {activity.type === 'call' && <PhoneIcon className="w-3 h-3 text-green-400" />}
                    {activity.type === 'appointment' && <Calendar className="w-3 h-3 text-purple-400" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-700">{activity.text}</p>
                    <p className="text-xs text-gray-400">
                      {activity.author} · {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}