import { describe, expect, it } from "vitest";
import { parseReceipt } from "@/lib/receipt-parser";
describe("receipt draft extraction", () => {
  it("uses a labelled total instead of tax or account digits", () => {
    expect(parseReceipt("Example Store\nDate: 09/10/2026\nAccount 1234567890\nSubtotal 1,000.00\nTax 180.00\nGrand Total INR 1,180.00")).toEqual({ merchant: "Example Store", description: "Example Store", amount: "1180.00", date: "2026-10-09" });
  });
  it("does not invent an amount or a date from an ambiguous receipt", () => {
    const draft = parseReceipt("Store\nItem 12.00\nAccount 12345678\n31/02/2026");
    expect(draft.amount).toBeUndefined(); expect(draft.date).toBeUndefined();
  });
});

describe("invoice field detection", () => {
  it("ignores pagination, selects invoice issue date over due date, and matches private categories", () => {
    const draft = parseReceipt("Page 1 of 1\nInvoice\nOpenAI, LLC\nDate due\nNovember 9, 2026\nDate of issue\nOctober 9, 2026\nDescription Qty Unit price Amount\nChatGPT Plus subscription\n1\nTotal INR 1,999.00", [
      { _id: "mine", kind: "category", name: "subscriptions" },
      { _id: "deleted", kind: "category", name: "ChatGPT", archived: true },
    ]);
    expect(draft).toMatchObject({ merchant: "OpenAI, LLC", description: "ChatGPT Plus subscription", date: "2026-10-09", platform: "OpenAI", type: "custom:mine", amount: "1999.00" });
  });
  it("supports day-first named invoice dates", () => {
    expect(parseReceipt("Shop\nInvoice date: 8 September 2026").date).toBe("2026-09-08");
  });
  it("does not invent categories, platforms, or dates", () => {
    const draft = parseReceipt("Page 1 of 1\nInvoice\nDate due: 09/10/2026");
    expect(draft.description).toBeUndefined(); expect(draft.date).toBeUndefined();
    expect(draft.platform).toBeUndefined(); expect(draft.type).toBeUndefined();
  });
});

describe("receipt items and payments", () => {
  it("collects every purchased item and selects the explicit UPI method", () => {
    const draft = parseReceipt("Payment Information\n1 x H&M Women Cardigan ₹1,499.00\n1 x Jockey Active Wear ₹899.00\n1 x Jockey Active Wear ₹899.00\n1 x HIGHLANDER Blue Jeans ₹3,099.00\n1 x HIGHLANDER Loose Fit ₹3,099.00\nDiscount -₹4,774.00\nPlatform Fee ₹23.00\nTotal amount ₹4,744.00\nPayment Status\nPaid Online\nPayment Method\nUPI");
    expect(draft.description?.split("\n")).toHaveLength(5);
    expect(draft.description).toContain("1 x HIGHLANDER Loose Fit");
    expect(draft.description).not.toContain("Discount");
    expect(draft).toMatchObject({ mode: "online", onlineMethod: "upi", amount: "4744.00" });
  });
  it("collects table items until totals and detects card payment", () => {
    expect(parseReceipt("Store\nDescription Qty Amount\nNotebook 1 100.00\nPencil 2 20.00\nTotal 120.00\nPayment Method: Visa credit card")).toMatchObject({ description: "Notebook\nPencil", mode: "card", onlineMethod: "" });
  });
  it("recognizes cash and does not guess from accepted-payment logos", () => {
    expect(parseReceipt("Store\nPayment Method: Cash")).toMatchObject({ mode: "cash", onlineMethod: "" });
    expect(parseReceipt("Store\nAccepted payments Visa Mastercard UPI").mode).toBeUndefined();
  });
});

describe("merchant identification", () => {
  it("leaves merchant blank for a payment screenshot without a seller", () => {
    const draft = parseReceipt("Payment Information\n1x H&M Women Cardigan 21,499.00\n1x Jockey Active Wear 2899.00\nDiscount\n-24,774.00\nDiscounted Price\n24,721.00\nPlatform Fee\n223.00\nTotal amount\n24,744.00\nYou're saving on this order\nPayment Method\nUPI");
    expect(draft.merchant).toBeUndefined();
    expect(draft.description).toContain("1x H&M Women Cardigan");
    expect(draft.description).toContain("1x Jockey Active Wear");
  });
  it("uses an explicit seller label even after the item list", () => {
    expect(parseReceipt("1x Brand Cardigan 1499.00\nSold by\nExample Clothing Pvt Ltd\nTotal 1499.00").merchant).toBe("Example Clothing Pvt Ltd");
  });
  it("does not use an item or a price as a labelled merchant", () => {
    expect(parseReceipt("Merchant:\n1x Brand Cardigan 1499.00").merchant).toBeUndefined();
    expect(parseReceipt("Cardigan 1499.00\nTotal 1499.00").merchant).toBeUndefined();
  });
});
