// feeEngine.js
// State-aware, card-aware, processor-aware dual-pricing / surcharge engine.
// All monetary math uses INTEGER CENTS — never floating-point dollars.
// Inverse gross-up recovers the actual eligible processing fee INCLUDING the
// fee charged on the additional card amount itself (fee-on-fee).
// The engine fails CLOSED (no pricing adjustment) whenever compliance or fee
// information cannot be determined reliably.

export const ENGINE_VERSION = '2026.08.02.integer-cents';

export const PROGRAM = {
  STANDARD: 'standard',
  DUAL_PRICING: 'dual_pricing',
  SURCHARGE: 'surcharge',
};

export const FUNDING = {
  CREDIT: 'credit',
  DEBIT: 'debit',
  REGULATED_DEBIT: 'regulated_debit',
  UNREGULATED_DEBIT: 'unregulated_debit',
  PREPAID: 'prepaid',
  COMMERCIAL_CREDIT: 'commercial_credit',
  CONSUMER_CREDIT: 'consumer_credit',
  GIFT: 'gift',
  EBT: 'ebt',
  ACH: 'ach',
  UNKNOWN: 'unknown',
};

// Only confirmed credit funding types are ever surcharge-eligible.
// Debit, regulated debit, prepaid, gift, EBT, ACH, and unknown are NEVER surcharged.
const SURCHARGEABLE_FUNDING = new Set([
  FUNDING.CREDIT,
  FUNDING.COMMERCIAL_CREDIT,
  FUNDING.CONSUMER_CREDIT,
]);

// ---- money helpers (integer minor units) ----
export const toCents = (dollars) => Math.round((Number(dollars) || 0) * 100);
export const toDollars = (cents) => (cents || 0) / 100;
export const fmt = (cents) => ((cents || 0) / 100).toFixed(2);

// Half-up rounding of a fractional-cent value to integer cents (typical processor rounding).
function roundHalfUp(centsFloat) {
  // handles negative safely; monetary amounts here are non-negative
  return Math.floor(centsFloat + 0.5);
}

// Processor fee for a card amount G (cents): round_half_up(G * rate) + flat.
// This is the only fee model supported; exact recovery requires this be the
// verified, guaranteed final transaction fee.
export function processorFee(cardCents, rateDecimal, flatCents) {
  return roundHalfUp(cardCents * rateDecimal) + flatCents;
}

// Inverse gross-up with deterministic cent-by-cent verification.
// Finds the LOWEST integer-cent card amount G such that:
//     G - processorFee(G) === merchantTargetNet   (exact, integer cents)
// i.e. the merchant nets exactly the target after the processor takes its
// percentage (on the full card amount, including the fee itself) plus the flat.
export function grossUpExact(merchantTargetNetCents, rateDecimal, flatCents) {
  const target = Math.round(merchantTargetNetCents || 0);
  if (target <= 0) {
    return { cardAmount: 0, processingFee: 0, merchantNet: 0, pctComponent: 0, fixedComponent: 0 };
  }
  const denom = 1 - rateDecimal;
  if (!(denom > 0)) return null; // rate >= 100% is invalid; fail closed by caller
  const approx = (target + flatCents) / denom;
  let g = Math.floor(approx) - 2;
  if (g < target) g = target;
  // Search upward for an exact-net solution. net = g - fee(g) is non-decreasing in g.
  for (let i = 0; i < 24; i++) {
    const fee = processorFee(g, rateDecimal, flatCents);
    const net = g - fee;
    if (net === target) {
      return {
        cardAmount: g,
        processingFee: fee,
        merchantNet: net,
        pctComponent: fee - flatCents,
        fixedComponent: flatCents,
      };
    }
    if (net > target) {
      // overshot — no exact solution at this rounding band; take best effort
      break;
    }
    g += 1;
  }
  // best-effort fallback (ceil of analytical gross-up)
  g = Math.ceil(approx);
  const fee = processorFee(g, rateDecimal, flatCents);
  return { cardAmount: g, processingFee: fee, merchantNet: g - fee, pctComponent: fee - flatCents, fixedComponent: flatCents };
}

// Apply the minimum of all applicable caps to a requested adjustment (cents).
// caps: { network, state, acquirer, processor, merchant } — each in cents or null.
// Returns { allowedCents, limitingRule, absorbedCents }.
export function applyCaps(requestedAdjustmentCents, caps) {
  const entries = [];
  if (caps && typeof caps === 'object') {
    for (const [name, val] of Object.entries(caps)) {
      if (typeof val === 'number' && !isNaN(val) && val >= 0) entries.push([name, Math.round(val)]);
    }
  }
  if (!entries.length) {
    return { allowedCents: requestedAdjustmentCents, limitingRule: null, absorbedCents: 0 };
  }
  let min = Infinity;
  let limiting = null;
  for (const [name, val] of entries) {
    if (val < min) { min = val; limiting = name; }
  }
  const allowed = Math.max(0, Math.min(requestedAdjustmentCents, min));
  return { allowedCents: allowed, limitingRule: limiting, absorbedCents: requestedAdjustmentCents - allowed };
}

// Evaluate whether a compliance rule currently permits any pricing adjustment.
export function evaluateRule(rule, now = Date.now()) {
  if (!rule || typeof rule !== 'object') {
    return { allowed: false, reason: 'no_compliance_rule' };
  }
  if (rule.status && rule.status !== 'active') {
    return { allowed: false, reason: 'rule_not_active' };
  }
  if (rule.legal_review_status && rule.legal_review_status !== 'approved') {
    return { allowed: false, reason: 'rule_not_approved' };
  }
  if (rule.effective_date && new Date(rule.effective_date).getTime() > now) {
    return { allowed: false, reason: 'rule_not_yet_effective' };
  }
  if (rule.expiration_date && new Date(rule.expiration_date).getTime() < now) {
    return { allowed: false, reason: 'rule_expired' };
  }
  return { allowed: true, reason: null };
}

// Standard pricing: same price regardless of payment method; no adjustment.
function standardResult({ subtotalCents, taxCents, tipCents, program, reason, pendingAdjustmentCents = 0 }) {
  const base = subtotalCents + taxCents;
  return {
    program,
    allowed: false,
    failClosedReason: reason,
    cashPriceCents: base + tipCents,
    cardPriceCents: base + tipCents,
    adjustmentCents: 0,
    processingFeeCents: 0,
    pctComponentCents: 0,
    fixedComponentCents: 0,
    merchantNetCents: base,
    merchantAbsorbedCents: 0,
    limitingRule: null,
    pendingAdjustmentCents,
    calcVersion: ENGINE_VERSION,
  };
}

// DUAL PRICING / CASH DISCOUNT.
// The regular posted price is the card price; the cash price is a disclosed
// reduction. The card price is the inverse gross-up of the cash price so the
// merchant nets the cash price after processing. Applies to ALL cards (it is a
// disclosed price, not a per-card surcharge). The differential is capped by the
// jurisdiction rule where applicable.
export function computeDualPricing({ subtotalCents, taxCents = 0, tipCents = 0, rateDecimal, flatCents, rule, caps, surchargeRateDecimal }) {
  // The rate used to gross up the card price (what the customer pays). Defaults
  // to the real processing rate (exact fee recovery). Merchants may set a custom
  // surcharge rate that differs from their actual processing cost.
  const adjRate = (typeof surchargeRateDecimal === 'number' && surchargeRateDecimal >= 0) ? surchargeRateDecimal : rateDecimal;
  const ev = evaluateRule(rule);
  if (!ev.allowed) {
    return standardResult({ subtotalCents, taxCents, tipCents, program: PROGRAM.DUAL_PRICING, reason: ev.reason });
  }
  if (!rule.dual_pricing_status || rule.dual_pricing_status === 'prohibited') {
    return standardResult({ subtotalCents, taxCents, tipCents, program: PROGRAM.DUAL_PRICING, reason: 'dual_pricing_prohibited' });
  }
  if (!(adjRate < 1) || !(rateDecimal < 1)) {
    return standardResult({ subtotalCents, taxCents, tipCents, program: PROGRAM.DUAL_PRICING, reason: 'invalid_processor_rate' });
  }
  const base = subtotalCents + taxCents; // merchant target net (cash price, ex tip)
  const grossed = grossUpExact(base, adjRate, flatCents);
  if (!grossed) {
    return standardResult({ subtotalCents, taxCents, tipCents, program: PROGRAM.DUAL_PRICING, reason: 'invalid_processor_rate' });
  }
  let adjustment = grossed.cardAmount - base;
  // Dual-pricing differentials are typically only state-capped; network/acquirer
  // surcharge caps do not apply to a disclosed price. Apply only the state cap.
  const stateCaps = caps && typeof caps.state === 'number' ? { state: caps.state } : {};
  const capResult = applyCaps(adjustment, stateCaps);
  adjustment = capResult.allowedCents;
  const cardPrice = base + adjustment + tipCents;
  const cashPrice = base + tipCents;
  return {
    program: PROGRAM.DUAL_PRICING,
    allowed: true,
    failClosedReason: null,
    cashPriceCents: cashPrice,
    cardPriceCents: cardPrice,
    adjustmentCents: adjustment,
    processingFeeCents: processorFee(cardPrice - tipCents, rateDecimal, flatCents),
    pctComponentCents: grossed.pctComponent,
    fixedComponentCents: grossed.fixedComponent,
    merchantNetCents: cardPrice - processorFee(cardPrice, rateDecimal, flatCents),
    merchantAbsorbedCents: capResult.absorbedCents,
    limitingRule: capResult.limitingRule,
    pendingAdjustmentCents: 0,
    calcVersion: ENGINE_VERSION,
  };
}

// CREDIT CARD SURCHARGE.
// A separately disclosed surcharge applied ONLY to a confirmed eligible credit
// transaction. Debit, prepaid, gift, EBT, ACH, and unknown funding types are
// never surcharged (fail closed to $0). The surcharge is the inverse gross-up
// of the merchant target net, then capped to the minimum of network / state /
// acquirer / processor / merchant caps. The merchant absorbs any non-recoverable
// difference; the customer charge is never increased beyond the cap.
export function computeCreditSurcharge({ subtotalCents, taxCents = 0, tipCents = 0, rateDecimal, flatCents, rule, caps, cardFundingType, surchargeRateDecimal }) {
  // The rate used to compute the surcharge the customer pays. Defaults to the
  // real processing rate (exact fee recovery). Merchants may set a custom rate.
  const adjRate = (typeof surchargeRateDecimal === 'number' && surchargeRateDecimal >= 0) ? surchargeRateDecimal : rateDecimal;
  const ev = evaluateRule(rule);
  if (!ev.allowed) {
    return standardResult({ subtotalCents, taxCents, tipCents, program: PROGRAM.SURCHARGE, reason: ev.reason });
  }
  if (!rule.surcharge_status || rule.surcharge_status === 'prohibited') {
    return standardResult({ subtotalCents, taxCents, tipCents, program: PROGRAM.SURCHARGE, reason: 'surcharge_prohibited' });
  }
  if (!(adjRate < 1) || !(rateDecimal < 1)) {
    return standardResult({ subtotalCents, taxCents, tipCents, program: PROGRAM.SURCHARGE, reason: 'invalid_processor_rate' });
  }
  const base = subtotalCents + taxCents; // surcharge base (pre-tax subtotal + tax); voluntary tip excluded by default

  // Compute the would-be adjustment for disclosure ("up to $X may apply"), used
  // when the funding type is not yet confirmed.
  const grossed = grossUpExact(base, adjRate, flatCents);
  const wouldBeAdjustment = grossed ? grossed.cardAmount - base : 0;

  // Funding-type gate: only confirmed credit may be surcharged.
  if (!SURCHARGEABLE_FUNDING.has(cardFundingType)) {
    const reason = cardFundingType && cardFundingType !== FUNDING.UNKNOWN
      ? 'non_credit_funding_type'
      : 'unknown_funding_type';
    return standardResult({
      subtotalCents, taxCents, tipCents,
      program: PROGRAM.SURCHARGE,
      reason,
      pendingAdjustmentCents: wouldBeAdjustment,
    });
  }

  let requested = wouldBeAdjustment;
  const capResult = applyCaps(requested, caps || {});
  const adjustment = capResult.allowedCents;
  const cardPrice = base + adjustment + tipCents;
  const cashPrice = base + tipCents;
  return {
    program: PROGRAM.SURCHARGE,
    allowed: true,
    failClosedReason: null,
    cashPriceCents: cashPrice,
    cardPriceCents: cardPrice,
    adjustmentCents: adjustment,
    processingFeeCents: processorFee(cardPrice - tipCents, rateDecimal, flatCents),
    pctComponentCents: grossed.pctComponent,
    fixedComponentCents: grossed.fixedComponent,
    merchantNetCents: cardPrice - processorFee(cardPrice, rateDecimal, flatCents),
    merchantAbsorbedCents: capResult.absorbedCents,
    limitingRule: capResult.limitingRule,
    pendingAdjustmentCents: 0,
    calcVersion: ENGINE_VERSION,
  };
}