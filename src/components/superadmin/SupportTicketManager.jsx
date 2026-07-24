import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  MessageSquare, Search, RefreshCw, Inbox, CheckCircle2, Clock,
  AlertTriangle, User, Mail, Building2, Send, CheckCheck,
} from 'lucide-react';

const STATUS_OPTIONS = ['open', 'in_progress', 'waiting_on_merchant', 'resolved', 'closed'];
const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'];
const CATEGORY_OPTIONS = [
  'billing', 'devices', 'technical', 'account',
  'marketplace', 'feature_request', 'bug_report', 'other',
];

const statusStyle = {
  open: 'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-amber-100 text-amber-700 border-amber-200',
  waiting_on_merchant: 'bg-purple-100 text-purple-700 border-purple-200',
  resolved: 'bg-green-100 text-green-700 border-green-200',
  closed: 'bg-gray-200 text-gray-600 border-gray-300',
};

const priorityStyle = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

export default function SupportTicketManager() {
  const { toast } = useToast();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const list = await base44.entities.SupportTicket.list('-created_date', 200);
      setTickets(list || []);
    } catch (err) {
      console.error('Error loading tickets:', err);
      toast({
        title: 'Error',
        description: 'Failed to load support tickets.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const filtered = tickets.filter((t) => {
    const q = search.toLowerCase().trim();
    const matchesSearch = !q
      || (t.subject || '').toLowerCase().includes(q)
      || (t.ticket_number || '').toLowerCase().includes(q)
      || (t.merchant_name || '').toLowerCase().includes(q)
      || (t.submitted_by_email || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === 'open').length,
    inProgress: tickets.filter((t) => t.status === 'in_progress').length,
    urgent: tickets.filter((t) => t.priority === 'urgent' && t.status !== 'closed' && t.status !== 'resolved').length,
    resolved: tickets.filter((t) => t.status === 'resolved').length,
  };

  const openTicket = (ticket) => {
    setSelectedTicket(ticket);
    setResponseText('');
    setResolutionNotes(ticket.resolution_notes || '');
    setDetailOpen(true);
  };

  const updateField = async (field, value) => {
    if (!selectedTicket) return;
    setUpdating(true);
    try {
      const updates = { [field]: value };
      if (field === 'status' && value === 'resolved') {
        updates.resolved_at = new Date().toISOString();
        updates.resolved_by = 'Super Admin';
      }
      const updated = await base44.entities.SupportTicket.update(selectedTicket.id, updates);
      const refreshed = { ...selectedTicket, ...updated };
      setSelectedTicket(refreshed);
      setTickets((prev) => prev.map((t) => (t.id === refreshed.id ? refreshed : t)));
      toast({ title: 'Updated', description: `${field} set to ${value}.` });
    } catch (err) {
      console.error('Update error:', err);
      toast({ title: 'Error', description: 'Failed to update ticket.', variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  const sendResponse = async () => {
    if (!selectedTicket || !responseText.trim()) return;
    setUpdating(true);
    try {
      const me = await base44.auth.me().catch(() => null);
      const newResponse = {
        user_id: me?.id || 'super_admin',
        user_name: me?.full_name || 'Super Admin',
        user_role: 'admin',
        message: responseText.trim(),
        timestamp: new Date().toISOString(),
      };
      const existing = selectedTicket.responses || [];
      const updated = await base44.entities.SupportTicket.update(selectedTicket.id, {
        responses: [...existing, newResponse],
        last_response_at: newResponse.timestamp,
        last_response_by: newResponse.user_name,
        status: selectedTicket.status === 'open' ? 'in_progress' : selectedTicket.status,
      });
      const refreshed = { ...selectedTicket, ...updated };
      setSelectedTicket(refreshed);
      setTickets((prev) => prev.map((t) => (t.id === refreshed.id ? refreshed : t)));
      setResponseText('');
      toast({ title: 'Reply sent', description: 'Your response was added to the ticket.' });
    } catch (err) {
      console.error('Response error:', err);
      toast({ title: 'Error', description: 'Failed to send response.', variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  const resolveTicket = async () => {
    if (!selectedTicket) return;
    setUpdating(true);
    try {
      const now = new Date().toISOString();
      const updated = await base44.entities.SupportTicket.update(selectedTicket.id, {
        status: 'resolved',
        resolved_at: now,
        resolved_by: 'Super Admin',
        resolution_notes: resolutionNotes.trim() || 'Resolved by Super Admin.',
      });
      const refreshed = { ...selectedTicket, ...updated };
      setSelectedTicket(refreshed);
      setTickets((prev) => prev.map((t) => (t.id === refreshed.id ? refreshed : t)));
      toast({ title: 'Resolved', description: 'Ticket marked as resolved.' });
    } catch (err) {
      console.error('Resolve error:', err);
      toast({ title: 'Error', description: 'Failed to resolve ticket.', variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={Inbox} label="Total" value={stats.total} color="text-gray-700" />
        <StatCard icon={Clock} label="Open" value={stats.open} color="text-blue-600" />
        <StatCard icon={RefreshCw} label="In Progress" value={stats.inProgress} color="text-amber-600" />
        <StatCard icon={AlertTriangle} label="Urgent" value={stats.urgent} color="text-red-600" />
        <StatCard icon={CheckCircle2} label="Resolved" value={stats.resolved} color="text-green-600" />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search subject, ticket #, merchant, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full md:w-44"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {PRIORITY_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadTickets} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ticket List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Inbox className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            No support tickets found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((ticket) => (
            <Card key={ticket.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openTicket(ticket)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-mono text-gray-500">{ticket.ticket_number || '—'}</span>
                      <Badge variant="outline" className={statusStyle[ticket.status] || ''}>
                        {(ticket.status || 'open').replace(/_/g, ' ')}
                      </Badge>
                      <Badge variant="outline" className={priorityStyle[ticket.priority] || ''}>
                        {ticket.priority || 'medium'}
                      </Badge>
                      <Badge variant="secondary">{ticket.category || 'other'}</Badge>
                    </div>
                    <h3 className="font-semibold text-gray-900 truncate">{ticket.subject || 'Untitled'}</h3>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 flex-wrap">
                      {ticket.merchant_name && (
                        <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{ticket.merchant_name}</span>
                      )}
                      {ticket.submitted_by_email && (
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{ticket.submitted_by_email}</span>
                      )}
                      {ticket.last_response_at && (
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(ticket.last_response_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  {ticket.responses?.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
                      <MessageSquare className="w-3.5 h-3.5" />
                      {ticket.responses.length}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xs font-mono text-gray-500">{selectedTicket?.ticket_number}</span>
              {selectedTicket?.subject}
            </DialogTitle>
            <DialogDescription>
              Submitted {selectedTicket?.created_date ? new Date(selectedTicket.created_date).toLocaleString() : ''}
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-4">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <MetaRow icon={User} label="Submitter" value={selectedTicket.submitted_by_email || selectedTicket.submitted_by || '—'} />
                <MetaRow icon={Building2} label="Merchant" value={selectedTicket.merchant_name || '—'} />
                <MetaRow icon={Mail} label="Category" value={selectedTicket.category || '—'} />
                <MetaRow icon={Clock} label="Priority" value={selectedTicket.priority || '—'} />
              </div>

              {/* Status & Assignment controls */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Label className="text-xs text-gray-500">Status</Label>
                  <Select value={selectedTicket.status} onValueChange={(v) => updateField('status', v)} disabled={updating}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-gray-500">Priority</Label>
                  <Select value={selectedTicket.priority} onValueChange={(v) => updateField('priority', v)} disabled={updating}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div>
                <Label className="text-xs text-gray-500">Description</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md text-sm whitespace-pre-wrap border">
                  {selectedTicket.description || 'No description provided.'}
                </div>
              </div>

              {/* Conversation */}
              {selectedTicket.responses?.length > 0 && (
                <div>
                  <Label className="text-xs text-gray-500">Conversation ({selectedTicket.responses.length})</Label>
                  <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                    {selectedTicket.responses.map((r, i) => (
                      <div key={i} className={`p-2.5 rounded-md text-sm ${r.user_role === 'admin' ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50 border'}`}>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span className="font-medium">{r.user_name || 'User'}</span>
                          <span>{r.timestamp ? new Date(r.timestamp).toLocaleString() : ''}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{r.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Response input */}
              <div>
                <Label className="text-xs text-gray-500">Add Response</Label>
                <Textarea
                  placeholder="Type your reply to the merchant..."
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  rows={3}
                  disabled={updating}
                />
                <Button onClick={sendResponse} disabled={updating || !responseText.trim()} className="mt-2 w-full sm:w-auto">
                  <Send className="w-4 h-4 mr-2" />
                  Send Reply
                </Button>
              </div>

              {/* Resolution */}
              <div className="border-t pt-3">
                <Label className="text-xs text-gray-500">Resolution Notes</Label>
                <Textarea
                  placeholder="Summary of how this ticket was resolved..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={2}
                  disabled={updating}
                />
                <Button onClick={resolveTicket} disabled={updating || selectedTicket.status === 'resolved'} variant="default" className="mt-2 w-full sm:w-auto bg-green-600 hover:bg-green-700">
                  <CheckCheck className="w-4 h-4 mr-2" />
                  Mark Resolved
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <Icon className={`w-8 h-8 ${color}`} />
        <div>
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          <div className="text-xs text-gray-500">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetaRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-gray-400 shrink-0" />
      <div className="min-w-0">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="font-medium truncate">{value}</div>
      </div>
    </div>
  );
}