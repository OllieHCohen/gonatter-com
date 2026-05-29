// Server-authoritative billing math (spec §5.5.6, §14.2-F). Pure + unit-tested.
// All amounts are integer minor units (e.g. pence). Time in seconds.

export const NO_CHARGE_THRESHOLD_SECONDS = 30; // connected < 30s → no charge
export const MIN_BILLABLE_SECONDS = 60; // else apply a 1-minute minimum
export const REVIEW_UNLOCK_SECONDS = 180; // reviews unlock after >= 3 min

export type SettleInput = {
  billableSeconds: number; // both-connected → first-disconnect (server-measured)
  rateMinor: number; // per-minute rate in minor units
  blockMinutes: 30 | 60;
  feePercent: number; // platform fee, e.g. 25
};

export type SettleResult = {
  charge: boolean;
  chargeSeconds: number; // seconds actually billed (after min + cap)
  finalAmountMinor: number; // captured from the pre-auth (<= authorised)
  platformFeeMinor: number;
  listenerAmountMinor: number;
};

// Pre-authorised block amount = the hard cap / long-stop.
export function authorisedAmount(rateMinor: number, blockMinutes: number): number {
  return Math.round(rateMinor * blockMinutes);
}

export function settle({ billableSeconds, rateMinor, blockMinutes, feePercent }: SettleInput): SettleResult {
  const maxBillable = blockMinutes * 60;
  const effective = Math.min(Math.max(0, Math.floor(billableSeconds)), maxBillable);

  // Connected < 30s → cancel, no charge.
  if (effective < NO_CHARGE_THRESHOLD_SECONDS) {
    return { charge: false, chargeSeconds: 0, finalAmountMinor: 0, platformFeeMinor: 0, listenerAmountMinor: 0 };
  }

  // 1-minute minimum, never exceeding the block cap.
  const chargeSeconds = Math.min(Math.max(effective, MIN_BILLABLE_SECONDS), maxBillable);

  // final_amount = round(seconds * rate / 60), guaranteed <= authorised.
  const finalAmountMinor = Math.round((chargeSeconds * rateMinor) / 60);
  const platformFeeMinor = Math.round((finalAmountMinor * feePercent) / 100);
  const listenerAmountMinor = finalAmountMinor - platformFeeMinor;

  return { charge: true, chargeSeconds, finalAmountMinor, platformFeeMinor, listenerAmountMinor };
}

// Minimum per-minute rate enforcing £10/hr-equivalent for GBP (§5.2.5).
export function minRateMinorPerMinute(currency: string, minGbpPerHour: number): number {
  if (currency.toLowerCase() !== "gbp") return 1; // non-GBP: just require > 0 at MVP
  return Math.ceil((minGbpPerHour * 100) / 60);
}

export function isRateValid(rateMinor: number, currency: string, minGbpPerHour: number): boolean {
  return Number.isInteger(rateMinor) && rateMinor >= minRateMinorPerMinute(currency, minGbpPerHour);
}
