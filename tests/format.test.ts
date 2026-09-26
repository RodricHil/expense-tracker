import { describe, expect, it } from "vitest";
import { calendarToday, formatAmount, inclusiveDays, localDateKey } from "../lib/format";

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
