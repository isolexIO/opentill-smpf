import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Eye, Sparkles, Upload, Loader2, CheckCircle, XCircle, Clock, AlertTriangle, ExternalLink } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

const FEATURE_FLAGS = [
  'advanced_analytics',
  'ai_insights',
  'multi_location',
  'custom_branding',
  'marketplace_integrations',
  'loyalty_rewards',
  'inventory_forecasting',
  'employee_scheduling',
  'customer_messaging',
  'premium_support'
];

export default function ChipManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChip, setEditingChip] = useState(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewingSubmission, setReviewingSubmission] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const queryClient = useQueryClient();

  const { data: chips = [], isLoading } = useQuery({
    queryKey: ['admin-chips'],
    queryFn: () => base44.entities.Chip.list()
  });

  const { data: submissions = [], isLoading: loadingSubmissions } = useQuery({
    queryKey: ['admin-chip-submissions'],
    queryFn: () => base44.entities.ChipSubmission.list('-created_date')
  });

  const updateSubmissionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ChipSubmission.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-chip-submissions'] });
      setReviewDialogOpen(false);
      setReviewingSubmission(null);
      setReviewNotes('');
    }
  });

  const handleReview = (submission, action) => {
    const updates = {
      review_notes: reviewNotes,
      status: action === 'approve' ? 'approved' : action === 'publish' ? 'published' : action === 'reject' ? 'rejected' : 'reviewing',
    };
    if (action === 'publish') updates.published_at = new Date().toISOString();
    updateSubmissionMutation.mutate({ id: submission.id, data: updates });
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Chip.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-chips'] });
      setDialogOpen(false);
      setEditingChip(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Chip.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-chips'] });
      setDialogOpen(false);
      setEditingChip(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Chip.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-chips'] });
    }
  });

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this chip?')) {
      deleteMutation.mutate(id);
    }
  };

  const STATUS_COLORS = {
    draft: 'bg-gray-100 text-gray-800',
    submitted: 'bg-blue-100 text-blue-800',
    reviewing: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    published: 'bg-emerald-100 text-emerald-800',
    archived: 'bg-slate-100 text-slate-800',
  };

  const pendingCount = submissions.filter(s => ['submitted', 'reviewing'].includes(s.status)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Chip Management</h2>
          <p className="text-gray-500">Manage chips and review builder submissions</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingChip(null)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Chip
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingChip ? 'Edit Chip' : 'Create New Chip'}</DialogTitle>
              <DialogDescription>Define the chip details, pricing, and features</DialogDescription>
            </DialogHeader>
            <ChipForm 
              chip={editingChip}
              onSubmit={(data) => {
                if (editingChip) {
                  updateMutation.mutate({ id: editingChip.id, data });
                } else {
                  createMutation.mutate(data);
                }
              }}
              onCancel={() => {
                setDialogOpen(false);
                setEditingChip(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="submissions">
        <TabsList>
          <TabsTrigger value="submissions" className="relative">
            Builder Submissions
            {pendingCount > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{pendingCount}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="chips">Platform Chips</TabsTrigger>
        </TabsList>

        {/* Builder Submissions Tab */}
        <TabsContent value="submissions" className="space-y-4 mt-4">
          {loadingSubmissions ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
          ) : submissions.length === 0 ? (
            <Card><CardContent className="p-12 text-center text-gray-500">No submissions yet</CardContent></Card>
          ) : (
            submissions.map(sub => (
              <Card key={sub.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {sub.logo_url && <img src={sub.logo_url} alt={sub.name} className="w-12 h-12 rounded-lg shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-900">{sub.name}</h3>
                          <Badge className={STATUS_COLORS[sub.status]}>{sub.status}</Badge>
                          {sub.featured && <Badge className="bg-amber-100 text-amber-800">Featured</Badge>}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{sub.short_description}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                          <span>By: <strong>{sub.builder_email}</strong></span>
                          <span>Category: <strong>{sub.category}</strong></span>
                          <span>Pricing: <strong>{sub.pricing_model} {sub.price ? `$${sub.price}` : ''}</strong></span>
                          {sub.repository_url && (
                            <a href={sub.repository_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                              <ExternalLink className="w-3 h-3" /> Repo
                            </a>
                          )}
                          {sub.documentation_url && (
                            <a href={sub.documentation_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                              <ExternalLink className="w-3 h-3" /> Docs
                            </a>
                          )}
                        </div>
                        {sub.review_notes && (
                          <div className={`mt-2 p-2 rounded text-xs ${sub.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                            <strong>Notes:</strong> {sub.review_notes}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setReviewingSubmission(sub); setReviewNotes(sub.review_notes || ''); setReviewDialogOpen(true); }}
                      >
                        Review
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Platform Chips Tab */}
        <TabsContent value="chips" className="space-y-4 mt-4">
          {chips.map(chip => (
            <Card key={chip.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    {chip.image_url && (
                      <img src={chip.image_url} alt={chip.name} className="w-16 h-16 rounded-lg" />
                    )}
                    <div>
                      <CardTitle>{chip.name}</CardTitle>
                      <CardDescription>{chip.short_description}</CardDescription>
                      <div className="flex gap-2 mt-2">
                        <Badge>{chip.billing_type}</Badge>
                        <Badge variant="outline">{chip.category}</Badge>
                        <Badge className={chip.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {chip.status}
                        </Badge>
                        {chip.featured && <Badge className="bg-yellow-100 text-yellow-800">Featured</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setEditingChip(chip); setDialogOpen(true); }}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(chip.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Price:</span>
                    <div className="font-medium">
                      {chip.billing_type === 'ONE_TIME' 
                        ? `${chip.price_duc} $DUC` 
                        : `${chip.recurring_price_duc} $DUC/${chip.interval}`}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Mints:</span>
                    <div className="font-medium">{chip.mints_count || 0} {chip.total_supply ? `/ ${chip.total_supply}` : ''}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Features:</span>
                    <div className="font-medium">{chip.feature_flags?.length || 0} flags</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review: {reviewingSubmission?.name}</DialogTitle>
            <DialogDescription>Review this chip submission and take action</DialogDescription>
          </DialogHeader>
          {reviewingSubmission && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg text-sm space-y-1">
                <p><strong>Builder:</strong> {reviewingSubmission.builder_email}</p>
                <p><strong>Category:</strong> {reviewingSubmission.category}</p>
                <p><strong>Pricing:</strong> {reviewingSubmission.pricing_model} {reviewingSubmission.price ? `- $${reviewingSubmission.price}` : ''}</p>
                <p className="text-gray-600">{reviewingSubmission.description}</p>
                <div className="flex gap-3 pt-1">
                  {reviewingSubmission.repository_url && (
                    <a href={reviewingSubmission.repository_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> Repository
                    </a>
                  )}
                  {reviewingSubmission.documentation_url && (
                    <a href={reviewingSubmission.documentation_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> Documentation
                    </a>
                  )}
                  {reviewingSubmission.demo_url && (
                    <a href={reviewingSubmission.demo_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> Demo
                    </a>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Review Notes (shown to builder)</label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add feedback or reason for decision..."
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReview(reviewingSubmission, 'reviewing')}
                  disabled={updateSubmissionMutation.isPending}
                >
                  <Clock className="w-3 h-3 mr-1" /> Mark as Reviewing
                </Button>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleReview(reviewingSubmission, 'approve')}
                  disabled={updateSubmissionMutation.isPending}
                >
                  <CheckCircle className="w-3 h-3 mr-1" /> Approve
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => handleReview(reviewingSubmission, 'publish')}
                  disabled={updateSubmissionMutation.isPending}
                >
                  <Sparkles className="w-3 h-3 mr-1" /> Approve & Publish
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleReview(reviewingSubmission, 'reject')}
                  disabled={updateSubmissionMutation.isPending}
                >
                  <XCircle className="w-3 h-3 mr-1" /> Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChipForm({ chip, onSubmit, onCancel }) {
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState(chip || {
    name: '',
    symbol: '',
    category: 'operations',
    short_description: '',
    long_description: '',
    image_url: '',
    billing_type: 'ONE_TIME',
    price_duc: 0,
    recurring_price_duc: 0,
    interval: 'MONTHLY',
    grace_period_days: 3,
    require_chip_nft: false,
    total_supply: null,
    max_per_wallet: 1,
    featured: false,
    status: 'DRAFT',
    feature_flags: [],
    is_active: true
  });

  const toggleFeatureFlag = (flag) => {
    const flags = formData.feature_flags || [];
    if (flags.includes(flag)) {
      setFormData({ ...formData, feature_flags: flags.filter(f => f !== flag) });
    } else {
      setFormData({ ...formData, feature_flags: [...flags, flag] });
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, image_url: result.file_url });
    } catch (error) {
      console.error('Image upload error:', error);
      alert('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Name *</Label>
          <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
        </div>
        <div>
          <Label>Symbol</Label>
          <Input value={formData.symbol} onChange={(e) => setFormData({...formData, symbol: e.target.value})} placeholder="e.g. ANLYTCS" />
        </div>
      </div>

      <div>
        <Label>Short Description *</Label>
        <Input value={formData.short_description} onChange={(e) => setFormData({...formData, short_description: e.target.value})} required />
      </div>

      <div>
        <Label>Long Description</Label>
        <Textarea value={formData.long_description} onChange={(e) => setFormData({...formData, long_description: e.target.value})} rows={4} />
      </div>

      <div>
        <Label>Chip Image</Label>
        <div className="flex items-center gap-4">
          {formData.image_url && (
            <img src={formData.image_url} alt="Preview" className="w-20 h-20 rounded-lg object-cover" />
          )}
          <div className="flex-1">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploadingImage}
              className="hidden"
              id="chip-image-upload"
            />
            <label htmlFor="chip-image-upload">
              <Button type="button" variant="outline" disabled={uploadingImage} asChild>
                <span>
                  {uploadingImage ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Image
                    </>
                  )}
                </span>
              </Button>
            </label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Category *</Label>
          <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="analytics">Analytics</SelectItem>
              <SelectItem value="payments">Payments</SelectItem>
              <SelectItem value="integrations">Integrations</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="operations">Operations</SelectItem>
              <SelectItem value="security">Security</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Billing Type *</Label>
          <Select value={formData.billing_type} onValueChange={(value) => setFormData({...formData, billing_type: value})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ONE_TIME">One-Time</SelectItem>
              <SelectItem value="RECURRING">Recurring</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {formData.billing_type === 'ONE_TIME' ? (
        <div>
          <Label>Price ($DUC) *</Label>
          <Input type="number" step="0.01" value={formData.price_duc} onChange={(e) => setFormData({...formData, price_duc: parseFloat(e.target.value)})} required />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Recurring Price ($DUC) *</Label>
            <Input type="number" step="0.01" value={formData.recurring_price_duc} onChange={(e) => setFormData({...formData, recurring_price_duc: parseFloat(e.target.value)})} required />
          </div>
          <div>
            <Label>Interval</Label>
            <Select value={formData.interval} onValueChange={(value) => setFormData({...formData, interval: value})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
                <SelectItem value="YEARLY">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div>
        <Label>Feature Flags</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {FEATURE_FLAGS.map(flag => (
            <label key={flag} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={(formData.feature_flags || []).includes(flag)}
                onChange={() => toggleFeatureFlag(flag)}
                className="rounded"
              />
              <span className="text-sm">{flag.replace(/_/g, ' ')}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="flex items-center justify-between">
          <Label>Featured</Label>
          <Switch checked={formData.featured} onCheckedChange={(checked) => setFormData({...formData, featured: checked})} />
        </div>
        <div className="flex items-center justify-between">
          <Label>Active</Label>
          <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData({...formData, is_active: checked})} />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="PUBLISHED">Published</SelectItem>
              <SelectItem value="UNPUBLISHED">Unpublished</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">
          <Sparkles className="w-4 h-4 mr-2" />
          {chip ? 'Update' : 'Create'} Chip
        </Button>
      </div>
    </form>
  );
}