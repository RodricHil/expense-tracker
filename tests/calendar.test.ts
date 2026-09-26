import { describe, expect, it } from "vitest";
import { calendarCells, isDateKey } from "../lib/calendar";
import { popoverPosition } from "../lib/popover";

describe("custom calendar", () => {
  it("rejects impossible or incomplete typed dates", () => {
    expect(isDateKey("2026-02-29")).toBe(false);
    expect(isDateKey("2024-02-29")).toBe(true);
    expect(isDateKey("2026-04-31")).toBe(false);
    expect(isDateKey("2026-9-2")).toBe(false);
    expect(isDateKey("2026-09-")).toBe(false);
  });
  it("renders six Monday-based weeks across a year boundary", () => {
    const cells = calendarCells(2026, 0);
    expect(cells).toHaveLength(42);
    expect(cells[0].key).toBe("2025-12-29");
    expect(cells[0].current).toBe(false);
    expect(cells.filter((cell) => cell.current)).toHaveLength(31);
    expect(cells.at(-1)?.key).toBe("2026-02-08");
  });
  it("shows 29 February only in a leap year", () => {
    expect(calendarCells(2024, 1).filter((cell) => cell.current)).toHaveLength(29);
    expect(calendarCells(2026, 1).filter((cell) => cell.current)).toHaveLength(28);
  });
});

describe("popup placement", () => {
  const rect = (left: number, top: number, bottom: number) => ({ left, top, bottom }) as DOMRect;
  it("keeps a calendar within a narrow screen", () => {
    const result = popoverPosition(rect(220, 100, 144), 360, 410, 320, 700);
    expect(result.left).toBe(12);
    expect(result.width).toBe(296);
    expect(result.top).toBe(148);
  });
  it("opens upwards near the bottom of a screen", () => {
    const result = popoverPosition(rect(20, 600, 644), 300, 250, 800, 700);
    expect(result.top + result.maxHeight).toBeLessThan(600);
  });
});
