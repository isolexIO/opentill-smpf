import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Image, Code, Trash2, Plus, EyeOff, Upload, Loader2 } from 'lucide-react';

export default function AdvertisementManager() {
  const [ads, setAds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [formData, setFormData] = useState({
    title: '',
    type: 'image',
    content_url: '',
    link_url: '',
    duration_seconds: 10,
    display_order: 0,
    is_active: true,
    target_location: 'system_menu',
    priority: 0,
    days_of_week: [],
    start_time_of_day: '',
    end_time_of_day: '',
    max_views_per_day: 0,
    max_views_per_session: 0,
    target_merchant_ids: [],
    target_dealer_ids: []
  });

  useEffect(() => {
    loadAds();
  }, []);

  const loadAds = async () => {
    try {
      setIsLoading(true);
      const adsList = await base44.entities.Advertisement.list('display_order');
      setAds(adsList);
    } catch (error) {
      console.error('Error loading ads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = formData.type === 'image' 
      ? ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
      : ['video/mp4', 'video/webm', 'video/ogg'];
    
    if (!validTypes.includes(file.type)) {
      alert(`Please upload a valid ${formData.type} file`);
      return;
    }

    // Validate file size (max 10MB for images, 50MB for videos)
    const maxSize = formData.type === 'image' ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`File size must be less than ${formData.type === 'image' ? '10MB' : '50MB'}`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      // Upload file using Core.UploadFile integration
      const response = await base44.integrations.Core.UploadFile({ file });
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      console.log('Upload response:', response);

      // Handle different response structures
      let fileUrl;
      if (response && response.data && response.data.file_url) {
        fileUrl = response.data.file_url;
      } else if (response && response.file_url) {
        fileUrl = response.file_url;
      } else if (typeof response === 'string') {
        fileUrl = response;
      } else {
        throw new Error('Invalid upload response format');
      }

      if (!fileUrl) {
        throw new Error('No file URL returned from upload');
      }

      // Update form data with the uploaded file URL
      setFormData(prev => ({
        ...prev,
        content_url: fileUrl
      }));

      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);

    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file: ' + (error.message || 'Unknown error'));
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      alert('Title is required');
      return;
    }

    if (!formData.content_url.trim()) {
      alert('Content URL or file upload is required');
      return;
    }

    try {
      if (editingAd) {
        await base44.entities.Advertisement.update(editingAd.id, formData);
      } else {
        await base44.entities.Advertisement.create(formData);
      }

      await loadAds();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving ad:', error);
      alert('Failed to save advertisement: ' + error.message);
    }
  };

  const handleEdit = (ad) => {
    setEditingAd(ad);
    setFormData({
      title: ad.title,
      type: ad.type,
      content_url: ad.content_url,
      link_url: ad.link_url || '',
      duration_seconds: ad.duration_seconds || 10,
      display_order: ad.display_order || 0,
      is_active: ad.is_active,
      target_location: ad.target_location || 'system_menu',
      priority: ad.priority || 0,
      days_of_week: ad.days_of_week || [],
      start_time_of_day: ad.start_time_of_day || '',
      end_time_of_day: ad.end_time_of_day || '',
      max_views_per_day: ad.max_views_per_day || 0,
      max_views_per_session: ad.max_views_per_session || 0,
      target_merchant_ids: ad.target_merchant_ids || [],
      target_dealer_ids: ad.target_dealer_ids || []
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this advertisement?')) return;

    try {
      await base44.entities.Advertisement.delete(id);
      await loadAds();
    } catch (error) {
      console.error('Error deleting ad:', error);
      alert('Failed to delete advertisement: ' + error.message);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingAd(null);
    setFormData({
      title: '',
      type: 'image',
      content_url: '',
      link_url: '',
      duration_seconds: 10,
      display_order: 0,
      is_active: true,
      target_location: 'system_menu',
      priority: 0,
      days_of_week: [],
      start_time_of_day: '',
      end_time_of_day: '',
      max_views_per_day: 0,
      max_views_per_session: 0,
      target_merchant_ids: [],
      target_dealer_ids: []
    });
    setIsUploading(false);
    setUploadProgress(0);
  };

  const toggleActive = async (ad) => {
    try {
      await base44.entities.Advertisement.update(ad.id, {
        is_active: !ad.is_active
      });
      await loadAds();
    } catch (error) {
      console.error('Error toggling ad status:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Advertisement Manager</h2>
          <p className="text-gray-600">Manage ads for System Menu and Customer Display</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Advertisement
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600" />
          <p className="text-gray-600 mt-2">Loading advertisements...</p>
        </div>
      ) : ads.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Image className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No advertisements yet. Create your first ad!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ads.map((ad) => (
            <Card key={ad.id} className="overflow-hidden">
              <div className="aspect-video bg-gray-100 relative">
                {ad.type === 'image' && (
                  <img
                    src={ad.content_url}
                    alt={ad.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage Not Found%3C/text%3E%3C/svg%3E';
                    }}
                  />
                )}
                {ad.type === 'video' && (
                  <video
                    src={ad.content_url}
                    className="w-full h-full object-cover"
                    controls
                  />
                )}
                {ad.type === 'html' && (
                  <div className="flex items-center justify-center h-full">
                    <Code className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                {!ad.is_active && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <EyeOff className="w-8 h-8 text-white" />
                  </div>
                )}
              </div>

              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{ad.title}</span>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={ad.is_active}
                      onCheckedChange={() => toggleActive(ad)}
                    />
                  </div>
                </CardTitle>
              </CardHeader>

              <CardContent>
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center justify-between">
                    <span>Type:</span>
                    <span className="font-medium capitalize">{ad.type}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Duration:</span>
                    <span className="font-medium">{ad.duration_seconds}s</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Location:</span>
                    <span className="font-medium capitalize">{ad.target_location.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Views:</span>
                    <span className="font-medium">{ad.view_count || 0}</span>
                  </div>
                  {ad.click_count > 0 && (
                    <div className="flex items-center justify-between">
                      <span>Clicks:</span>
                      <span className="font-medium">{ad.click_count}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(ad)}
                    className="flex-1"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(ad.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAd ? 'Edit Advertisement' : 'New Advertisement'}
            </DialogTitle>
            <DialogDescription>
              Create engaging ads for your system menu or customer display
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Summer Sale 2024"
              />
            </div>

            <div>
              <Label htmlFor="type">Content Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value, content_url: '' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="content_url">Content *</Label>
              <div className="space-y-2">
                {formData.type === 'html' ? (
                  <Textarea
                    id="content_url"
                    value={formData.content_url}
                    onChange={(e) => setFormData({ ...formData, content_url: e.target.value })}
                    placeholder="<div>Your HTML content here...</div>"
                    rows={6}
                  />
                ) : (
                  <>
                    <div className="flex gap-2">
                      <Input
                        id="content_url"
                        value={formData.content_url}
                        onChange={(e) => setFormData({ ...formData, content_url: e.target.value })}
                        placeholder={`Enter ${formData.type} URL or upload a file`}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('file-upload').click()}
                        disabled={isUploading}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload
                      </Button>
                    </div>
                    <input
                      id="file-upload"
                      type="file"
                      accept={formData.type === 'image' ? 'image/*' : 'video/*'}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    {isUploading && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <span>Uploading...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {formData.content_url && !isUploading && (
                      <div className="mt-2 p-2 bg-gray-50 rounded border">
                        {formData.type === 'image' ? (
                          <img
                            src={formData.content_url}
                            alt="Preview"
                            className="max-h-40 mx-auto rounded"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <video
                            src={formData.content_url}
                            className="max-h-40 mx-auto rounded"
                            controls
                          />
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="link_url">Link URL (Optional)</Label>
              <Input
                id="link_url"
                value={formData.link_url}
                onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                placeholder="https://example.com/promo"
              />
              <p className="text-sm text-gray-500 mt-1">Where should clicking this ad take the user?</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration">Display Duration (seconds)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  value={formData.duration_seconds}
                  onChange={(e) => setFormData({ ...formData, duration_seconds: parseInt(e.target.value) || 10 })}
                />
              </div>

              <div>
                <Label htmlFor="order">Display Order</Label>
                <Input
                  id="order"
                  type="number"
                  min="0"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="target_location">Target Location</Label>
              <Select
                value={formData.target_location}
                onValueChange={(value) => setFormData({ ...formData, target_location: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system_menu">System Menu</SelectItem>
                  <SelectItem value="customer_display">Customer Display</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Active (show this ad)</Label>
            </div>

            <div className="border-t pt-4 space-y-4">
              <h4 className="text-sm font-semibold text-gray-900">Display Rules</h4>
              <p className="text-xs text-gray-500 -mt-3">Rules are evaluated per device. Leave optional fields blank for "no restriction".</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Input
                    id="priority"
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-gray-500 mt-1">Higher priority shows first</p>
                </div>
                <div>
                  <Label>Days of Week</Label>
                  <div className="flex gap-1">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => {
                      const active = formData.days_of_week.includes(i);
                      return (
                        <button
                          type="button"
                          key={i}
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            days_of_week: active
                              ? prev.days_of_week.filter(x => x !== i)
                              : [...prev.days_of_week, i]
                          }))}
                          className={`flex-1 h-8 rounded text-xs font-medium ${active ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                        >
                          {d.slice(0, 1)}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Empty = all days</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_time">Start Time (daily)</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time_of_day}
                    onChange={(e) => setFormData({ ...formData, start_time_of_day: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="end_time">End Time (daily)</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time_of_day}
                    onChange={(e) => setFormData({ ...formData, end_time_of_day: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="max_day">Max Views / Day</Label>
                  <Input
                    id="max_day"
                    type="number"
                    min="0"
                    value={formData.max_views_per_day}
                    onChange={(e) => setFormData({ ...formData, max_views_per_day: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-gray-500 mt-1">0 = unlimited</p>
                </div>
                <div>
                  <Label htmlFor="max_session">Max Views / Session</Label>
                  <Input
                    id="max_session"
                    type="number"
                    min="0"
                    value={formData.max_views_per_session}
                    onChange={(e) => setFormData({ ...formData, max_views_per_session: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-gray-500 mt-1">0 = unlimited</p>
                </div>
              </div>

              <div>
                <Label htmlFor="target_merchants">Target Merchant IDs</Label>
                <Input
                  id="target_merchants"
                  value={formData.target_merchant_ids.join(', ')}
                  onChange={(e) => setFormData({ ...formData, target_merchant_ids: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  placeholder="Comma-separated. Empty = all merchants"
                />
              </div>
              <div>
                <Label htmlFor="target_dealers">Target Dealer IDs</Label>
                <Input
                  id="target_dealers"
                  value={formData.target_dealer_ids.join(', ')}
                  onChange={(e) => setFormData({ ...formData, target_dealer_ids: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  placeholder="Comma-separated. Empty = all dealers"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUploading}>
                {editingAd ? 'Update' : 'Create'} Advertisement
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}