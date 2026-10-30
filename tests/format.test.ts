import { describe, expect, it } from "vitest";
import { calendarToday, formatAmount, formatDateRange, inclusiveDays, localDateKey } from "../lib/format";

describe("calendar dates and money", () => {
  it("keeps exactly two decimals, including whole amounts and zero", () => {
    expect(formatAmount(0)).toBe("0.00");
    expect(formatAmount(1200)).toBe("1,200.00");
    expect(formatAmount(12.345)).toBe("12.35");
  });
  it("uses local calendar components after midnight rather than the UTC date", () => {
    const date = new Date(2026, 8, 27, 0, 1);
    expect(localDateKey(date)).toBe("2026-09-27");
    expect(calendarToday(date).toISOString()).toBe("2026-09-27T00:00:00.000Z");
  });
  it("counts inclusive calendar days without adding an extra day for 23:59", () => {
    expect(inclusiveDays(new Date("2026-09-27T00:00:00Z"), new Date("2026-09-27T23:59:59.999Z"))).toBe(1);
    expect(inclusiveDays(new Date("2026-08-29T00:00:00Z"), new Date("2026-09-27T23:59:59.999Z"))).toBe(30);
  });
});

describe("compact date ranges", () => {
  it("avoids repeating the month and year within one month", () => {
    expect(formatDateRange(new Date("2026-10-01"), new Date("2026-10-30"))).toBe("1–30 Oct 2026");
  });
  it("retains both years when crossing a year boundary", () => {
    expect(formatDateRange(new Date("2025-12-30"), new Date("2026-01-05"))).toBe("30 Dec 2025–5 Jan 2026");
  });
  it("shows a single date for a one-day range", () => {
    expect(formatDateRange(new Date("2026-10-30T00:00:00Z"), new Date("2026-10-30T23:59:59Z"))).toBe("30 Oct 2026");
  });
});
