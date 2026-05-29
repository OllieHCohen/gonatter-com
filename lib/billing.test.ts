import { describe, it, expect } from "vitest";
import { settle, authorisedAmount, isRateValid, minRateMinorPerMinute } from "./billing";

const FEE = 25;

describe("authorisedAmount (pre-auth = block × rate)", () => {
  it("50p/min, 30-min block → £15.00", () => {
    expect(authorisedAmount(50, 30)).toBe(1500);
  });
  it("50p/min, 60-min block → £30.00", () => {
    expect(authorisedAmount(50, 60)).toBe(3000);
  });
});

describe("settle — spec §14.2-F worked example", () => {
  it("rate 50p/min, 750s connected → capture £6.25, fee £1.56, listener £4.69", () => {
    const r = settle({ billableSeconds: 750, rateMinor: 50, blockMinutes: 30, feePercent: FEE });
    expect(r.charge).toBe(true);
    expect(r.finalAmountMinor).toBe(625);
    expect(r.platformFeeMinor).toBe(156);
    expect(r.listenerAmountMinor).toBe(469);
  });
});

describe("settle — edge cases", () => {
  it("< 30s → cancelled, no charge", () => {
    const r = settle({ billableSeconds: 29, rateMinor: 50, blockMinutes: 30, feePercent: FEE });
    expect(r.charge).toBe(false);
    expect(r.finalAmountMinor).toBe(0);
  });

  it(">= 30s and < 60s → 1-minute minimum", () => {
    const r = settle({ billableSeconds: 45, rateMinor: 50, blockMinutes: 30, feePercent: FEE });
    expect(r.charge).toBe(true);
    expect(r.chargeSeconds).toBe(60);
    expect(r.finalAmountMinor).toBe(50); // round(60*50/60)
  });

  it("exactly 30s → charged with 1-min minimum (boundary)", () => {
    const r = settle({ billableSeconds: 30, rateMinor: 50, blockMinutes: 30, feePercent: FEE });
    expect(r.charge).toBe(true);
    expect(r.chargeSeconds).toBe(60);
  });

  it("runs to block end → full block captured, never more than authorised", () => {
    const r = settle({ billableSeconds: 99999, rateMinor: 50, blockMinutes: 30, feePercent: FEE });
    expect(r.finalAmountMinor).toBe(authorisedAmount(50, 30)); // 1500
    expect(r.finalAmountMinor).toBeLessThanOrEqual(authorisedAmount(50, 30));
  });

  it("60-min block, full run → £30 captured", () => {
    const r = settle({ billableSeconds: 3600, rateMinor: 50, blockMinutes: 60, feePercent: FEE });
    expect(r.finalAmountMinor).toBe(3000);
    expect(r.platformFeeMinor).toBe(750);
    expect(r.listenerAmountMinor).toBe(2250);
  });

  it("fee + listener split always reconciles to final", () => {
    for (const s of [60, 123, 750, 1799, 1800]) {
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
