import { base44 } from '@/api/base44Client';

/**
 * Writes an AuditLog entry attributed to the active POS staff member so that
 * orders, discounts, voids, and refunds are tied to the operating cashier.
 *
 * Fire-and-forget: audit failures are swallowed so they never block a POS action.
 */
export async function logStaffAction({
  merchantId,
  stationId,
  stationName,
  staff,
  actionType,
  description,
  metadata = {},
  severity = 'info',
}) {
  try {
    await base44.entities.AuditLog.create({
      merchant_id: merchantId || null,
      action_type: actionType,
      severity,
      actor_id: staff?.id || null,
      actor_email: staff?.email || null,
      actor_role: staff?.role || 'cashier',
      description: description || '',
      metadata: {
        station_id: stationId || null,
        station_name: stationName || null,
        staff_name: staff?.full_name || null,
        ...metadata,
      },
    });
  } catch (e) {
    console.warn('POS audit log failed:', e?.message);
  }
}