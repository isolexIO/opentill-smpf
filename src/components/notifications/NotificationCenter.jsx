import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bell,
  Info,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Megaphone,
  BellOff,
  ExternalLink,
  CheckCheck,
  X,
} from 'lucide-react';
import {
  useBrowserNotifications,
  requestNotificationPermission,
  getNotificationPermission,
} from '@/lib/useBrowserNotifications';

const READ_KEY = (uid) => `smpf_notif_read_${uid || 'anon'}`;
const DISMISS_KEY = (uid) => `smpf_notif_dismissed_${uid || 'anon'}`;

function loadSet(key) {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) || '[]'));
  } catch {
    return new Set();
  }
}

function saveSet(key, set) {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState(new Set());
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const [pushPermission, setPushPermission] = useState(getNotificationPermission());

  const uid = user?.id;

  useEffect(() => {
    if (!uid) return;
    setReadIds(loadSet(READ_KEY(uid)));
    setDismissedIds(loadSet(DISMISS_KEY(uid)));
  }, [uid]);

  const loadNotifications = async () => {
    try {
      let currentUser = null;
      const pinUserJSON = localStorage.getItem('pinLoggedInUser');
      if (pinUserJSON) {
        try {
          currentUser = JSON.parse(pinUserJSON);
        } catch {
          /* ignore */
        }
      }
      if (!currentUser) {
        try {
          currentUser = await base44.auth.me();
        } catch {
          setLoading(false);
          return;
        }
      }
      if (!currentUser) {
        setLoading(false);
        return;
      }
      setUser(currentUser);

      let list = [];
      try {
        list = await base44.entities.MerchantNotification.filter({ is_active: true });
      } catch {
        setLoading(false);
        return;
      }

      const now = new Date().toISOString();
      const dismissed = loadSet(DISMISS_KEY(currentUser.id));
      const visible = list.filter((n) => {
        if (n.expires_at && n.expires_at < now) return false;
        if (dismissed.has(n.id)) return false;
        if (n.dismissed_by?.includes(currentUser.id)) return false;
        return true;
      });
      visible.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      setNotifications(visible);
    } catch (e) {
      console.error('NotificationCenter load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fire native browser notifications for newly-seen items (only when
  // permission has been granted).
  useBrowserNotifications(notifications, uid);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const markRead = (id) => {
    const s = new Set(readIds);
    s.add(id);
    setReadIds(s);
    saveSet(READ_KEY(uid), s);
  };

  const markAllRead = () => {
    const s = new Set(readIds);
    notifications.forEach((n) => s.add(n.id));
    setReadIds(s);
    saveSet(READ_KEY(uid), s);
  };

  const dismiss = (id) => {
    const s = new Set(dismissedIds);
    s.add(id);
    setDismissedIds(s);
    saveSet(DISMISS_KEY(uid), s);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    // Best-effort server dismiss (admin-only; silently fails otherwise)
    const current = notifications.find((n) => n.id === id);
    try {
      base44.entities.MerchantNotification.update(id, {
        dismissed_by: [...(current?.dismissed_by || []), uid],
      });
    } catch {
      /* ignore */
    }
  };

  const enablePush = async () => {
    const p = await requestNotificationPermission();
    setPushPermission(p);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'announcement':
        return <Megaphone className="w-4 h-4 text-purple-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Bell className="w-4 h-4" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-1">{unreadCount} new</Badge>
              )}
            </SheetTitle>
            <div className="flex items-center gap-1">
              {pushPermission !== 'granted' && pushPermission !== 'unsupported' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={enablePush}
                  disabled={pushPermission === 'denied'}
                  title={
                    pushPermission === 'denied'
                      ? 'Browser notifications are blocked in your browser settings'
                      : 'Enable browser notifications'
                  }
                >
                  <BellOff className="w-4 h-4 mr-1" />
                  {pushPermission === 'denied' ? 'Blocked' : 'Enable'}
                </Button>
              )}
              {notifications.length > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllRead}>
                  <CheckCheck className="w-4 h-4 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="divide-y">
            {loading ? (
              <div className="p-8 text-center text-sm text-gray-500">
                Loading notifications…
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                You're all caught up.
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = !readIds.has(n.id);
                return (
                  <div
                    key={n.id}
                    className={`p-3 hover:bg-gray-50 ${isUnread ? 'bg-blue-50/40' : ''}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">{getIcon(n.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm text-gray-900 truncate">
                            {n.title}
                          </p>
                          <span className="text-[10px] text-gray-400 shrink-0">
                            {timeAgo(n.created_date)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5 whitespace-pre-wrap">
                          {n.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {n.action_url && n.action_text && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => window.open(n.action_url, '_blank')}
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              {n.action_text}
                            </Button>
                          )}
                          {isUnread && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => markRead(n.id)}
                            >
                              Mark read
                            </Button>
                          )}
                          {n.is_dismissible !== false && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-gray-500"
                              onClick={() => dismiss(n.id)}
                            >
                              <X className="w-3 h-3 mr-1" />
                              Dismiss
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}