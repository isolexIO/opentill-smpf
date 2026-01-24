import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Cpu } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ChipManager() {
  const [chips, setChips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChip, setEditingChip] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: 'Cpu',
    required_nft_collection: '',
    required_nft_count: 1,
    category: 'core',
    display_order: 0,
    color: '#3B82F6',
    is_active: true
  });

  useEffect(() => {
    loadChips();
  }, []);

  const loadChips = async () => {
    setLoading(true);
    try {
      // Super Admin loads all chips via service role
      const allChips = await base44.asServiceRole.entities.Chip.list('-display_order');
      setChips(allChips);
    } catch (error) {
      console.error('Error loading chips:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Super Admin creates/updates chips via service role
      if (editingChip) {
        await base44.asServiceRole.entities.Chip.update(editingChip.id, formData);
      } else {
        await base44.asServiceRole.entities.Chip.create(formData);
      }
      
      setDialogOpen(false);
      setEditingChip(null);
      resetForm();
      loadChips();
    } catch (error) {
      console.error('Error saving chip:', error);
      alert('Error saving chip: ' + error.message);
    }
  };

  const handleEdit = (chip) => {
    setEditingChip(chip);
    setFormData({
      name: chip.name,
      description: chip.description || '',
      icon: chip.icon || 'Cpu',
      required_nft_collection: chip.required_nft_collection,
      required_nft_count: chip.required_nft_count || 1,
      category: chip.category || 'core',
      display_order: chip.display_order || 0,
      color: chip.color || '#3B82F6',
      is_active: chip.is_active !== false
    });
    setDialogOpen(true);
  };

  const handleDelete = async (chipId) => {
    if (!confirm('Are you sure you want to delete this chip?')) return;
    
    try {
      // Super Admin deletes chips via service role
      await base44.asServiceRole.entities.Chip.delete(chipId);
      loadChips();
    } catch (error) {
      console.error('Error deleting chip:', error);
      alert('Error deleting chip: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      icon: 'Cpu',
      required_nft_collection: '',
      required_nft_count: 1,
      category: 'core',
      display_order: 0,
      color: '#3B82F6',
      is_active: true
    });
  };

  const categoryColors = {
    core: 'bg-blue-100 text-blue-800',
    premium: 'bg-purple-100 text-purple-800',
    enterprise: 'bg-amber-100 text-amber-800'
  };

  if (loading) {
    return <div className="text-center py-8">Loading chips...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Chip Management</h2>
          <p className="text-gray-500 dark:text-gray-400">Manage NFT-gated features for the Motherboard</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingChip(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Chip
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingChip ? 'Edit Chip' : 'Add New Chip'}</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Chip Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="core">Core</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="icon">Icon Name</Label>
                  <Input
                    id="icon"
                    value={formData.icon}
                    onChange={(e) => setFormData({...formData, icon: e.target.value})}
                    placeholder="e.g., Cpu, Zap, Shield"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({...formData, color: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="collection">Required NFT Collection Address *</Label>
                <Input
                  id="collection"
                  value={formData.required_nft_collection}
                  onChange={(e) => setFormData({...formData, required_nft_collection: e.target.value})}
                  placeholder="Solana NFT collection mint address"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nft_count">Required NFT Count</Label>
                  <Input
                    id="nft_count"
                    type="number"
                    min="1"
                    value={formData.required_nft_count}
                    onChange={(e) => setFormData({...formData, required_nft_count: parseInt(e.target.value)})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="display_order">Display Order</Label>
                  <Input
                    id="display_order"
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({...formData, display_order: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingChip ? 'Update Chip' : 'Create Chip'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Alert>
        <Cpu className="h-4 w-4" />
        <AlertDescription>
          Chips are NFT-gated features. Users must connect their Solana wallet and hold the required NFTs to unlock features.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4">
        {chips.map(chip => (
          <Card key={chip.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: chip.color || '#3B82F6' }}
                  >
                    <Cpu className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>{chip.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={categoryColors[chip.category]}>
                        {chip.category}
                      </Badge>
                      <Badge variant="outline">
                        Requires {chip.required_nft_count} NFT{chip.required_nft_count > 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(chip)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(chip.id)}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>{chip.description}</CardDescription>
              <div className="mt-4 text-xs text-gray-500 font-mono break-all">
                Collection: {chip.required_nft_collection}
              </div>
            </CardContent>
          </Card>
        ))}

        {chips.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Cpu className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No chips configured yet. Add your first chip to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}