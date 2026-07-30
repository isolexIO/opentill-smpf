import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import LeadDetailDialog from './LeadDetailDialog';
import {
  Plus, Search, Mail, Phone, Building2, TrendingUp, Target,
  Copy, Check, Calendar, Tag, Trash2, Edit, UserPlus, ChevronRight, Clock
} from 'lucide-react';

const STATUS_CONFIG = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-700', badge: 'secondary' },
  contacted: { label: 'Contacted', color: 'bg-yellow-100 text-yellow-700', badge: 'secondary' },
  qualified: { label: 'Qualified', color: 'bg-purple-100 text-purple-700', badge: 'secondary' },
  proposal_sent: { label: 'Proposal Sent', color: 'bg-indigo-100 text-indigo-700', badge: 'secondary' },
  converted: { label: 'Converted', color: 'bg-green-100 text-green-700', badge: 'default' },
  lost: { label: 'Lost', color: 'bg-red-100 text-red-700', badge: 'destructive' },
};

const SOURCE_LABELS = {
  referral: 'Referral',
  website: 'Website',
  social_media: 'Social Media',
  email_campaign: 'Email Campaign',
  phone_call: 'Phone Call',
  walk_in: 'Walk-in',
  other: 'Other',
};

const BUSINESS_LABELS = {
  restaurant: 'Restaurant',
  retail: 'Retail',
  grocery: 'Grocery',
  cafe: 'Café',
  bar: 'Bar',
  other: 'Other',
};

const EMPTY_LEAD = {
  business_name: '',
  contact_name: '',
  email: '',
  phone: '',
  status: 'new',
  source: 'referral',
  business_type: 'other',
  estimated_value: 0,
  notes: '',
  tags: [],
  next_follow_up: '',
};

export default function LeadManagement({ dealerId }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [formData, setFormData] = useState(EMPTY_LEAD);
  const [tagInput, setTagInput] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [quickNote, setQuickNote] = useState({});
  const [savingNoteId, setSavingNoteId] = useState(null);
  const token = typeof window !== 'undefined' ? localStorage.getItem('dealerToken') : null;

  useEffect(() => { loadLeads(); }, [dealerId]);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const res = await base44.functions.invoke('manageLead', {
        action: 'list',
        token,
        dealer_id: dealerId,
      });
      if (res.data?.success) {
        setLeads(res.data.leads || []);
      } else {
        setLeads([]);
      }
    } catch (error) {
      console.error('Error loading leads:', error);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.business_name) {
      alert('Please enter a business name');
      return;
    }
    try {
      const payload = {
        ...formData,
        estimated_value: parseFloat(formData.estimated_value) || 0,
      };

      if (editingLead) {
        await base44.functions.invoke('manageLead', {
          action: 'update',
          token,
          dealer_id: dealerId,
          lead_id: editingLead.id,
          lead_data: payload,
        });
      } else {
        await base44.functions.invoke('manageLead', {
          action: 'create',
          token,
          dealer_id: dealerId,
          lead_data: payload,
        });
      }
      setShowForm(false);
      setEditingLead(null);
      setFormData(EMPTY_LEAD);
      await loadLeads();
    } catch (error) {
      alert('Failed to save lead: ' + error.message);
    }
  };

  const handleEdit = (lead) => {
    setEditingLead(lead);
    setFormData({
      business_name: lead.business_name || '',
      contact_name: lead.contact_name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      status: lead.status || 'new',
      source: lead.source || 'referral',
      business_type: lead.business_type || 'other',
      estimated_value: lead.estimated_value || 0,
      notes: lead.notes || '',
      tags: lead.tags || [],
      next_follow_up: lead.next_follow_up ? lead.next_follow_up.slice(0, 10) : '',
    });
    setShowForm(true);
  };

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      const updates = { status: newStatus, last_contacted_at: new Date().toISOString() };
      if (newStatus === 'converted') updates.converted_at = new Date().toISOString();
      await base44.functions.invoke('manageLead', {
        action: 'update',
        token,
        dealer_id: dealerId,
        lead_id: leadId,
        lead_data: updates,
      });
      await loadLeads();
    } catch (error) {
      alert('Failed to update status: ' + error.message);
    }
  };

  const handleDelete = async (leadId) => {
    if (!confirm('Delete this lead? This cannot be undone.')) return;
    try {
      await base44.functions.invoke('manageLead', {
        action: 'delete',
        token,
        dealer_id: dealerId,
        lead_id: leadId,
      });
      await loadLeads();
    } catch (error) {
      alert('Failed to delete lead: ' + error.message);
    }
  };

  const handleAddNote = async (leadId, noteText) => {
    const res = await base44.functions.invoke('manageLead', {
      action: 'add_note',
      token,
      dealer_id: dealerId,
      lead_id: leadId,
      note: noteText,
    });
    if (res.data?.success) {
      await loadLeads();
      const updated = res.data.lead;
      if (selectedLead?.id === leadId) setSelectedLead(updated);
    }
  };

  const handleQuickNote = async (leadId) => {
    const note = quickNote[leadId]?.trim();
    if (!note) return;
    setSavingNoteId(leadId);
    try {
      await handleAddNote(leadId, note);
      setQuickNote({ ...quickNote, [leadId]: '' });
    } catch (error) {
      alert('Failed to add note: ' + error.message);
    } finally {
      setSavingNoteId(null);
    }
  };

  const handleAddAppointment = async (leadId, appointment) => {
    const res = await base44.functions.invoke('manageLead', {
      action: 'add_appointment',
      token,
      dealer_id: dealerId,
      lead_id: leadId,
      appointment,
    });
    if (res.data?.success) {
      await loadLeads();
      const updated = res.data.lead;
      if (selectedLead?.id === leadId) setSelectedLead(updated);
    }
  };

  const handleUpdateAppointment = async (leadId, appointment) => {
    const res = await base44.functions.invoke('manageLead', {
      action: 'update_appointment',
      token,
      dealer_id: dealerId,
      lead_id: leadId,
      appointment,
    });
    if (res.data?.success) {
      await loadLeads();
      const updated = res.data.lead;
      if (selectedLead?.id === leadId) setSelectedLead(updated);
    }
  };

  const handleLogCall = async (leadId) => {
    const res = await base44.functions.invoke('manageLead', {
      action: 'log_call',
      token,
      dealer_id: dealerId,
      lead_id: leadId,
      note: 'Call logged',
    });
    if (res.data?.success) {
      await loadLeads();
      const updated = res.data.lead;
      if (selectedLead?.id === leadId) setSelectedLead(updated);
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData((f) => ({ ...f, tags: [...f.tags, tag] }));
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag) => {
    setFormData((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));
  };

  const getInviteLink = () => {
    return `${window.location.origin}${createPageUrl('Home')}?dealer_id=${dealerId}`;
  };

  const handleCopyInvite = (leadId) => {
    navigator.clipboard.writeText(getInviteLink());
    setCopiedId(leadId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendInvite = async (lead) => {
    if (!lead.email) {
      alert('This lead has no email address. Add one first or copy the invite link.');
      return;
    }
    try {
      await base44.functions.invoke('manageLead', {
        action: 'send_invite',
        token,
        dealer_id: dealerId,
        lead_id: lead.id,
        invite_link: getInviteLink(),
      });
      await loadLeads();
      alert('Invitation sent successfully!');
    } catch (error) {
      alert('Failed to send invitation: ' + error.message);
    }
  };

  const handleOpenDetail = (lead) => {
    setSelectedLead(lead);
    setShowDetail(true);
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      !searchTerm ||
      lead.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: leads.length,
    new: leads.filter((l) => l.status === 'new').length,
    qualified: leads.filter((l) => l.status === 'qualified' || l.status === 'proposal_sent').length,
    converted: leads.filter((l) => l.status === 'converted').length,
    pipelineValue: leads.reduce((sum, l) => sum + (l.estimated_value || 0), 0),
  };

  if (loading) return <div className="text-center py-8">Loading leads...</div>;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><Target className="w-4 h-4 text-blue-500" /><span className="text-xs text-gray-500">Total Leads</span></div>
          <p className="text-2xl font-bold">{stats.total}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><span className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-xs text-gray-500">New</span></div>
          <p className="text-2xl font-bold">{stats.new}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><span className="w-2 h-2 rounded-full bg-purple-500" /><span className="text-xs text-gray-500">Qualified</span></div>
          <p className="text-2xl font-bold">{stats.qualified}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-green-500" /><span className="text-xs text-gray-500">Converted</span></div>
          <p className="text-2xl font-bold">{stats.converted}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-orange-500" /><span className="text-xs text-gray-500">Pipeline Value</span></div>
          <p className="text-2xl font-bold">${stats.pipelineValue.toLocaleString()}</p>
        </CardContent></Card>
      </div>

      {/* Invite Link Banner */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Your Invite Link</p>
            <p className="text-xs text-gray-500">Share this link with prospects — it lands on your branded home page</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Input readOnly value={getInviteLink()} className="text-xs bg-white flex-1" />
            <Button variant="outline" size="sm" onClick={() => handleCopyInvite('banner')} className="gap-2 shrink-0">
              {copiedId === 'banner' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex gap-2 flex-1">
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search leads..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) { setEditingLead(null); setFormData(EMPTY_LEAD); } }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Add Lead</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingLead ? 'Edit Lead' : 'Add New Lead'}</DialogTitle>
              <DialogDescription>Track a prospect through your sales pipeline</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Business Name *</Label>
                <Input value={formData.business_name} onChange={(e) => setFormData(f => ({ ...f, business_name: e.target.value }))} placeholder="Acme Restaurant" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Contact Name</Label>
                  <Input value={formData.contact_name} onChange={(e) => setFormData(f => ({ ...f, contact_name: e.target.value }))} placeholder="John Doe" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={formData.phone} onChange={(e) => setFormData(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 123-4567" />
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData(f => ({ ...f, email: e.target.value }))} placeholder="contact@acme.com" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Source</Label>
                  <Select value={formData.source} onValueChange={(v) => setFormData(f => ({ ...f, source: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(SOURCE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Business Type</Label>
                  <Select value={formData.business_type} onValueChange={(v) => setFormData(f => ({ ...f, business_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(BUSINESS_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Est. Monthly Value ($)</Label>
                  <Input type="number" value={formData.estimated_value} onChange={(e) => setFormData(f => ({ ...f, estimated_value: e.target.value }))} placeholder="5000" />
                </div>
              </div>
              <div>
                <Label>Next Follow-up</Label>
                <Input type="date" value={formData.next_follow_up} onChange={(e) => setFormData(f => ({ ...f, next_follow_up: e.target.value }))} />
              </div>
              <div>
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }} placeholder="Add tag..." />
                  <Button type="button" variant="outline" size="sm" onClick={handleAddTag}>Add</Button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveTag(tag)}>{tag} ×</Badge>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Any details about this prospect..." />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setShowForm(false); setEditingLead(null); setFormData(EMPTY_LEAD); }}>Cancel</Button>
                <Button onClick={handleSave}>{editingLead ? 'Update Lead' : 'Create Lead'}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Leads List */}
      <div className="grid gap-3">
        {filteredLeads.length === 0 ? (
          <Card><CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-1">No leads yet</p>
            <p className="text-sm text-gray-400">Add your first prospect to start tracking your sales pipeline</p>
          </CardContent></Card>
        ) : (
          filteredLeads.map(lead => {
            const statusCfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;
            const upcomingAppts = (lead.appointments || []).filter(a => a.status === 'scheduled');
            const recentActivities = (lead.activities || []).slice(-2).reverse();
            return (
              <Card key={lead.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">{lead.business_name}</h3>
                        <Badge className={statusCfg.color}>{statusCfg.label}</Badge>
                        <Badge variant="outline" className="text-xs">{BUSINESS_LABELS[lead.business_type] || lead.business_type}</Badge>
                        {upcomingAppts.length > 0 && (
                          <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">
                            <Calendar className="w-2 h-2 mr-1" />{upcomingAppts.length} appt
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                        {lead.contact_name && <span className="flex items-center gap-1"><UserPlus className="w-3 h-3" />{lead.contact_name}</span>}
                        {lead.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{lead.email}</span>}
                        {lead.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.phone}</span>}
                        {lead.estimated_value > 0 && <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />${lead.estimated_value.toLocaleString()}/mo</span>}
                      </div>
                      {lead.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {lead.tags.map(tag => <Badge key={tag} variant="outline" className="text-xs"><Tag className="w-2 h-2 mr-1" />{tag}</Badge>)}
                        </div>
                      )}
                      {lead.notes && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{lead.notes}</p>}
                      {recentActivities.length > 0 && (
                        <div className="mt-2 space-y-0.5">
                          {recentActivities.map((a, i) => (
                            <p key={i} className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock className="w-2 h-2" />{a.text}
                            </p>
                          ))}
                        </div>
                      )}
                      {lead.next_follow_up && (
                        <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />Follow-up: {new Date(lead.next_follow_up).toLocaleDateString()}
                        </p>
                      )}
                      {/* Quick note input */}
                      <div className="flex gap-2 mt-2">
                        <Input
                          value={quickNote[lead.id] || ''}
                          onChange={(e) => setQuickNote({ ...quickNote, [lead.id]: e.target.value })}
                          onKeyDown={(e) => { if (e.key === 'Enter' && quickNote[lead.id]?.trim()) { e.preventDefault(); handleQuickNote(lead.id); } }}
                          placeholder="Quick note…"
                          className="h-8 text-xs"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 shrink-0"
                          disabled={!quickNote[lead.id]?.trim() || savingNoteId === lead.id}
                          onClick={() => handleQuickNote(lead.id)}
                        >
                          {savingNoteId === lead.id ? '…' : 'Save'}
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:flex-col lg:items-end">
                      <Select value={lead.status} onValueChange={(v) => handleStatusChange(lead.id, v)}>
                        <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                            <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => handleOpenDetail(lead)} title="Details, notes & appointments" className="gap-1">
                          <Calendar className="w-4 h-4" />Details
                        </Button>
                        {lead.email && (
                          <Button size="sm" variant="ghost" onClick={() => handleSendInvite(lead)} title="Send invite email" className="gap-1">
                            <Mail className="w-4 h-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => handleCopyInvite(lead.id)} title="Copy invite link">
                          {copiedId === lead.id ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(lead)} title="Edit">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(lead.id)} title="Delete" className="text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Detail Dialog */}
      <LeadDetailDialog
        lead={selectedLead}
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        onAddNote={handleAddNote}
        onAddAppointment={handleAddAppointment}
        onUpdateAppointment={handleUpdateAppointment}
        onLogCall={handleLogCall}
        onSendInvite={handleSendInvite}
        inviteLink={getInviteLink()}
      />
    </div>
  );
}