import { describe, expect, it } from "vitest";
import { amountToCents, investmentSchema, investmentQuerySchema, isInsurance, type InvestmentInput } from "../lib/investments";
const record: InvestmentInput = { name: "Long-term fund", type: "sip", status: "active", currency: "₹", investedCents: 100000, currentValueCents: null, contributionCents: 10000, frequency: "monthly", startDate: "2026-01-01", maturityDate: null };
describe("investment validation and privacy", () => {
  it("keeps unknown current values distinct from zero", () => {
    expect(investmentSchema.parse(record).currentValueCents).toBeNull();
    expect(investmentSchema.parse({ ...record, currentValueCents: 0 }).currentValueCents).toBe(0);
  });
  it.each(["accountNumber", "policyNumber", "folioNumber", "pan", "password", "userId"])("rejects unsupported field %s", (field) => {
    expect(investmentSchema.safeParse({ ...record, [field]: "sensitive" }).success).toBe(false);
  });
  it.each(["1234 5678 9012", "ABCDE1234F", "owner@example.test"])("rejects obvious sensitive nicknames", (name) => {
    expect(investmentSchema.safeParse({ ...record, name }).success).toBe(false);
  });
  it("stores only nonnegative integer minor units and limits amounts", () => {
    for (const investedCents of [-1, 0.1, Infinity, 100_000_000_001]) expect(investmentSchema.safeParse({ ...record, investedCents }).success).toBe(false);
    expect(amountToCents("0.29")).toBe(29);
    expect(amountToCents("1234.56")).toBe(123456);
    expect(amountToCents("")).toBeNull();
    expect(amountToCents("1.001")).toBeNaN();
  });
  it("does not let insurance values inflate investment returns", () => {
    expect(isInsurance("health-insurance")).toBe(true);
    expect(isInsurance("life-insurance")).toBe(true);
    expect(investmentSchema.safeParse({ ...record, type: "health-insurance", currentValueCents: 100 }).success).toBe(false);
    expect(investmentSchema.safeParse({ ...record, type: "life-insurance" }).success).toBe(true);
  });
  it("requires a contribution for a recurring schedule and validates date order", () => {
    expect(investmentSchema.safeParse({ ...record, contributionCents: null }).success).toBe(false);
    expect(investmentSchema.safeParse({ ...record, maturityDate: "2025-01-01" }).success).toBe(false);
    expect(investmentSchema.safeParse({ ...record, startDate: "2026-02-30" }).success).toBe(false);
  });
  it("bounds and validates filter input", () => {
    expect(investmentQuerySchema.safeParse({ currency: "₹", page: "-1" }).success).toBe(false);
    expect(investmentQuerySchema.safeParse({ currency: "₹", type: { $ne: null } }).success).toBe(false);
    expect(investmentQuerySchema.safeParse({ currency: "₹", q: "a".repeat(81) }).success).toBe(false);
  });
});
