import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Bell,
  Plus,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  AlertCircle,
  Info,
  CheckCircle,
  AlertTriangle,
  Megaphone
} from 'lucide-react';

export default function NotificationManager() {
  const [notifications, setNotifications] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const [dealers, setDealers] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info',
    priority: 'normal',
    target_scope: 'all',
    target_merchants: [],
    target_dealer_ids: [],
    is_active: true,
    is_dismissible: true,
    expires_at: '',
    action_url: '',
    action_text: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const user = await base44.auth.me();
      setCurrentUser(user);

      const [notificationsList, merchantsList, dealersList] = await Promise.all([
        base44.entities.MerchantNotification.list('-created_date'),
        base44.entities.Merchant.list('business_name'),
        base44.entities.Dealer.list('name')
      ]);

      setNotifications(notificationsList);
      setMerchants(merchantsList);
      setDealers(dealersList);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.message.trim()) {
      alert('Title and message are required');
      return;
    }

    try {
      const notificationData = {
        title: formData.title,
        message: formData.message,
        type: formData.type,
        priority: formData.priority,
        target_merchants: formData.target_scope === 'merchants' ? formData.target_merchants : [],
        target_dealer_ids: formData.target_scope === 'dealers' ? formData.target_dealer_ids : [],
        is_active: formData.is_active,
        is_dismissible: formData.is_dismissible,
        expires_at: formData.expires_at,
        action_url: formData.action_url,
        action_text: formData.action_text,
        created_by: currentUser.id,
        created_by_email: currentUser.email
      };

      if (editingNotification) {
        await base44.entities.MerchantNotification.update(editingNotification.id, notificationData);
      } else {
        await base44.entities.MerchantNotification.create(notificationData);
      }

      await loadData();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving notification:', error);
      alert('Failed to save notification: ' + error.message);
    }
  };

  const handleEdit = (notification) => {
    setEditingNotification(notification);
    const scope = (notification.target_dealer_ids?.length > 0) ? 'dealers'
      : (notification.target_merchants?.length > 0) ? 'merchants' : 'all';
    setFormData({
      title: notification.title,
      message: notification.message,
      type: notification.type,
      priority: notification.priority,
      target_scope: scope,
      target_merchants: notification.target_merchants || [],
      target_dealer_ids: notification.target_dealer_ids || [],
      is_active: notification.is_active,
      is_dismissible: notification.is_dismissible,
      expires_at: notification.expires_at || '',
      action_url: notification.action_url || '',
      action_text: notification.action_text || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this notification?')) return;

    try {
      await base44.entities.MerchantNotification.delete(id);
      await loadData();
    } catch (error) {
      console.error('Error deleting notification:', error);
      alert('Failed to delete notification');
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingNotification(null);
    setFormData({
      title: '',
      message: '',
      type: 'info',
      priority: 'normal',
      target_scope: 'all',
      target_merchants: [],
      target_dealer_ids: [],
      is_active: true,
      is_dismissible: true,
      expires_at: '',
      action_url: '',
      action_text: ''
    });
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'announcement':
        return <Megaphone className="w-4 h-4 text-purple-500" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getTypeBadge = (type) => {
    const configs = {
      info: { color: 'bg-blue-100 text-blue-800', label: 'Info' },
      warning: { color: 'bg-yellow-100 text-yellow-800', label: 'Warning' },
      success: { color: 'bg-green-100 text-green-800', label: 'Success' },
      error: { color: 'bg-red-100 text-red-800', label: 'Error' },
      announcement: { color: 'bg-purple-100 text-purple-800', label: 'Announcement' }
    };
    const config = configs[type] || configs.info;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority) => {
    const configs = {
      low: { color: 'bg-gray-100 text-gray-800', label: 'Low' },
      normal: { color: 'bg-blue-100 text-blue-800', label: 'Normal' },
      high: { color: 'bg-orange-100 text-orange-800', label: 'High' },
      urgent: { color: 'bg-red-100 text-red-800', label: 'Urgent' }
    };
    const config = configs[priority] || configs.normal;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Merchant Notifications
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Notification
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading notifications...
                  </TableCell>
                </TableRow>
              ) : notifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No notifications created yet
                  </TableCell>
                </TableRow>
              ) : (
                notifications.map((notification) => (
                  <TableRow key={notification.id}>
                    <TableCell>{getTypeIcon(notification.type)}</TableCell>
                    <TableCell className="font-medium">{notification.title}</TableCell>
                    <TableCell>{getTypeBadge(notification.type)}</TableCell>
                    <TableCell>{getPriorityBadge(notification.priority)}</TableCell>
                    <TableCell>
                     {notification.target_dealer_ids?.length > 0
                       ? `${notification.target_dealer_ids.length} dealer(s)`
                       : notification.target_merchants?.length > 0
                         ? `${notification.target_merchants.length} merchant(s)`
                         : 'All'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={notification.is_active ? 'default' : 'secondary'}>
                        {notification.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4 text-gray-400" />
                        {notification.view_count || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(notification)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(notification.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingNotification ? 'Edit Notification' : 'Create Notification'}
            </DialogTitle>
            <DialogDescription>
              Send notifications to all or specific merchants
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="System Maintenance Scheduled"
              />
            </div>

            <div>
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="We will be performing system maintenance on..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="announcement">Announcement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Target Scope */}
            <div>
              <Label>Target Audience</Label>
              <Select
                value={formData.target_scope}
                onValueChange={(value) => setFormData({ ...formData, target_scope: value, target_merchants: [], target_dealer_ids: [] })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Merchants (Broadcast)</SelectItem>
                  <SelectItem value="dealers">Specific Dealers</SelectItem>
                  <SelectItem value="merchants">Specific Merchants</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.target_scope === 'dealers' && (
              <div>
                <Label>Select Dealers</Label>
                <div className="mt-1 border rounded-md max-h-40 overflow-y-auto p-2 space-y-1">
                  {dealers.map(d => (
                    <label key={d.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                      <input
                        type="checkbox"
                        checked={formData.target_dealer_ids.includes(d.id)}
                        onChange={(e) => {
                          const updated = e.target.checked
                            ? [...formData.target_dealer_ids, d.id]
                            : formData.target_dealer_ids.filter(id => id !== d.id);
                          setFormData({ ...formData, target_dealer_ids: updated });
                        }}
                      />
                      {d.name}
                    </label>
                  ))}
                  {dealers.length === 0 && <p className="text-sm text-gray-400">No dealers found</p>}
                </div>
              </div>
            )}

            {formData.target_scope === 'merchants' && (
              <div>
                <Label>Select Merchants</Label>
                <div className="mt-1 border rounded-md max-h-40 overflow-y-auto p-2 space-y-1">
                  {merchants.map(m => (
                    <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                      <input
                        type="checkbox"
                        checked={formData.target_merchants.includes(m.id)}
                        onChange={(e) => {
                          const updated = e.target.checked
                            ? [...formData.target_merchants, m.id]
                            : formData.target_merchants.filter(id => id !== m.id);
                          setFormData({ ...formData, target_merchants: updated });
                        }}
                      />
                      {m.business_name}
                    </label>
                  ))}
                  {merchants.length === 0 && <p className="text-sm text-gray-400">No merchants found</p>}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="expires_at">Expiration Date (Optional)</Label>
              <Input
                id="expires_at"
                type="datetime-local"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="action_url">Action URL (Optional)</Label>
                <Input
                  id="action_url"
                  value={formData.action_url}
                  onChange={(e) => setFormData({ ...formData, action_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div>
                <Label htmlFor="action_text">Action Button Text</Label>
                <Input
                  id="action_text"
                  value={formData.action_text}
                  onChange={(e) => setFormData({ ...formData, action_text: e.target.value })}
                  placeholder="Learn More"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_dismissible"
                  checked={formData.is_dismissible}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_dismissible: checked })}
                />
                <Label htmlFor="is_dismissible">Dismissible</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit">
                {editingNotification ? 'Update' : 'Create'} Notification
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}