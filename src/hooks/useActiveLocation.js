import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const STORAGE_KEY = 'opentill_active_location_id';

/**
 * Tracks the merchant's currently-selected Location and loads all of the
 * merchant's locations. The active location id is persisted in localStorage
 * so it survives reloads. Returns a "shared" pseudo-location when multi-
 * location isn't in use yet (no Location records exist) so callers can treat
 * the shared catalog uniformly.
 */
export function useActiveLocation(merchantId) {
  const [locations, setLocations] = useState([]);
  const [activeLocationId, setActiveLocationId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load all locations for this merchant
  const loadLocations = useCallback(async () => {
    if (!merchantId) {
      setLocations([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const list = await base44.entities.Location.filter(
        { merchant_id: merchantId, is_active: true },
        'sort_order',
        100
      );
      setLocations(list || []);

      // Restore persisted active location, else pick the default, else first
      const persisted = (() => { try { return localStorage.getItem(STORAGE_KEY); } catch (_) { return null; } })();
      let chosen = persisted && (list || []).some((l) => l.id === persisted)
        ? persisted
        : null;
      if (!chosen) {
        const def = (list || []).find((l) => l.is_default);
        chosen = def ? def.id : (list && list.length > 0 ? list[0].id : null);
      }
      setActiveLocationId(chosen);
      if (chosen) { try { localStorage.setItem(STORAGE_KEY, chosen); } catch (_) {} }
    } catch (e) {
      console.warn('useActiveLocation: failed to load locations', e);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }, [merchantId]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  const switchLocation = useCallback((locationId) => {
    setActiveLocationId(locationId);
    if (locationId) { try { localStorage.setItem(STORAGE_KEY, locationId); } catch (_) {} }
    else { try { localStorage.removeItem(STORAGE_KEY); } catch (_) {} }
  }, []);

  const activeLocation = locations.find((l) => l.id === activeLocationId) || null;

  // When there are no Location records, the merchant operates in "shared"
  // single-location mode — expose that as a synthetic location so downstream
  // code can branch on catalog_mode uniformly.
  const effectiveLocation = activeLocation || (locations.length === 0
    ? { id: null, name: 'Main Location', catalog_mode: 'shared', is_default: true }
    : null);

  return {
    locations,
    activeLocation: effectiveLocation,
    activeLocationId: effectiveLocation?.id || null,
    switchLocation,
    reloadLocations: loadLocations,
    loading,
    isMultiLocation: locations.length > 0,
  };
}