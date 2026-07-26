import { useState, useEffect, useCallback } from 'react';

const STORAGE_PREFIX = 'posActiveStaff';

function storageKey(stationId, merchantId) {
  return `${STORAGE_PREFIX}_${merchantId || 'demo'}_${stationId || 'default'}`;
}

/**
 * Manages the "active staff" operating a POS station.
 *
 * The station session (merchant login) is persistent — this hook only tracks
 * which cashier is currently clocked in at the terminal. Locking clears the
 * active staff (showing the PIN lock screen) WITHOUT tearing down the station
 * session, enabling fast staff switches.
 */
export function useActiveStaff(stationId, merchantId) {
  const [activeStaff, setActiveStaff] = useState(null);
  const [isLocked, setIsLocked] = useState(true);

  // Restore active staff when the station context becomes available / changes
  useEffect(() => {
    if (!stationId) return;
    try {
      const raw = localStorage.getItem(storageKey(stationId, merchantId));
      if (raw) {
        const staff = JSON.parse(raw);
        if (staff && staff.id) {
          setActiveStaff(staff);
          setIsLocked(false);
          return;
        }
      }
    } catch (e) {
      // ignore malformed snapshot
    }
    setActiveStaff(null);
    setIsLocked(true);
  }, [stationId, merchantId]);

  const setStaff = useCallback((staff) => {
    setActiveStaff(staff || null);
    setIsLocked(!staff);
    if (!stationId) return;
    try {
      if (staff) {
        localStorage.setItem(storageKey(stationId, merchantId), JSON.stringify(staff));
      } else {
        localStorage.removeItem(storageKey(stationId, merchantId));
      }
    } catch (e) {
      // ignore storage errors
    }
  }, [stationId, merchantId]);

  const lock = useCallback(() => {
    setActiveStaff(null);
    setIsLocked(true);
    if (!stationId) return;
    try {
      localStorage.removeItem(storageKey(stationId, merchantId));
    } catch (e) {
      // ignore storage errors
    }
  }, [stationId, merchantId]);

  return { activeStaff, isLocked, lock, setStaff };
}