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
import LeadImportDialog from './LeadImportDialog';
import LeadBulkActionBar from './LeadBulkActionBar';
import LeadListsPanel from './LeadListsPanel';
import LeadAssignDialog from './LeadAssignDialog';
import StaffEarningsPanel from './StaffEarningsPanel';
import {
  Plus, Search, Mail, Phone, Building2, TrendingUp, Target,
  Copy, Check, Calendar, Tag, Trash2, Edit, UserPlus, ChevronRight, Clock,
  Upload, Square, CheckSquare, UserCircle, DollarSign, UserCog
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
  const [lists, setLists] = useState([]);
  const [selectedListId, setSelectedListId] = useState(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState(new Set());
  const [showImport, setShowImport] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [staff, setStaff] = useState([]);
  const [staffFilter, setStaffFilter] = useState('all');
  const [assigningLead, setAssigningLead] = useState(null);
  const [activeTab, setActiveTab] = useState('leads');
  const token = typeof window !== 'undefined' ? localStorage.getItem('dealerToken') : null;

  useEffect(() => { loadLeads(); loadLists(); loadStaff(); }, [dealerId]);

  const loadLists = async () => {
    try {
      const res = await base44.functions.invoke('manageLead', { action: 'list_list', token, dealer_id: dealerId });
      if (res.data?.success) setLists(res.data.lists || []);
    } catch (e) {
      console.error('Error loading lists:', e);
    }
  };

  const loadStaff = async () => {
    try {
      const res = await base44.functions.invoke('manageLead', { action: 'list_staff', token, dealer_id: dealerId });
      if (res.data?.success) setStaff(res.data.staff || []);
    } catch (e) {
      console.error('Error loading staff:', e);
    }
  };

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

  // --- Bulk actions ---
  const toggleSelect = (leadId) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedLeadIds((prev) => {
      if (prev.size === filteredLeads.length && filteredLeads.length > 0) return new Set();
      return new Set(filteredLeads.map((l) => l.id));
    });
  };

  const clearSelection = () => setSelectedLeadIds(new Set());

  const handleBulkStatus = async (newStatus) => {
    const ids = Array.from(selectedLeadIds);
    setBulkBusy(true);
    try {
      await base44.functions.invoke('manageLead', { action: 'bulk_update', token, dealer_id: dealerId, lead_ids: ids, updates: { status: newStatus } });
      clearSelection();
      await loadLeads();
    } catch (e) { alert('Bulk update failed: ' + e.message); }
    finally { setBulkBusy(false); }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedLeadIds);
    if (!confirm(`Delete ${ids.length} leads? This cannot be undone.`)) return;
    setBulkBusy(true);
    try {
      await base44.functions.invoke('manageLead', { action: 'bulk_delete', token, dealer_id: dealerId, lead_ids: ids });
      clearSelection();
      await loadLeads();
    } catch (e) { alert('Bulk delete failed: ' + e.message); }
    finally { setBulkBusy(false); }
  };

  const handleBulkSetList = async (listId, addToList) => {
    const ids = Array.from(selectedLeadIds);
    setBulkBusy(true);
    try {
      await base44.functions.invoke('manageLead', { action: 'bulk_set_list', token, dealer_id: dealerId, lead_ids: ids, list_id: listId, add_to_list: addToList });
      clearSelection();
      await loadLeads();
    } catch (e) { alert('Bulk list update failed: ' + e.message); }
    finally { setBulkBusy(false); }
  };

  const handleBulkSendInvite = async () => {
    const ids = Array.from(selectedLeadIds);
    setBulkBusy(true);
    try {
      const res = await base44.functions.invoke('manageLead', { action: 'bulk_send_invite', token, dealer_id: dealerId, lead_ids: ids, invite_link: getInviteLink() });
      const sent = res.data?.sent || 0;
      alert(`Sent ${sent} invitation${sent !== 1 ? 's' : ''}.`);
      clearSelection();
      await loadLeads();
    } catch (e) { alert('Bulk invite failed: ' + e.message); }
    finally { setBulkBusy(false); }
  };

  // --- List CRUD ---
  const handleCreateList = async (listData) => {
    try {
      await base44.functions.invoke('manageLead', { action: 'list_create', token, dealer_id: dealerId, list_data: listData });
      await loadLists();
    } catch (e) { alert('Failed to create list: ' + e.message); }
  };

  const handleUpdateList = async (listId, listData) => {
    try {
      await base44.functions.invoke('manageLead', { action: 'list_update', token, dealer_id: dealerId, list_id: listId, list_data: listData });
      await loadLists();
    } catch (e) { alert('Failed to update list: ' + e.message); }
  };

  const handleDeleteList = async (listId) => {
    try {
      await base44.functions.invoke('manageLead', { action: 'list_delete', token, dealer_id: dealerId, list_id: listId });
      if (selectedListId === listId) setSelectedListId(null);
      await loadLists();
      await loadLeads();
    } catch (e) { alert('Failed to delete list: ' + e.message); }
  };

  // --- Import ---
  const handleImport = async (leads, importSource) => {
    await base44.functions.invoke('manageLead', { action: 'import_leads', token, dealer_id: dealerId, leads, import_source: importSource });
    await loadLeads();
    await loadLists();
  };

  // --- Assignment ---
  const handleAssigned = (updatedLead) => {
    setLeads((prev) => prev.map((l) => (l.id === updatedLead.id ? updatedLead : l)));
  };

  const handleBulkAssign = async (staffId, staffName, commissionRate) => {
    const ids = Array.from(selectedLeadIds);
    setBulkBusy(true);
    try {
      await base44.functions.invoke('manageLead', {
        action: 'bulk_assign_staff', token, dealer_id: dealerId, lead_ids: ids,
        staff_id: staffId, staff_name: staffName, commission_rate: commissionRate,
      });
      clearSelection();
      await loadLeads();
    } catch (e) { alert('Bulk assign failed: ' + e.message); }
    finally { setBulkBusy(false); }
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      !searchTerm ||
      lead.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesList = !selectedListId || (lead.list_ids || []).includes(selectedListId);
    const matchesStaff = staffFilter === 'all'
      || (staffFilter === 'unassigned' ? !lead.assigned_to : lead.assigned_to === staffFilter);
    return matchesSearch && matchesStatus && matchesList && matchesStaff;
  });

  const stats = {
    total: leads.length,
    new: leads.filter((l) => l.status === 'new').length,
    qualified: leads.filter((l) => l.status === 'qualified' || l.status === 'proposal_sent').length,
    converted: leads.filter((l) => l.status === 'converted').length,
    pipelineValue: leads.reduce((sum, l) => sum + (l.estimated_value || 0), 0),
  };

  if (loading) return <div className="text-center py-8">Loading leads...</div>;

  const leadCounts = {
    all: leads.length,
    ...lists.reduce((acc, l) => {
      acc[l.id] = leads.filter((lead) => (lead.list_ids || []).includes(l.id)).length;
      return acc;
    }, {}),
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setActiveTab('leads')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'leads' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Target className="w-4 h-4 inline mr-1.5" /> Leads
        </button>
        <button
          onClick={() => setActiveTab('earnings')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'earnings' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <DollarSign className="w-4 h-4 inline mr-1.5" /> Staff Earnings
        </button>
      </div>

      {activeTab === 'earnings' && <StaffEarningsPanel dealerId={dealerId} token={token} />}

      <div style={{ display: activeTab === 'leads' ? 'block' : 'none' }} className="space-y-6">
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

      {/* Lists Panel */}
      <Card>
        <CardContent className="p-3">
          <LeadListsPanel
            lists={lists}
            selectedListId={selectedListId}
            onSelectList={setSelectedListId}
            onCreateList={handleCreateList}
            onUpdateList={handleUpdateList}
            onDeleteList={handleDeleteList}
            leadCounts={leadCounts}
            busy={bulkBusy}
          />
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
          <Select value={staffFilter} onValueChange={setStaffFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All Staff" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Staff</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {staff.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setShowImport(true)}>
            <Upload className="w-4 h-4" /> Import
          </Button>
        <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) { setEditingLead(null); setFormData(EMPTY_LEAD); } }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Add Lead</Button>
          </DialogTrigger>
...
        </Dialog>
        </div>
      </div>

      {/* Leads List */}
      {filteredLeads.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button onClick={toggleSelectAll} className="flex items-center gap-1.5 hover:text-gray-700">
            {selectedLeadIds.size === filteredLeads.length && filteredLeads.length > 0
              ? <CheckSquare className="w-4 h-4 text-purple-600" />
              : <Square className="w-4 h-4" />}
            {selectedLeadIds.size === filteredLeads.length && filteredLeads.length > 0 ? 'Deselect all' : 'Select all'}
          </button>
          {selectedLeadIds.size > 0 && <span className="text-xs text-purple-600">{selectedLeadIds.size} selected</span>}
        </div>
      )}
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
              <Card key={lead.id} className={`hover:shadow-md transition-shadow ${selectedLeadIds.has(lead.id) ? 'ring-2 ring-purple-400' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-3">
                    <button onClick={() => toggleSelect(lead.id)} className="mt-1 shrink-0" title="Select lead">
                      {selectedLeadIds.has(lead.id)
                        ? <CheckSquare className="w-5 h-5 text-purple-600" />
                        : <Square className="w-5 h-5 text-gray-300 hover:text-gray-400" />}
                    </button>
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
                        {lead.assigned_to && (
                          <Badge variant="outline" className="text-xs text-purple-600 border-purple-300">
                            <UserCircle className="w-2 h-2 mr-1" />{lead.assigned_to_name || 'Assigned'}
                            {lead.commission_rate > 0 && <span className="ml-0.5">({lead.commission_rate}%)</span>}
                          </Badge>
                        )}
                        {lead.status === 'converted' && lead.earned_amount > 0 && (
                          <Badge className="text-xs bg-green-100 text-green-700">
                            <DollarSign className="w-2 h-2 mr-0.5" />${lead.earned_amount.toFixed(2)} earned
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
                      {lead.list_ids?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {lead.list_ids.map(id => {
                            const list = lists.find(l => l.id === id);
                            if (!list) return null;
                            return (
                              <Badge key={id} variant="outline" className="text-xs" style={{ borderColor: list.color, color: list.color }}>
                                <span className="w-1.5 h-1.5 rounded-full mr-1" style={{ background: list.color }} />{list.name}
                              </Badge>
                            );
                          })}
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
                        <Button size="sm" variant="ghost" onClick={() => setAssigningLead(lead)} title="Assign to staff" className="gap-1">
                          <UserCog className="w-4 h-4" />
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

      {/* Bulk Action Bar */}
      <LeadBulkActionBar
        selectedCount={selectedLeadIds.size}
        onClearSelection={clearSelection}
        onBulkStatus={handleBulkStatus}
        onBulkDelete={handleBulkDelete}
        onBulkAddToList={(listId) => handleBulkSetList(listId, true)}
        onBulkRemoveFromList={(listId) => handleBulkSetList(listId, false)}
        onBulkSendInvite={handleBulkSendInvite}
        lists={lists}
        busy={bulkBusy}
      />

      {/* Import Dialog */}
      <LeadImportDialog
        open={showImport}
        onOpenChange={setShowImport}
        onImport={handleImport}
        dealerId={dealerId}
        lists={lists}
      />

      {/* Assign Dialog */}
      <LeadAssignDialog
        open={!!assigningLead}
        onOpenChange={(o) => { if (!o) setAssigningLead(null); }}
        dealerId={dealerId}
        token={token}
        lead={assigningLead}
        onAssigned={handleAssigned}
      />
      </div>
    </div>
  );
}