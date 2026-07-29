// Advertisement display rules engine.
// Evaluates targeting, scheduling, and frequency-cap rules for an ad.

export function getAdContext() {
  let merchantId = null;
  let dealerId = null;
  try {
    const u = JSON.parse(localStorage.getItem('pinLoggedInUser') || '{}');
    merchantId = u.merchant_id || null;
    dealerId = u.dealer_id || null;
  } catch {
    // ignore
  }
  return { merchantId, dealerId, now: new Date() };
}

function toMinutes(hhmm) {
  if (!hhmm) return null;
  const parts = String(hhmm).split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

/**
 * Evaluate whether an ad should be shown given the current context.
 * context: { merchantId, dealerId, now, sessionViews, dailyViews }
 */
export function evaluateAdRules(ad, context = {}) {
  const {
    merchantId,
    dealerId,
    now = new Date(),
    sessionViews = {},
    dailyViews = {},
  } = context;

  // Merchant targeting
  if (ad.target_merchant_ids && ad.target_merchant_ids.length > 0) {
    if (!merchantId || !ad.target_merchant_ids.includes(merchantId)) return false;
  }

  // Dealer targeting
  if (ad.target_dealer_ids && ad.target_dealer_ids.length > 0) {
    if (!dealerId || !ad.target_dealer_ids.includes(dealerId)) return false;
  }

  // Days of week (0=Sun..6=Sat)
  if (ad.days_of_week && ad.days_of_week.length > 0) {
    if (!ad.days_of_week.includes(now.getDay())) return false;
  }

  // Time-of-day window
  const startMin = toMinutes(ad.start_time_of_day);
  const endMin = toMinutes(ad.end_time_of_day);
  if (startMin !== null || endMin !== null) {
    const curMin = now.getHours() * 60 + now.getMinutes();
    if (startMin !== null && endMin !== null) {
      if (startMin <= endMin) {
        if (curMin < startMin || curMin > endMin) return false;
      } else {
        // wraps midnight (e.g. 22:00 -> 02:00)
        if (curMin < startMin && curMin > endMin) return false;
      }
    } else if (startMin !== null) {
      if (curMin < startMin) return false;
    } else {
      if (curMin > endMin) return false;
    }
  }

  // Frequency caps
  const sViews = sessionViews[ad.id] || 0;
  const dViews = dailyViews[ad.id] || 0;
  if (ad.max_views_per_session && ad.max_views_per_session > 0 && sViews >= ad.max_views_per_session) return false;
  if (ad.max_views_per_day && ad.max_views_per_day > 0 && dViews >= ad.max_views_per_day) return false;

  return true;
}

/**
 * Filter and sort ads by the rules engine. Higher priority first,
 * then lower display_order first.
 */
export function pickAds(ads, context) {
  return ads
    .filter((ad) => evaluateAdRules(ad, context))
    .sort((a, b) => {
      const p = (b.priority || 0) - (a.priority || 0);
      if (p !== 0) return p;
      return (a.display_order || 0) - (b.display_order || 0);
    });
}

const dailyKey = (adId) => `ad_views_${adId}_${new Date().toDateString()}`;

export function getDailyViewCount(adId) {
  try {
    return parseInt(localStorage.getItem(dailyKey(adId)) || '0', 10);
  } catch {
    return 0;
  }
}

export function incrementDailyViewCount(adId) {
  try {
    const cur = getDailyViewCount(adId);
    localStorage.setItem(dailyKey(adId), String(cur + 1));
  } catch {
    // ignore
  }
}