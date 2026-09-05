// pricing.js
// Frontend adapter that maps merchant settings + a compliance rule + a (possibly
// unknown) card funding type into the UI-shaped totals the POS, customer display,
// and pricing settings expect. Delegates all monetary math to the integer-cents
// fee engine in feeEngine.js — never recomputes fees itself.

import {
  PROGRAM, FUNDING, ENGINE_VERSION,
  toCents, fmt,
  computeDualPricing, computeCreditSurcharge, evaluateRule,
} from './feeEngine';

export { PROGRAM, FUNDING, ENGINE_VERSION };

// Resolve the merchant's pricing program from their settings.
export function resolveProgram(settings) {
  const ps = settings?.pricing_and_surcharge || {};
  if (!ps.enable_dual_pricing) return PROGRAM.STANDARD;
  return ps.pricing_mode === 'cash_discount' ? PROGRAM.DUAL_PRICING : PROGRAM.SURCHARGE;
}

// The verified processor pricing used for exact fee recovery. Only components an
// admin has approved as eligible per-transaction acceptance costs should be
// included here. Today that is the openTILL Payments (Stripe) processing rate +
// platform fee (percentage) and the per-transaction flat.
export function processorConfig(settings) {
  const stripe = settings?.payment_gateways?.stripe || {};
  const ratePercent = (stripe.processing_rate_percent ?? 2.9) + (stripe.platform_fee_percent ?? 0.5);
  const flatDollars = stripe.processing_flat_fee ?? 0.3;
  return {
    rateDecimal: ratePercent / 100,
    flatCents: toCents(flatDollars),
  };
}

// The rate actually applied to the customer as the card-price adjustment.
// When sync_with_payments is true this equals the real processing rate (exact
// fee recovery). When false, the merchant's configured cc_surcharge_percent is
// used, so they can charge more or less than their actual processing cost.
export function surchargeRateDecimal(settings) {
  const ps = settings?.pricing_and_surcharge || {};
  if (ps.sync_with_payments === false) {
    const custom = parseFloat(ps.cc_surcharge_percent);
    if (!isNaN(custom) && custom >= 0) return custom / 100;
  }
  return processorConfig(settings).rateDecimal;
}

// Build the cap set (in cents) for a given base amount from the compliance rule
// plus any merchant-configured lower cap. Each cap is the max adjustment allowed
// by that authority for this transaction; the engine applies the minimum.
function buildCaps(rule, baseCents, settings) {
  const caps = {};
  if (rule && typeof rule === 'object') {
    if (typeof rule.maximum_state_pct === 'number') caps.state = Math.round(baseCents * rule.maximum_state_pct / 100);
    if (typeof rule.maximum_network_pct === 'number') caps.network = Math.round(baseCents * rule.maximum_network_pct / 100);
    if (typeof rule.maximum_acquirer_pct === 'number') caps.acquirer = Math.round(baseCents * rule.maximum_acquirer_pct / 100);
    if (typeof rule.maximum_processor_pct === 'number') caps.processor = Math.round(baseCents * rule.maximum_processor_pct / 100);
  }
  const merchantCapPct = settings?.pricing_and_surcharge?.merchant_cap_pct;
  if (typeof merchantCapPct === 'number' && !isNaN(merchantCapPct)) {
    caps.merchant = Math.round(baseCents * merchantCapPct / 100);
  }
  return caps;
}

function labelFor(program, allowed, adjustmentCents) {
  if (!adjustmentCents || adjustmentCents <= 0) return '';
  if (program === PROGRAM.DUAL_PRICING) return 'Card Price Adjustment';
  if (program === PROGRAM.SURCHARGE) return allowed ? 'Credit Card Surcharge' : '';
  return '';
}

function toUI(r) {
  return {
    program: r.program,
    allowed: !!r.allowed,
    failClosedReason: r.failClosedReason ?? null,
    limitingRule: r.limitingRule ?? null,
    cashTotal: fmt(r.cashPriceCents),
    cardTotal: fmt(r.cardPriceCents),
    surchargeAmount: fmt(r.adjustmentCents),
    surchargeLabel: labelFor(r.program, r.allowed, r.adjustmentCents),
    merchantAbsorbed: fmt(r.merchantAbsorbedCents || 0),
    processingFee: fmt(r.processingFeeCents || 0),
    merchantNet: fmt(r.merchantNetCents || 0),
    pendingSurcharge: fmt(r.pendingAdjustmentCents || 0),
    calcVersion: r.calcVersion || ENGINE_VERSION,
  };
}

// Main entry point. Returns the UI-shaped pricing result for one transaction.
// cardFundingType defaults to UNKNOWN — at cart time the funding type is not yet
// known, so a credit-card surcharge program fails closed (no adjustment) until a
// processor confirms a credit transaction. Dual pricing discloses the card price
// up front and applies to all cards, so it is not gated on funding type.
export function buildPricing({
  settings,
  rule,
  cardFundingType = FUNDING.UNKNOWN,
  subtotalDollars,
  taxDollars = 0,
  tipDollars = 0,
}) {
  const program = resolveProgram(settings);
  const { rateDecimal, flatCents } = processorConfig(settings);
  const adjRateDecimal = surchargeRateDecimal(settings);
  const subtotalCents = toCents(subtotalDollars);
  const taxCents = toCents(taxDollars);
  const tipCents = toCents(tipDollars);
  const baseCents = subtotalCents + taxCents;
  const caps = buildCaps(rule, baseCents, settings);

  if (program === PROGRAM.DUAL_PRICING) {
    return toUI(computeDualPricing({ subtotalCents, taxCents, tipCents, rateDecimal, flatCents, rule, caps, surchargeRateDecimal: adjRateDecimal }));
  }
  if (program === PROGRAM.SURCHARGE) {
    return toUI(computeCreditSurcharge({ subtotalCents, taxCents, tipCents, rateDecimal, flatCents, rule, caps, cardFundingType, surchargeRateDecimal: adjRateDecimal }));
  }
  // Standard pricing — same price for every payment method.
  return toUI({
    program: PROGRAM.STANDARD,
    allowed: true,
    failClosedReason: null,
    cashPriceCents: baseCents + tipCents,
    cardPriceCents: baseCents + tipCents,
    adjustmentCents: 0,
    processingFeeCents: 0,
    merchantNetCents: baseCents,
    merchantAbsorbedCents: 0,
    limitingRule: null,
    pendingAdjustmentCents: 0,
    calcVersion: ENGINE_VERSION,
  });
}