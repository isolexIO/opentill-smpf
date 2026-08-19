import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, Info, AlertCircle, CheckCircle, AlertTriangle, Megaphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function NotificationBanner() {
  const [notifications, setNotifications] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const dismissedKey = (uid) => `smpf_dismissed_notifications_${uid || 'anon'}`;

  const getLocalDismissed = (uid) => {
    try {
      return new Set(JSON.parse(localStorage.getItem(dismissedKey(uid)) || '[]'));
    } catch {
      return new Set();
    }
  };

  const addLocalDismissed = (uid, notifId) => {
    try {
      const set = getLocalDismissed(uid);
      set.add(notifId);
      localStorage.setItem(dismissedKey(uid), JSON.stringify([...set]));
    } catch {
      // localStorage may be unavailable; local dismiss just won't persist
    }
  };

  useEffect(() => {
    loadNotifications();
    // Poll for new notifications every 60 seconds
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const pinUserJSON = localStorage.getItem('pinLoggedInUser');
      let currentUser = null;

      if (pinUserJSON) {
        try {
          currentUser = JSON.parse(pinUserJSON);
        } catch (e) {
          console.error('Error parsing user:', e);
        }
      }

      if (!currentUser) {
        try {
          currentUser = await base44.auth.me();
        } catch (e) {
          console.log('No authenticated user for notifications');
          setLoading(false);
          return;
        }
      }

      if (!currentUser) {
        setLoading(false);
        return;
      }

      setUser(currentUser);

      // Load active notifications with error handling
      const now = new Date().toISOString();
      let allNotifications = [];
      
      try {
        allNotifications = await base44.entities.MerchantNotification.filter({
          is_active: true
        });
      } catch (err) {
        console.error('Error loading notifications:', err);
        // Silently fail - notifications are not critical
        setLoading(false);
        return;
      }

      // Filter notifications for this merchant
      const localDismissed = getLocalDismissed(currentUser.id);
      const relevantNotifications = allNotifications.filter(notification => {
        // Check if expired
        if (notification.expires_at && notification.expires_at < now) return false;

        // Check if dismissed by this user (applies to all notifications,
        // so a user-closed popup does not reappear on the next poll)
        if (notification.dismissed_by?.includes(currentUser.id)) return false;

        // Also check local dismissals — the server update is admin-only and
        // silently fails for regular merchant users.
        if (localDismissed.has(notification.id)) return false;

        // Check if targeted to this merchant (or all merchants)
        if (!notification.target_merchants || notification.target_merchants.length === 0) return true;
        return notification.target_merchants.includes(currentUser.merchant_id);
      });

      // Sort by priority
      const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
      relevantNotifications.sort((a, b) => 
        priorityOrder[a.priority] - priorityOrder[b.priority]
      );

      setNotifications(relevantNotifications);

      // Mark as viewed
      for (const notification of relevantNotifications) {
        if (!notification.read_by?.includes(currentUser.id)) {
          try {
            await base44.entities.MerchantNotification.update(notification.id, {
              read_by: [...(notification.read_by || []), currentUser.id],
              view_count: (notification.view_count || 0) + 1
            });
          } catch (err) {
            console.log('Could not update notification read status');
          }
        }
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      // Don't show error to user - notifications are not critical
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async (notification) => {
    // Always remove the popup locally so the user can close any notification.
    setNotifications(prev => prev.filter(n => n.id !== notification.id));
    // Persist locally so the poll doesn't re-show it.
    addLocalDismissed(user?.id, notification.id);
    if (!user) return;

    // Best-effort server-side dismiss; this is admin-only and will fail
    // silently for regular merchant users — the local record above covers them.
    try {
      await base44.entities.MerchantNotification.update(notification.id, {
        dismissed_by: [...(notification.dismissed_by || []), user.id]
      });
    } catch (error) {
      // Expected for non-admin users; local dismissal already handled.
    }
  };

  // Auto-dismiss only dismissible notifications after 4 seconds.
  // Non-dismissible popups stay until the user closes them.
  useEffect(() => {
    const dismissible = notifications.filter(n => n.is_dismissible);
    if (dismissible.length === 0) return;

    const timers = dismissible.map(notification => {
      return setTimeout(() => {
        handleDismiss(notification);
      }, 4000);
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [notifications]);

  const getIcon = (type) => {
    switch (type) {
      case 'info':
        return <Info className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'error':
        return <AlertCircle className="w-5 h-5" />;
      case 'announcement':
        return <Megaphone className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getVariant = (type) => {
    switch (type) {
      case 'error':
        return 'destructive';
      default:
        return 'default';
    }
  };

  if (loading || notifications.length === 0) return null;

  return (
    <div className="fixed top-20 left-0 right-0 z-40 px-4 space-y-2">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-4xl mx-auto"
          >
            <Alert variant={getVariant(notification.type)} className="shadow-lg">
              <div className="flex items-start gap-3">
                {getIcon(notification.type)}
                <div className="flex-1">
                  <AlertTitle className="font-semibold">{notification.title}</AlertTitle>
                  <AlertDescription className="mt-1">
                    {notification.message}
                  </AlertDescription>
                  {notification.action_url && notification.action_text && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => window.open(notification.action_url, '_blank')}
                    >
                      {notification.action_text}
                    </Button>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => handleDismiss(notification)}
                  aria-label="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </Alert>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}