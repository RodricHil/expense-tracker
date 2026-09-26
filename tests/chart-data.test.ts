import { describe, expect, it } from "vitest";
import { buildSpendingSeries } from "../lib/chart-data";
const date = (value: string) => new Date(`${value}T00:00:00Z`);

describe("spending charts", () => {
  it("sorts months chronologically rather than alphabetically", () => {
    const result = buildSpendingSeries([{ date: "2026-02-10", amount: 20 }, { date: "2026-01-10", amount: 10 }], date("2026-01-01"), date("2026-03-31"), "Monthly");
    expect(result.map((row) => [row.key, row.amount])).toEqual([["2026-01", 10], ["2026-02", 20], ["2026-03", 0]]);
  });
  it("does not merge the same day in different years", () => {
    const result = buildSpendingSeries([{ date: "2025-01-01", amount: 10 }, { date: "2026-01-01", amount: 25 }], date("2025-01-01"), date("2026-01-01"), "Daily");
    expect(result[0].amount).toBe(10);
    expect(result.at(-1)?.amount).toBe(25);
    expect(result[0].label).not.toBe(result.at(-1)?.label);
  });
  it("keeps zero-spend days and leap day in the chart", () => {
    const result = buildSpendingSeries([{ date: "2024-03-01", amount: 5 }], date("2024-02-28"), date("2024-03-01"), "Daily");
    expect(result.map((row) => [row.key, row.amount])).toEqual([["2024-02-28", 0], ["2024-02-29", 0], ["2024-03-01", 5]]);
  });
  it("groups a week spanning two years into one Monday-based period", () => {
    const result = buildSpendingSeries([{ date: "2025-12-31", amount: 2.1 }, { date: "2026-01-01", amount: 3.2 }], date("2025-12-29"), date("2026-01-04"), "Weekly");
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("2025-12-29");
    expect(result[0].amount).toBe(5.3);
  });
  it("excludes days outside the selected range even in the same month", () => {
    const result = buildSpendingSeries([{ date: "2026-01-01", amount: 100 }, { date: "2026-01-16", amount: 50 }], date("2026-01-15"), date("2026-01-20"), "Monthly");
    expect(result[0].amount).toBe(50);
  });
});
