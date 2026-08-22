import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, List, Trash2, Edit2, Check, X } from 'lucide-react';

const COLORS = ['#7B2FD6', '#0FD17A', '#3B82F6', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6', '#6366F1'];

export default function LeadListsPanel({ lists, selectedListId, onSelectList, onCreateList, onUpdateList, onDeleteList, leadCounts, busy }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);

  const startCreate = () => {
    setEditingId(null);
    setName('');
    setColor(COLORS[0]);
    setShowForm(true);
  };

  const startEdit = (list) => {
    setEditingId(list.id);
    setName(list.name);
    setColor(list.color || COLORS[0]);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    if (editingId) {
      await onUpdateList(editingId, { name: name.trim(), color });
    } else {
      await onCreateList({ name: name.trim(), color });
    }
    setShowForm(false);
    setEditingId(null);
    setName('');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <List className="w-4 h-4" /> Lead Lists
        </h3>
        <Button variant="ghost" size="sm" onClick={startCreate} className="h-7 px-2">
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>

      {showForm && (
        <div className="border rounded-lg p-3 space-y-2 bg-gray-50">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="List name…"
            className="h-8 text-sm"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <div className="flex gap-1 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-5 h-5 rounded-full border-2 ${color === c ? 'border-gray-800' : 'border-transparent'}`}
                style={{ background: c }}
              />
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} className="h-7"><X className="w-3.5 h-3.5" /></Button>
            <Button size="sm" onClick={handleSave} className="h-7"><Check className="w-3.5 h-3.5" /></Button>
          </div>
        </div>
      )}

      <div className="space-y-1">
        <button
          onClick={() => onSelectList(null)}
          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors ${!selectedListId ? 'bg-purple-50 text-purple-700 font-medium' : 'hover:bg-gray-100 text-gray-600'}`}
        >
          <span>All Leads</span>
          <Badge variant="outline" className="text-xs">{leadCounts.all || 0}</Badge>
        </button>
        {lists.map((list) => (
          <div
            key={list.id}
            className={`group flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors ${selectedListId === list.id ? 'bg-purple-50 text-purple-700 font-medium' : 'hover:bg-gray-100 text-gray-600'}`}
          >
            <button onClick={() => onSelectList(list.id)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: list.color || '#7B2FD6' }} />
              <span className="truncate">{list.name}</span>
            </button>
            <div className="flex items-center gap-1 shrink-0">
              <Badge variant="outline" className="text-xs">{leadCounts[list.id] || 0}</Badge>
              <button onClick={() => startEdit(list)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 p-0.5">
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                onClick={() => { if (confirm(`Delete list "${list.name}"? Leads will not be deleted.`)) onDeleteList(list.id); }}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 p-0.5"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
        {lists.length === 0 && !showForm && (
          <p className="text-xs text-gray-400 px-2 py-2">No lists yet. Create one to organize your leads.</p>
        )}
      </div>
    </div>
  );
}