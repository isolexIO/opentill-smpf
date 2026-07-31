import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin + '_opentill_mobile_salt_v1');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { token, pin } = body;

    if (!token) {
      return Response.json({ success: false, error: 'Invalid link', code: 'invalid_link' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    const stations = await base44.asServiceRole.entities.Station.filter({ mobile_station_token: token });
    if (!stations || stations.length === 0) {
      return Response.json({ success: false, error: 'Invalid link', code: 'invalid_link' }, { status: 404 });
    }

    const station = stations[0];

    if (!station.is_active) {
      return Response.json({ success: false, error: 'This station is currently inactive.', code: 'station_inactive' }, { status: 403 });
    }

    if (!station.mobile_access_enabled) {
      return Response.json({ success: false, error: 'Mobile access is not enabled for this station.', code: 'mobile_disabled' }, { status: 403 });
    }

    if (station.mobile_token_expires_at && new Date(station.mobile_token_expires_at) < new Date()) {
      return Response.json({ success: false, error: 'This link has expired. Please ask the cashier to generate a new link.', code: 'link_expired' }, { status: 403 });
    }

    // Check max mobile connections — but first mark stale sessions offline.
    // A session is considered stale if its last heartbeat is older than 2 minutes,
    // meaning the mobile device has likely closed the tab or lost connectivity
    // without cleanly disconnecting.
    if (station.max_mobile_connections && station.max_mobile_connections > 0) {
      try {
        const activeSessions = await base44.asServiceRole.entities.DeviceSession.filter({
          merchant_id: station.merchant_id,
          station_id: station.station_id,
          device_type: 'mobile',
          status: 'online'
        });

        if (activeSessions && activeSessions.length > 0) {
          const staleThreshold = new Date(Date.now() - 2 * 60 * 1000); // 2 minutes
          const staleSessions = activeSessions.filter(s => {
            if (!s.last_heartbeat) return true;
            return new Date(s.last_heartbeat) < staleThreshold;
          });

          // Mark stale sessions offline so they don't block new connections
          for (const s of staleSessions) {
            try {
              await base44.asServiceRole.entities.DeviceSession.update(s.id, { status: 'offline' });
            } catch (e) {}
          }

          const trulyActive = activeSessions.length - staleSessions.length;
          if (trulyActive >= station.max_mobile_connections) {
            return Response.json({ success: false, error: 'Maximum number of mobile devices are connected. Please try again later.', code: 'max_connections' }, { status: 429 });
          }
        }
      } catch (e) {
        console.warn('resolveMobileStation: Could not check active sessions:', e);
      }
    }

    const merchants = await base44.asServiceRole.entities.Merchant.filter({ id: station.merchant_id });
    if (!merchants || merchants.length === 0) {
      return Response.json({ success: false, error: 'Merchant not found', code: 'merchant_not_found' }, { status: 404 });
    }
    const merchant = merchants[0];

    if (merchant.status === 'inactive' || merchant.status === 'suspended' || merchant.status === 'cancelled') {
      return Response.json({ success: false, error: 'This merchant account is not active.', code: 'merchant_inactive' }, { status: 403 });
    }

    // Strip secrets from settings but keep payment-relevant config for mobile
    const safeSettings = { ...(merchant.settings || {}) };
    // Card is enabled by default; only an explicit payment_gateways.stripe.enabled === false disables it.
    // (enable_opentill_payments defaults to false in the schema, so it cannot be treated as an explicit disable.)
    const stripeExplicitlyOff = merchant.settings?.payment_gateways?.stripe?.enabled === false;
    const stripeEnabled = !stripeExplicitlyOff;
    safeSettings.solana_pay = merchant.settings?.solana_pay || {};
    safeSettings.is_demo = !!merchant.is_demo;
    safeSettings.stripe_enabled = stripeEnabled;
    safeSettings.stripe_rates = {
      processing_rate_percent: merchant.settings?.payment_gateways?.stripe?.processing_rate_percent ?? 2.9,
      processing_flat_fee: merchant.settings?.payment_gateways?.stripe?.processing_flat_fee ?? 0.3,
      platform_fee_percent: merchant.settings?.payment_gateways?.stripe?.platform_fee_percent ?? 0.5,
    };
    delete safeSettings.payment_gateways;
    delete safeSettings.hardware;

    // If PIN is required and no pin provided, return pin_required without full data
    if (station.mobile_pin_hash && !pin) {
      return Response.json({
        success: true,
        pin_required: true,
        station: {
          name: station.name,
          station_id: station.station_id
        },
        merchant: {
          business_name: merchant.business_name
        }
      });
    }

    // Verify PIN if required
    if (station.mobile_pin_hash && pin) {
      const pinHash = await hashPin(pin);
      if (pinHash !== station.mobile_pin_hash) {
        try {
          await base44.asServiceRole.entities.AuditLog.create({
            merchant_id: station.merchant_id,
            action_type: 'device_registered',
            severity: 'warning',
            actor_id: 'mobile_display',
            actor_email: 'mobile_display',
            description: `Failed mobile PIN attempt for station "${station.name}"`,
            target_entity: station.id
          });
        } catch (e) {}
        return Response.json({ success: false, error: 'Incorrect PIN', code: 'invalid_pin' }, { status: 401 });
      }
    }

    // Update last mobile connection time
    try {
      await base44.asServiceRole.entities.Station.update(station.id, {
        last_mobile_connection_at: new Date().toISOString()
      });
    } catch (e) {}

    // Log successful access
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        merchant_id: station.merchant_id,
        action_type: 'device_registered',
        severity: 'info',
        actor_id: 'mobile_display',
        actor_email: 'mobile_display',
        description: `Mobile display accessed station "${station.name}"`,
        target_entity: station.id
      });
    } catch (e) {}

    // Fetch products and departments with service role (no user session on mobile)
    let products: any[] = [];
    let departments: any[] = [];
    try {
      const allProducts = await base44.asServiceRole.entities.Product.filter({
        merchant_id: station.merchant_id,
        is_active: true
      });
      // Strip heavy fields
      products = (allProducts || []).map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        image_url: p.image_url,
        department: p.department,
        department_id: p.department_id,
        barcode: p.barcode,
        pos_mode: p.pos_mode,
        ebt_eligible: p.ebt_eligible,
        age_restricted: p.age_restricted,
        minimum_age: p.minimum_age,
        modifiers: p.modifiers,
        tippable: p.tippable,
      }));
    } catch (e) {
      console.warn('resolveMobileStation: Could not load products:', e);
    }
    try {
      const allDepts = await base44.asServiceRole.entities.Department.filter({
        merchant_id: station.merchant_id
      });
      departments = (allDepts || []).map(d => ({
        id: d.id,
        name: d.name,
        display_order: d.display_order || 0,
      }));
      departments.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    } catch (e) {
      console.warn('resolveMobileStation: Could not load departments:', e);
    }

    // Fetch customers for mobile POS
    let customers: any[] = [];
    try {
      const allCustomers = await base44.asServiceRole.entities.Customer.filter({
        merchant_id: station.merchant_id
      });
      customers = (allCustomers || []).map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        loyalty_points: c.loyalty_points || 0,
      }));
    } catch (e) {
      console.warn('resolveMobileStation: Could not load customers:', e);
    }

    return Response.json({
      success: true,
      pin_required: false,
      station: {
        id: station.id,
        station_id: station.station_id,
        name: station.name,
        layout_type: station.layout_type,
        merchant_id: station.merchant_id,
        mobile_display_timeout: station.mobile_display_timeout ?? 8,
      },
      merchant: {
        id: merchant.id,
        business_name: merchant.business_name,
        display_name: merchant.display_name,
        is_demo: !!merchant.is_demo,
        settings: safeSettings,
      },
      products,
      departments,
      customers
    });
  } catch (error) {
    console.error('resolveMobileStation error:', error);
    return Response.json({ success: false, error: 'Failed to resolve station link', details: error.message }, { status: 500 });
  }
});