import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Mail, Trash2, ListPlus, ListX, X, CheckSquare } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal_sent', label: 'Proposal Sent' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
];

export default function LeadBulkActionBar({
  selectedCount,
  onClearSelection,
  onBulkStatus,
  onBulkDelete,
  onBulkAddToList,
  onBulkRemoveFromList,
  onBulkSendInvite,
  lists,
  busy,
}) {
  const [listAction, setListAction] = useState('add');
  const [targetList, setTargetList] = useState('');

  if (selectedCount === 0) return null;

  return (
    <div className="sticky bottom-4 z-30 bg-white border border-gray-200 rounded-xl shadow-lg p-3 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <Badge className="bg-purple-100 text-purple-700">
          <CheckSquare className="w-3 h-3 mr-1" /> {selectedCount} selected
        </Badge>
        <Button variant="ghost" size="sm" onClick={onClearSelection} className="h-7 px-2">
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Select onValueChange={(v) => onBulkStatus(v)}>
          <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Set status" /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={onBulkSendInvite} disabled={busy} className="gap-1 h-8">
          <Mail className="w-3.5 h-3.5" /> Send invites
        </Button>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <Select value={targetList} onValueChange={setTargetList}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Select list" /></SelectTrigger>
          <SelectContent>
            {lists?.length > 0 ? lists.map((l) => (
              <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
            )) : <SelectItem value={null} disabled>No lists yet</SelectItem>}
          </SelectContent>
        </Select>
        <Select value={listAction} onValueChange={setListAction}>
          <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="add">Add to</SelectItem>
            <SelectItem value="remove">Remove from</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          disabled={!targetList || busy}
          onClick={() => listAction === 'add' ? onBulkAddToList(targetList) : onBulkRemoveFromList(targetList)}
          className="gap-1 h-8"
        >
          {listAction === 'add' ? <ListPlus className="w-3.5 h-3.5" /> : <ListX className="w-3.5 h-3.5" />}
          Apply
        </Button>
      </div>

      <Button variant="ghost" size="sm" onClick={onBulkDelete} disabled={busy} className="text-red-600 gap-1 h-8">
        <Trash2 className="w-3.5 h-3.5" /> Delete
      </Button>
    </div>
  );
}