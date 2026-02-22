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
import { Plus, Edit, Trash2, Eye, Sparkles } from 'lucide-react';

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
  const queryClient = useQueryClient();

  const { data: chips = [], isLoading } = useQuery({
    queryKey: ['admin-chips'],
    queryFn: () => base44.entities.Chip.list()
  });

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Chip Management</h2>
          <p className="text-gray-500">Create and manage feature chips for the marketplace</p>
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

      <div className="grid gap-4">
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingChip(chip);
                      setDialogOpen(true);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(chip.id)}
                  >
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
      </div>
    </div>
  );
}

function ChipForm({ chip, onSubmit, onCancel }) {
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