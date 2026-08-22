import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Phone, UserCircle, DollarSign, Calendar, TrendingUp } from 'lucide-react';

const STATUS_CONFIG = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-700', accent: 'border-t-blue-500', dot: 'bg-blue-500' },
  contacted: { label: 'Contacted', color: 'bg-yellow-100 text-yellow-700', accent: 'border-t-yellow-500', dot: 'bg-yellow-500' },
  qualified: { label: 'Qualified', color: 'bg-purple-100 text-purple-700', accent: 'border-t-purple-500', dot: 'bg-purple-500' },
  proposal_sent: { label: 'Proposal Sent', color: 'bg-indigo-100 text-indigo-700', accent: 'border-t-indigo-500', dot: 'bg-indigo-500' },
  converted: { label: 'Converted', color: 'bg-green-100 text-green-700', accent: 'border-t-green-500', dot: 'bg-green-500' },
  lost: { label: 'Lost', color: 'bg-red-100 text-red-700', accent: 'border-t-red-500', dot: 'bg-red-500' },
};

const COLUMN_ORDER = ['new', 'contacted', 'qualified', 'proposal_sent', 'converted', 'lost'];

export default function LeadBoardView({ leads, onStatusChange, onOpenDetail }) {
  const [draggingId, setDraggingId] = useState(null);

  const grouped = COLUMN_ORDER.reduce((acc, status) => {
    acc[status] = leads.filter((l) => l.status === status);
    return acc;
  }, {});

  const onDragStart = (start) => setDraggingId(start.draggableId);
  const onDragEnd = (result) => {
    setDraggingId(null);
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;
    onStatusChange(draggableId, destination.droppableId);
  };

  return (
    <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1">
        {COLUMN_ORDER.map((status) => {
          const cfg = STATUS_CONFIG[status];
          const columnLeads = grouped[status] || [];
          const columnValue = columnLeads.reduce((sum, l) => sum + (l.estimated_value || 0), 0);
          return (
            <div key={status} className="flex-shrink-0 w-72">
              <div className={`rounded-t-lg bg-gray-50 border-t-4 ${cfg.accent} px-3 py-2 border-x border-b border-gray-200`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <span className="text-sm font-semibold text-gray-700">{cfg.label}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">{columnLeads.length}</Badge>
                </div>
                {columnValue > 0 && (
                  <p className="text-xs text-gray-500 mt-0.5">${columnValue.toLocaleString()}</p>
                )}
              </div>
              <Droppable droppableId={status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[120px] p-2 space-y-2 rounded-b-lg border-x border-b border-gray-200 transition-colors ${snapshot.isDraggingOver ? 'bg-purple-50' : 'bg-gray-50/50'}`}
                  >
                    {columnLeads.map((lead, index) => (
                      <Draggable key={lead.id} draggableId={lead.id} index={index}>
                        {(prov, snap) => (
                          <div
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            {...prov.dragHandleProps}
                            onClick={() => !snap.isDragging && onOpenDetail(lead)}
                            className={`cursor-pointer rounded-lg bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow ${snap.isDragging ? 'shadow-lg ring-2 ring-purple-300' : ''}`}
                          >
                            <div className="p-3">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h4 className="text-sm font-semibold text-gray-900 line-clamp-1">{lead.business_name}</h4>
                              </div>
                              {lead.contact_name && (
                                <p className="text-xs text-gray-500 line-clamp-1">{lead.contact_name}</p>
                              )}
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-xs text-gray-500">
                                {lead.email && <span className="flex items-center gap-0.5"><Mail className="w-2.5 h-2.5" /></span>}
                                {lead.phone && <span className="flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" /></span>}
                                {lead.estimated_value > 0 && (
                                  <span className="flex items-center gap-0.5 text-green-600 font-medium">
                                    <TrendingUp className="w-2.5 h-2.5" />${lead.estimated_value.toLocaleString()}
                                  </span>
                                )}
                              </div>
                              {lead.assigned_to && (
                                <div className="mt-1.5">
                                  <Badge variant="outline" className="text-xs text-purple-600 border-purple-300">
                                    <UserCircle className="w-2 h-2 mr-0.5" />{lead.assigned_to_name || 'Assigned'}
                                  </Badge>
                                </div>
                              )}
                              {lead.next_follow_up && (
                                <p className="text-xs text-orange-600 mt-1.5 flex items-center gap-0.5">
                                  <Calendar className="w-2.5 h-2.5" />{new Date(lead.next_follow_up).toLocaleDateString()}
                                </p>
                              )}
                              {lead.status === 'converted' && lead.earned_amount > 0 && (
                                <p className="text-xs text-green-600 mt-1 flex items-center gap-0.5 font-medium">
                                  <DollarSign className="w-2.5 h-2.5" />{lead.earned_amount.toFixed(2)} earned
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {columnLeads.length === 0 && !snapshot.isDraggingOver && (
                      <p className="text-xs text-gray-400 text-center py-4">Drop leads here</p>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}