import { describe, expect, it } from "vitest";
import { popoverPosition } from "../lib/popover";

const rect = (left: number, top: number, right: number, bottom: number) => ({ left, top, right, bottom }) as DOMRect;

describe("popover containment", () => {
  it("keeps a wide calendar within the dialog instead of the viewport", () => {
    const position = popoverPosition(rect(700, 300, 920, 346), 360, 410, 1440, 900, rect(400, 150, 960, 750));
    expect(position.left).toBeGreaterThanOrEqual(412);
    expect(position.left + position.width).toBeLessThanOrEqual(948);
    expect(position.top + position.maxHeight).toBeLessThanOrEqual(738);
  });
  it("opens upward when there is more room above the field", () => {
    const position = popoverPosition(rect(60, 600, 280, 646), 360, 410, 390, 844, rect(0, 100, 390, 800));
    expect(position.top + position.maxHeight).toBeLessThanOrEqual(596);
    expect(position.left + position.width).toBeLessThanOrEqual(378);
  });
  it("does not force a minimum height beyond a short dialog", () => {
    const position = popoverPosition(rect(40, 40, 180, 86), 360, 410, 320, 200, rect(0, 0, 220, 120));
    expect(position.top).toBeGreaterThanOrEqual(12);
    expect(position.top + position.maxHeight).toBeLessThanOrEqual(108);
  });
});
