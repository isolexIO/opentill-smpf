import { useEffect, useRef } from 'react';

// Browser (Web Notifications API) push helper. Fires a native browser
// notification for each newly-seen in-app notification, once per user.
// Permission is requested explicitly from the Notification Center UI —
// we do not auto-prompt on load (browsers often block that).

const SHOWN_KEY = (uid) => `smpf_browser_push_shown_${uid || 'anon'}`;

function loadShown(uid) {
  try {
    return new Set(JSON.parse(localStorage.getItem(SHOWN_KEY(uid)) || '[]'));
  } catch {
    return new Set();
  }
}

function saveShown(uid, set) {
  try {
    localStorage.setItem(SHOWN_KEY(uid), JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

export function getNotificationPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

/**
 * useBrowserNotifications — given the current user's visible notifications,
 * fire a native browser notification for each one not yet shown. No-ops
 * until the user has granted notification permission.
 */
export function useBrowserNotifications(notifications, userId) {
  const shownRef = useRef(new Set());

  useEffect(() => {
    shownRef.current = loadShown(userId);
  }, [userId]);

  useEffect(() => {
    if (!userId || !notifications || notifications.length === 0) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    const shown = shownRef.current;
    let changed = false;

    for (const n of notifications) {
      if (shown.has(n.id)) continue;
      shown.add(n.id);
      changed = true;
      try {
        const note = new Notification(n.title, {
          body: n.message,
          tag: n.id,
          icon: '/favicon.svg',
        });
        if (n.action_url) {
          note.onclick = () => {
            window.focus();
            window.open(n.action_url, '_blank');
            note.close();
          };
        }
      } catch {
        /* ignore */
      }
    }

    if (changed) saveShown(userId, shown);
  }, [notifications, userId]);
}