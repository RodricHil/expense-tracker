import { describe, expect, it } from "vitest";
import Investment from "../models/Investment";
const record = { userId: "owner", name: "Fund", type: "sip", status: "active", currency: "₹", investedCents: 100, currentValueCents: null, contributionCents: null, frequency: "none", startDate: "2026-01-01", maturityDate: null };
describe("investment persistence", () => {
  it("accepts absent valuation and contribution without converting them to zero", async () => {
    const document = new Investment(record);
    await expect(document.validate()).resolves.toBeUndefined();
    expect(document.currentValueCents).toBeNull(); expect(document.contributionCents).toBeNull();
  });
  it("rejects fractional cents at the model boundary", async () => {
    await expect(new Investment({ ...record, investedCents: 1.5 }).validate()).rejects.toThrow();
  });
});
