import { describe, expect, it } from "vitest";
import {
  CARD_LIMIT_PER_TYPE,
  PAYMENT_METHODS,
  cardLabel,
  cardLimitMessage,
  isPaymentMethod,
  maskedCardNumber,
  paymentMethodLabel,
} from "@/lib/payment";

describe("payment methods", () => {
  it("supports exactly online, card and cash", () => {
    expect([...PAYMENT_METHODS]).toEqual(["online", "card", "cash"]);
  });

  it("labels each method consistently", () => {
    expect(PAYMENT_METHODS.map(paymentMethodLabel)).toEqual(["Online", "Card", "Cash"]);
  });

  it("recognises only the supported methods", () => {
    expect(isPaymentMethod("card")).toBe(true);
    expect(isPaymentMethod("crypto")).toBe(false);
    expect(isPaymentMethod(undefined)).toBe(false);
  });

  it("shows an unknown legacy value as-is rather than hiding it", () => {
    expect(paymentMethodLabel("upi")).toBe("upi");
  });
});

describe("saved card labels", () => {
  const card = { name: "HDFC Credit", last4: "4582" };

  it("masks everything but the last four digits", () => {
    expect(maskedCardNumber(card)).toBe("•••• 4582");
  });

  it("formats the selector label", () => {
    expect(cardLabel(card)).toBe("HDFC Credit •••• 4582");
  });

  it("explains the per-type limit", () => {
    expect(CARD_LIMIT_PER_TYPE).toBe(5);
    expect(cardLimitMessage("debit")).toBe("You can save up to 5 debit cards. Delete one to add another.");
  });
});
