import { describe, it, expect } from "vitest";
import { settle, authorisedAmount, isRateValid, minRateMinorPerMinute, FREE_CALL_SECONDS } from "./billing";

const FEE = 25;

describe("authorisedAmount (pre-auth = block × rate)", () => {
  it("50p/min, 30-min block → £15.00", () => {
    expect(authorisedAmount(50, 30)).toBe(1500);
  });
  it("50p/min, 60-min block → £30.00", () => {
    expect(authorisedAmount(50, 60)).toBe(3000);
  });
});

describe("settle — first 2 minutes free", () => {
  it("rate 50p/min, 750s connected → 630s billed, capture £5.25", () => {
    const r = settle({ billableSeconds: 750, rateMinor: 50, blockMinutes: 30, feePercent: FEE });
    expect(r.charge).toBe(true);
    expect(r.chargeSeconds).toBe(750 - FREE_CALL_SECONDS);
    expect(r.finalAmountMinor).toBe(525); // round(630*50/60)
    expect(r.platformFeeMinor).toBe(131);
    expect(r.listenerAmountMinor).toBe(394);
  });

  it("under 2 minutes → completely free", () => {
    for (const s of [0, 29, 60, 119, 120]) {
      const r = settle({ billableSeconds: s, rateMinor: 50, blockMinutes: 30, feePercent: FEE });
      expect(r.charge).toBe(false);
      expect(r.finalAmountMinor).toBe(0);
    }
  });

  it("just past the free window → only the extra seconds are billed", () => {
    const r = settle({ billableSeconds: 121, rateMinor: 50, blockMinutes: 30, feePercent: FEE });
    expect(r.charge).toBe(true);
    expect(r.chargeSeconds).toBe(1);
    expect(r.finalAmountMinor).toBe(1); // round(1*50/60)
  });

  it("runs to block end → block minus free window, never more than authorised", () => {
    const r = settle({ billableSeconds: 99999, rateMinor: 50, blockMinutes: 30, feePercent: FEE });
    expect(r.chargeSeconds).toBe(30 * 60 - FREE_CALL_SECONDS);
    expect(r.finalAmountMinor).toBe(1400); // round(1680*50/60)
    expect(r.finalAmountMinor).toBeLessThanOrEqual(authorisedAmount(50, 30));
  });

  it("60-min block, full run → £29.00 captured (2 free minutes off £30)", () => {
    const r = settle({ billableSeconds: 3600, rateMinor: 50, blockMinutes: 60, feePercent: FEE });
    expect(r.finalAmountMinor).toBe(2900);
    expect(r.platformFeeMinor).toBe(725);
    expect(r.listenerAmountMinor).toBe(2175);
  });

  it("fee + listener split always reconciles to final", () => {
    for (const s of [121, 180, 750, 1799, 1800]) {
      const r = settle({ billableSeconds: s, rateMinor: 73, blockMinutes: 30, feePercent: FEE });
      expect(r.platformFeeMinor + r.listenerAmountMinor).toBe(r.finalAmountMinor);
    }
  });
});

describe("rate validation (>= £10/hr-equivalent for GBP)", () => {
  it("minimum GBP per-minute rate is 17p", () => {
    expect(minRateMinorPerMinute("gbp", 10)).toBe(17);
  });
  it("rejects 16p, accepts 17p", () => {
    expect(isRateValid(16, "gbp", 10)).toBe(false);
    expect(isRateValid(17, "gbp", 10)).toBe(true);
    expect(isRateValid(50, "gbp", 10)).toBe(true);
  });
});
