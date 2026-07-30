import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Star, MessageSquare, Loader2, Trash2, Filter, Search } from 'lucide-react';

const CATEGORY_LABELS = {
  bug: 'Bug Report',
  feature_request: 'Feature Request',
  compliment: 'Compliment',
  complaint: 'Complaint',
  question: 'Question',
  other: 'Other',
};

const STATUS_VARIANT = {
  new: 'default',
  reviewed: 'secondary',
  resolved: 'outline',
  ignored: 'secondary',
};

export default function FeedbackManager() {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    loadFeedback();
  }, []);

  const loadFeedback = async () => {
    setLoading(true);
    try {
      const items = await base44.entities.Feedback.list('-created_date', 100);
      setFeedback(items || []);
    } catch (err) {
      console.error('Error loading feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    setUpdatingId(id);
    try {
      const updated = await base44.entities.Feedback.update(id, { status });
      setFeedback((prev) => prev.map((f) => (f.id === id ? updated : f)));
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const saveNotes = async (id, admin_notes) => {
    setUpdatingId(id);
    try {
      const updated = await base44.entities.Feedback.update(id, { admin_notes, status: 'reviewed' });
      setFeedback((prev) => prev.map((f) => (f.id === id ? updated : f)));
    } catch (err) {
      console.error('Error saving notes:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this feedback entry permanently?')) return;
    try {
      await base44.entities.Feedback.delete(id);
      setFeedback((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      console.error('Error deleting feedback:', err);
    }
  };

  const filtered = useMemo(() => {
    return feedback.filter((f) => {
      if (filterStatus !== 'all' && f.status !== filterStatus) return false;
      if (filterCategory !== 'all' && f.category !== filterCategory) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = `${f.message || ''} ${f.user_email || ''} ${f.user_name || ''} ${f.page || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [feedback, filterStatus, filterCategory, search]);

  const stats = useMemo(() => {
    const total = feedback.length;
    const news = feedback.filter((f) => f.status === 'new').length;
    const resolved = feedback.filter((f) => f.status === 'resolved').length;
    const avg = feedback.length > 0
      ? (feedback.filter((f) => f.rating).reduce((s, f) => s + (f.rating || 0), 0) /
         Math.max(1, feedback.filter((f) => f.rating).length)).toFixed(1)
      : '—';
    return { total, news, resolved, avg };
  }, [feedback]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            User Feedback
          </h3>
          <p className="text-sm text-gray-500">Review feedback submitted by users across the platform.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadFeedback} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">New</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.news}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Avg Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1">
              {stats.avg}
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search feedback..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="md:w-44">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="ignored">Ignored</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="md:w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            No feedback matches your filters.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <FeedbackCard
              key={item.id}
              item={item}
              updating={updatingId === item.id}
              onStatusChange={updateStatus}
              onSaveNotes={saveNotes}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FeedbackCard({ item, updating, onStatusChange, onSaveNotes, onDelete }) {
  const [notes, setNotes] = useState(item.admin_notes || '');
  useEffect(() => { setNotes(item.admin_notes || ''); }, [item.id, item.admin_notes]);

  const created = item.created_date ? new Date(item.created_date) : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={STATUS_VARIANT[item.status] || 'default'}>
                {item.status}
              </Badge>
              <Badge variant="outline">
                {CATEGORY_LABELS[item.category] || item.category}
              </Badge>
              {item.rating ? (
                <span className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={`w-3.5 h-3.5 ${
                        item.rating >= n ? 'fill-amber-400 text-amber-400' : 'text-gray-200'
                      }`}
                    />
                  ))}
                </span>
              ) : null}
            </div>
            <CardDescription className="mt-2 text-xs">
              {item.user_name || 'Anonymous'}
              {item.user_email ? ` · ${item.user_email}` : ''}
              {item.page ? ` · ${item.page}` : ''}
              {created ? ` · ${created.toLocaleString()}` : ''}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-red-500 hover:bg-red-50"
            onClick={() => onDelete(item.id)}
            disabled={updating}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-gray-800 whitespace-pre-wrap">{item.message}</p>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-500">Set status:</span>
          {['new', 'reviewed', 'resolved', 'ignored'].map((s) => (
            <Button
              key={s}
              size="sm"
              variant={item.status === s ? 'default' : 'outline'}
              onClick={() => onStatusChange(item.id, s)}
              disabled={updating}
              className="h-7 px-2 text-xs"
            >
              {s}
            </Button>
          ))}
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Admin Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Internal notes (not visible to user)..."
            disabled={updating}
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onSaveNotes(item.id, notes)}
            disabled={updating}
            className="h-7"
          >
            Save Notes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}