import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Check, Trash2 } from 'lucide-react';

export default function DealerNotifications({ dealerId }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [dealerId]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const notifs = await base44.entities.MerchantNotification.filter({ dealer_id: dealerId });
      setNotifications(notifs || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notifId) => {
    try {
      await base44.entities.MerchantNotification.update(notifId, { read: true });
      loadNotifications();
    } catch (error) {
      console.error('Error marking notification:', error);
    }
  };

  const handleDelete = async (notifId) => {
    try {
      await base44.entities.MerchantNotification.delete(notifId);
      loadNotifications();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  if (loading) return <div className="text-center py-8">Loading notifications...</div>;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>System and merchant alerts</CardDescription>
            </div>
            {unreadCount > 0 && (
              <Badge>{unreadCount} unread</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                All caught up! No new notifications.
              </div>
            ) : (
              notifications.map(notif => (
                <div key={notif.id} className="border rounded-lg p-4 flex gap-4">
                  <div className="flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-blue-500 mt-1" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{notif.title || 'Notification'}</p>
                    <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {notif.created_date ? new Date(notif.created_date).toLocaleDateString() : ''}
                    </p>
                  </div>
                  <div className="flex-shrink-0 flex gap-2">
                    {!notif.read && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkAsRead(notif.id)}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(notif.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}