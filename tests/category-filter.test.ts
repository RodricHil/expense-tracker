import { describe, expect, it } from "vitest";
import { categoryFilterChoices, categoryFilterTypes } from "../lib/category-filter";
const bills = { _id: "507f1f77bcf86cd799439011", kind: "category", name: "Bills", legacyType: "bills" };

describe("unified category filtering", () => {
  it("matches July legacy bills and October personal bills with one selection", () => {
    const types = categoryFilterTypes("bills", [bills]);
    const purchases = [{ date: "2026-07-14", type: "bills", amount: 500 }, { date: "2026-10-14", type: `custom:${bills._id}`, amount: 700 }, { date: "2026-10-15", type: "food", amount: 100 }];
    const matches = purchases.filter((purchase) => types.includes(purchase.type));
    expect(matches).toHaveLength(2);
    expect(matches.reduce((sum, purchase) => sum + purchase.amount, 0)).toBe(1200);
  });
  it("also resolves an existing personal-ID selection to the legacy key", () => {
    expect(categoryFilterTypes(`custom:${bills._id}`, [bills])).toEqual([`custom:${bills._id}`, "bills"]);
  });
  it("keeps choices independent of initial date range and avoids duplicate Bills entries", () => {
    expect(categoryFilterChoices([bills]).filter((choice) => choice.label === "Bills")).toEqual([{ value: "bills", label: "Bills" }]);
    expect(categoryFilterChoices([]).some((choice) => choice.value === "bills")).toBe(true);
  });
  it("keeps the legacy binding after renaming and recognizes matching unlinked names", () => {
    expect(categoryFilterTypes("bills", [{ ...bills, name: "Utilities" }])).toContain(`custom:${bills._id}`);
    expect(categoryFilterTypes("bills", [{ ...bills, legacyType: undefined }])).toContain(`custom:${bills._id}`);
  });
  it("does not merge unrelated personal categories", () => {
    const personal = { ...bills, name: "Household", legacyType: undefined };
    expect(categoryFilterTypes(`custom:${bills._id}`, [personal])).toEqual([`custom:${bills._id}`]);
  });
});
