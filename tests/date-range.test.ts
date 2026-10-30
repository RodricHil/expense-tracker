import { describe, expect, it } from "vitest";
import { MAX_RANGE_DAYS, defaultFilterRange, isAllowedRange } from "../lib/date-range";
import { inclusiveDays } from "../lib/format";
import { expenseQuerySchema } from "../lib/validation";

describe("date-range boundaries", () => {
  it("resets to a current, inclusive 30-day range", () => {
    const range = defaultFilterRange();
    expect(inclusiveDays(range.startDate, range.endDate)).toBe(30);
    expect(range.startDate.getUTCHours()).toBe(0);
    expect(range.endDate.getUTCHours()).toBe(23);
  });
  it("accepts the inclusive boundary and rejects longer or inverted spans", () => {
    const start = new Date("2020-01-01");
    const boundary = new Date(start.getTime() + (MAX_RANGE_DAYS - 1) * 86400000);
    expect(isAllowedRange(start, boundary)).toBe(true);
    expect(isAllowedRange(start, new Date(boundary.getTime() + 86400000))).toBe(false);
    expect(isAllowedRange(boundary, start)).toBe(false);
  });
  it("rejects oversized ranges at the API trust boundary", () => {
    expect(expenseQuerySchema.safeParse({ from: "1900-01-01", to: "2200-01-01" }).success).toBe(false);
    expect(expenseQuerySchema.safeParse({ from: "2026-01-01", to: "2026-10-30" }).success).toBe(true);
  });
});
