import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const MOBILE_SALT = Deno.env.get('JWT_SECRET') ? `mobile:${Deno.env.get('JWT_SECRET')}` : '';
const PBKDF2_ITERATIONS = 200_000;

// Slow, salted KDF so that even if the salt is disclosed, brute-forcing short
// numeric PINs is computationally infeasible (mitigates static-salt weakness).
async function hashPin(pin: string): Promise<string> {
  if (!MOBILE_SALT) throw new Error('JWT_SECRET not configured');
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(MOBILE_SALT), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { action, station_id, pin, config } = body;

    if (!action || !station_id) {
      return Response.json({ success: false, error: 'action and station_id are required' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    let user;
    try {
      user = await base44.auth.me();
    } catch (e) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!user || (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'root_admin' && user.role !== 'dealer_admin')) {
      return Response.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const stations = await base44.asServiceRole.entities.Station.filter({ id: station_id });
    if (!stations || stations.length === 0) {
      return Response.json({ success: false, error: 'Station not found' }, { status: 404 });
    }

    const station = stations[0];

    // Merchant ownership check (non-super-admins must own the merchant)
    if (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'root_admin') {
      if (user.merchant_id !== station.merchant_id) {
        return Response.json({ success: false, error: 'Forbidden: You do not have access to this station' }, { status: 403 });
      }
    }

    let updates: Record<string, any> = {};
    let responseData: Record<string, any> = {};

    switch (action) {
      case 'generate_token': {
        if (station.mobile_station_token) {
          return Response.json({ success: false, error: 'Token already exists. Use regenerate instead.' }, { status: 400 });
        }
        const token = crypto.randomUUID();
        const now = new Date().toISOString();
        updates.mobile_station_token = token;
        updates.mobile_token_created_at = now;
        updates.mobile_access_enabled = true;
        responseData.token = token;
        responseData.mobile_token_created_at = now;
        break;
      }

      case 'regenerate_token': {
        const token = crypto.randomUUID();
        const now = new Date().toISOString();
        updates.mobile_station_token = token;
        updates.mobile_token_created_at = now;
        updates.mobile_token_expires_at = null;
        responseData.token = token;
        responseData.mobile_token_created_at = now;

        // Disconnect all existing mobile sessions for this station
        try {
          await base44.asServiceRole.entities.DeviceSession.updateMany(
            { merchant_id: station.merchant_id, station_id: station.station_id, device_type: 'mobile', status: 'online' },
            { $set: { status: 'offline', forced_disconnect: true, disconnected_at: now } }
          );
        } catch (e) {
          console.warn('manageStationMobile: Could not disconnect mobile sessions:', e);
        }
        break;
      }

      case 'toggle_mobile_access': {
        updates.mobile_access_enabled = config?.enabled ?? !station.mobile_access_enabled;
        // If disabling, disconnect all mobile sessions immediately
        if (!updates.mobile_access_enabled) {
          try {
            await base44.asServiceRole.entities.DeviceSession.updateMany(
              { merchant_id: station.merchant_id, station_id: station.station_id, device_type: 'mobile', status: 'online' },
              { $set: { status: 'offline', forced_disconnect: true, disconnected_at: new Date().toISOString() } }
            );
          } catch (e) {
            console.warn('manageStationMobile: Could not disconnect mobile sessions:', e);
          }
        }
        break;
      }

      case 'set_pin': {
        if (pin) {
          if (pin.length < 4 || pin.length > 8) {
            return Response.json({ success: false, error: 'PIN must be 4-8 characters' }, { status: 400 });
          }
          updates.mobile_pin_hash = await hashPin(pin);
        } else {
          updates.mobile_pin_hash = null;
        }
        break;
      }

      case 'update_config': {
        if (config) {
          if (config.mobile_display_timeout !== undefined) updates.mobile_display_timeout = config.mobile_display_timeout;
          if (config.max_mobile_connections !== undefined) updates.max_mobile_connections = config.max_mobile_connections;
          if (config.allow_mobile_cashier_controls !== undefined) updates.allow_mobile_cashier_controls = config.allow_mobile_cashier_controls;
          if (config.customer_display_id !== undefined) updates.customer_display_id = config.customer_display_id;
          if (config.mobile_token_expires_at !== undefined) updates.mobile_token_expires_at = config.mobile_token_expires_at || null;
        }
        break;
      }

      case 'disconnect_all_mobile': {
        try {
          await base44.asServiceRole.entities.DeviceSession.updateMany(
            { merchant_id: station.merchant_id, station_id: station.station_id, device_type: 'mobile', status: 'online' },
            { $set: { status: 'offline', forced_disconnect: true, disconnected_at: new Date().toISOString() } }
          );
        } catch (e) {
          console.warn('manageStationMobile: Could not disconnect mobile sessions:', e);
        }
        break;
      }

      default:
        return Response.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }

    if (Object.keys(updates).length > 0) {
      await base44.asServiceRole.entities.Station.update(station.id, updates);
    }

    // Audit log
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        merchant_id: station.merchant_id,
        action_type: 'settings_changed',
        severity: 'info',
        actor_id: user.id,
        actor_email: user.email,
        actor_role: user.role,
        description: `Mobile POS setting '${action}' for station "${station.name}"`,
        target_entity: station.id
      });
    } catch (e) {}

    return Response.json({ success: true, ...responseData });
  } catch (error) {
    console.error('manageStationMobile error:', error);
    return Response.json({ success: false, error: 'Failed to update mobile settings', details: error.message }, { status: 500 });
  }
});