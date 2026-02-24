import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Send, Loader2, X } from 'lucide-react';

export default function NotificationCreator({ onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [merchants, setMerchants] = useState([]);
  const [selectedMerchants, setSelectedMerchants] = useState([]);
  const [notificationType, setNotificationType] = useState('info');
  const [priority, setPriority] = useState('normal');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [actionText, setActionText] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isDismissible, setIsDismissible] = useState(true);
  const [sendToAll, setSendToAll] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadMerchants();
  }, []);

  const loadMerchants = async () => {
    try {
      const merchantList = await base44.entities.Merchant.list('-created_date', 500);
      setMerchants(merchantList);
    } catch (err) {
      console.error('Error loading merchants:', err);
    }
  };

  const handleAddMerchant = (merchantId) => {
    if (!selectedMerchants.includes(merchantId)) {
      setSelectedMerchants([...selectedMerchants, merchantId]);
    }
  };

  const handleRemoveMerchant = (merchantId) => {
    setSelectedMerchants(selectedMerchants.filter(id => id !== merchantId));
  };

  const handleSend = async () => {
    setError('');
    setSuccess('');

    if (!title.trim() || !message.trim()) {
      setError('Title and message are required');
      return;
    }

    if (!sendToAll && selectedMerchants.length === 0) {
      setError('Select at least one merchant or choose "Send to All"');
      return;
    }

    try {
      setLoading(true);
      const user = await base44.auth.me();

      await base44.entities.MerchantNotification.create({
        title: title.trim(),
        message: message.trim(),
        type: notificationType,
        priority,
        target_merchants: sendToAll ? [] : selectedMerchants,
        is_dismissible: isDismissible,
        action_text: actionText.trim() || null,
        action_url: actionUrl.trim() || null,
        expires_at: expiresAt || null,
        created_by: user.id,
        created_by_email: user.email,
      });

      setSuccess(`Notification sent to ${sendToAll ? 'all merchants' : `${selectedMerchants.length} merchant(s)`}`);
      
      // Reset form
      setTitle('');
      setMessage('');
      setActionText('');
      setActionUrl('');
      setExpiresAt('');
      setSelectedMerchants([]);
      setSendToAll(true);
      setNotificationType('info');
      setPriority('normal');
      setIsDismissible(true);

      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error sending notification:', err);
      setError('Failed to send notification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Custom Notification</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Title and Message */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notification title"
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="message">Message *</Label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Notification message"
              className="w-full h-24 p-2 border rounded-md text-sm"
              disabled={loading}
            />
          </div>
        </div>

        {/* Type and Priority */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="type">Type</Label>
            <Select value={notificationType} onValueChange={setNotificationType}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="announcement">Announcement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger id="priority">
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

        {/* Action Button */}
        <div className="space-y-3">
          <Label>Action Button (Optional)</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={actionText}
              onChange={(e) => setActionText(e.target.value)}
              placeholder="Button text"
              disabled={loading}
            />
            <Input
              value={actionUrl}
              onChange={(e) => setActionUrl(e.target.value)}
              placeholder="Button URL"
              disabled={loading}
            />
          </div>
        </div>

        {/* Recipients */}
        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={sendToAll}
                onChange={() => setSendToAll(true)}
                disabled={loading}
              />
              <span className="text-sm">Send to All Merchants</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={!sendToAll}
                onChange={() => setSendToAll(false)}
                disabled={loading}
              />
              <span className="text-sm">Select Merchants</span>
            </label>
          </div>

          {!sendToAll && (
            <div className="space-y-2">
              <Label>Choose Merchants</Label>
              <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                {merchants.length === 0 ? (
                  <p className="text-sm text-gray-500">No merchants found</p>
                ) : (
                  merchants.map(merchant => (
                    <label key={merchant.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedMerchants.includes(merchant.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleAddMerchant(merchant.id);
                          } else {
                            handleRemoveMerchant(merchant.id);
                          }
                        }}
                        disabled={loading}
                      />
                      {merchant.business_name}
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {selectedMerchants.length > 0 && !sendToAll && (
            <div className="space-y-2">
              <Label>Selected ({selectedMerchants.length})</Label>
              <div className="flex flex-wrap gap-2">
                {selectedMerchants.map(merchantId => {
                  const merchant = merchants.find(m => m.id === merchantId);
                  return (
                    <Badge key={merchantId} variant="secondary" className="flex items-center gap-1">
                      {merchant?.business_name}
                      <button
                        onClick={() => handleRemoveMerchant(merchantId)}
                        className="ml-1 hover:text-red-600"
                        disabled={loading}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Other Options */}
        <div className="space-y-3 border-t pt-4">
          <div>
            <Label htmlFor="expires">Expiration Date (Optional)</Label>
            <Input
              id="expires"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              disabled={loading}
            />
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isDismissible}
              onChange={(e) => setIsDismissible(e.target.checked)}
              disabled={loading}
            />
            <span className="text-sm">Allow merchants to dismiss notification</span>
          </label>
        </div>

        {/* Send Button */}
        <div className="flex gap-2 justify-end border-t pt-4">
          <Button
            onClick={handleSend}
            disabled={loading}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Notification
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}