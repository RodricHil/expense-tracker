import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  expenseCreateSchema,
  expenseDeleteSchema,
  expenseQuerySchema,
  expenseUpdateSchema,
  cardCreateSchema,
  cardUpdateSchema,
  parseExpenseQuery,
} from "@/lib/validation";

/**
 * Round 3 (ET-H4 / ET-H5 / ET-M5) — the validation layer IS the trust boundary.
 *
 * Every one of these cases used to flow straight into Mongoose. The tests are
 * written as "this input must be REJECTED" rather than "this input produces X",
 * because the security property is the rejection.
 */

const VALID_ID = "507f1f77bcf86cd799439011";

const validExpense = {
  date: "2026-08-01T00:00:00.000Z",
  description: "Groceries",
  quantity: 2,
  mode: "cash",
  type: "food",
  amount: "42.50",
};

/** The field paths zod reported, so a test can assert on the offending key. */
function issuePaths(error: unknown): string[] {
  if (!(error instanceof ZodError)) throw error;
  return error.issues.map((issue) => issue.path.join("."));
}

describe("expenseCreateSchema", () => {
  it("accepts a well-formed expense and normalises the amount to a string", () => {
    const parsed = expenseCreateSchema.parse(validExpense);

    expect(parsed.amount).toBe("42.50");
    expect(parsed.date).toBeInstanceOf(Date);
    expect(parsed.description).toBe("Groceries");
  });

  it("rejects a missing amount", () => {
    const withoutAmount: Record<string, unknown> = { ...validExpense };
    delete withoutAmount.amount;
    const result = expenseCreateSchema.safeParse(withoutAmount);

    expect(result.success).toBe(false);
    expect(issuePaths(result.error)).toContain("amount");
  });

  it("rejects a non-numeric amount", () => {
    for (const amount of ["abc", "12.345", "-5", "0", "1e9", "  ", "NaN"]) {
      const result = expenseCreateSchema.safeParse({ ...validExpense, amount });
      expect(result.success, `amount ${JSON.stringify(amount)}`).toBe(false);
    }
  });

  it("rejects an amount smuggled in as a query operator object", () => {
    const result = expenseCreateSchema.safeParse({
      ...validExpense,
      amount: { $gt: 0 },
    });

    expect(result.success).toBe(false);
  });

  it("rejects a mode outside the enum", () => {
    const result = expenseCreateSchema.safeParse({
      ...validExpense,
      mode: "crypto",
    });

    expect(result.success).toBe(false);
    expect(issuePaths(result.error)).toContain("mode");
  });

  it("rejects a type outside the enum", () => {
    const result = expenseCreateSchema.safeParse({
      ...validExpense,
      type: "not-a-real-category",
    });

    expect(result.success).toBe(false);
    expect(issuePaths(result.error)).toContain("type");
  });

  it("rejects an unparseable date", () => {
    const result = expenseCreateSchema.safeParse({
      ...validExpense,
      date: "not-a-date",
    });

    expect(result.success).toBe(false);
    expect(issuePaths(result.error)).toContain("date");
  });

  it("rejects a description longer than the 500-character cap", () => {
    const result = expenseCreateSchema.safeParse({
      ...validExpense,
      description: "x".repeat(501),
    });

    expect(result.success).toBe(false);
    expect(issuePaths(result.error)).toContain("description");
  });

  it("ET-H5 — strips mass-assignment keys instead of passing them through", () => {
    const parsed = expenseCreateSchema.parse({
      ...validExpense,
      _id: VALID_ID,
      userId: "someone-else@example.com",
      createdAt: "2000-01-01T00:00:00.000Z",
      updatedAt: "2000-01-01T00:00:00.000Z",
      __v: 7,
      isAdmin: true,
    });

    expect(Object.keys(parsed).sort()).toEqual([
      "amount",
      "cardId",
      "date",
      "description",
      "mode",
      "quantity",
      "type",
    ]);
    expect(parsed).not.toHaveProperty("_id");
    expect(parsed).not.toHaveProperty("userId");
  });
});

describe("expenseUpdateSchema / expenseDeleteSchema", () => {
  it("accepts a plain 24-character hex ObjectId", () => {
    expect(expenseDeleteSchema.parse({ id: VALID_ID }).id).toBe(VALID_ID);
    expect(expenseUpdateSchema.parse({ ...validExpense, id: VALID_ID }).id).toBe(
      VALID_ID
    );
  });

  it("ET-M5 — rejects a query-operator object supplied as the id", () => {
    for (const id of [
      { $ne: null },
      { $gt: "" },
      { $regex: ".*" },
      ["507f1f77bcf86cd799439011"],
      null,
      true,
    ]) {
      const result = expenseDeleteSchema.safeParse({ id });
      expect(result.success, `id ${JSON.stringify(id)}`).toBe(false);
    }
  });

  it("rejects an id that is not 24 hex characters", () => {
    for (const id of ["", "1", "zzzzzzzzzzzzzzzzzzzzzzzz", `${VALID_ID}00`]) {
      expect(expenseDeleteSchema.safeParse({ id }).success).toBe(false);
    }
  });

  it("ET-H5 — an update cannot re-key ownership via a smuggled userId", () => {
    const parsed = expenseUpdateSchema.parse({
      ...validExpense,
      id: VALID_ID,
      userId: "victim@example.com",
      _id: "0".repeat(24),
    });

    expect(parsed).not.toHaveProperty("userId");
    expect(Object.keys(parsed)).not.toContain("_id");
    expect(parsed.id).toBe(VALID_ID);
  });
});

describe("expenseQuerySchema (§G.4)", () => {
  it("applies safe defaults when nothing is supplied", () => {
    const parsed = expenseQuerySchema.parse({});

    expect(parsed).toEqual({
      page: 1,
      limit: DEFAULT_PAGE_SIZE,
      from: null,
      to: null,
      mode: null,
      cardId: null,
    });
  });

  it("caps limit so a caller cannot request an unbounded response", () => {
    expect(expenseQuerySchema.safeParse({ limit: String(MAX_PAGE_SIZE) }).success).toBe(
      true
    );
    expect(
      expenseQuerySchema.safeParse({ limit: String(MAX_PAGE_SIZE + 1) }).success
    ).toBe(false);
    expect(expenseQuerySchema.safeParse({ limit: "1000000" }).success).toBe(false);
  });

  it("rejects non-integer, negative and exotic numeric forms", () => {
    for (const page of ["0", "-1", "1.5", "1e9", "0x20", " ", "abc"]) {
      expect(
        expenseQuerySchema.safeParse({ page }).success,
        `page ${JSON.stringify(page)}`
      ).toBe(false);
    }
  });

  it("rejects a range whose start is after its end", () => {
    const result = expenseQuerySchema.safeParse({
      from: "2026-08-10T00:00:00.000Z",
      to: "2026-08-01T00:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });

  it("parses from/to into Date objects", () => {
    const parsed = expenseQuerySchema.parse({
      from: "2026-08-01T00:00:00.000Z",
      to: "2026-08-31T23:59:59.999Z",
    });

    expect(parsed.from).toBeInstanceOf(Date);
    expect(parsed.to).toBeInstanceOf(Date);
    expect(parsed.from?.toISOString()).toBe("2026-08-01T00:00:00.000Z");
  });
});

describe("parseExpenseQuery", () => {
  it("reads the recognised parameters off a request URL", () => {
    const parsed = parseExpenseQuery(
      "https://example.test/api/expenses?page=3&limit=50&from=2026-01-01T00:00:00.000Z&to=2026-01-31T00:00:00.000Z"
    );

    expect(parsed.page).toBe(3);
    expect(parsed.limit).toBe(50);
    expect(parsed.from?.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  it("ignores unknown parameters rather than forwarding them to the database", () => {
    const parsed = parseExpenseQuery(
      "https://example.test/api/expenses?userId=victim@example.com&sort=%7B%22%24where%22%3A1%7D"
    );

    expect(parsed).toEqual({
      page: 1,
      limit: DEFAULT_PAGE_SIZE,
      from: null,
      to: null,
      mode: null,
      cardId: null,
    });
  });

  it("treats an empty parameter as absent instead of failing", () => {
    const parsed = parseExpenseQuery("https://example.test/api/expenses?page=&from=");

    expect(parsed.page).toBe(1);
    expect(parsed.from).toBeNull();
  });

  it("throws on a malformed parameter so the route can answer 400", () => {
    expect(() =>
      parseExpenseQuery("https://example.test/api/expenses?limit=99999999")
    ).toThrow(ZodError);
  });
});

describe("payment methods and card references", () => {
  const CARD_ID = "65a1b2c3d4e5f60718293a4b";

  it.each(["online", "card", "cash"])("accepts %s as a payment method", (mode) => {
    const cardId = mode === "card" ? CARD_ID : undefined;
    expect(expenseCreateSchema.safeParse({ ...validExpense, mode, cardId }).success).toBe(true);
  });

  it("keeps the card reference on a card payment", () => {
    const parsed = expenseCreateSchema.parse({ ...validExpense, mode: "card", cardId: CARD_ID });
    expect(parsed.cardId).toBe(CARD_ID);
  });

  it.each([undefined, null])("requires a saved card for a card payment (cardId %s)", (cardId) => {
    const result = expenseCreateSchema.safeParse({ ...validExpense, mode: "card", cardId });
    expect(result.success).toBe(false);
    expect(issuePaths(result.error)).toContain("cardId");
  });

  it("requires a saved card on update too", () => {
    const result = expenseUpdateSchema.safeParse({ ...validExpense, id: VALID_ID, mode: "card" });
    expect(result.success).toBe(false);
    expect(issuePaths(result.error)).toContain("cardId");
  });

  it.each(["online", "cash"])("drops a stale card reference on a %s payment", (mode) => {
    const parsed = expenseCreateSchema.parse({ ...validExpense, mode, cardId: CARD_ID });
    expect(parsed.cardId).toBeNull();
  });

  it("rejects a card reference that is not an ObjectId, including operator objects", () => {
    expect(expenseCreateSchema.safeParse({ ...validExpense, mode: "card", cardId: "4111111111111111" }).success).toBe(false);
    expect(expenseCreateSchema.safeParse({ ...validExpense, mode: "card", cardId: { $ne: null } }).success).toBe(false);
  });

  it("applies the same rules on update", () => {
    const parsed = expenseUpdateSchema.parse({ ...validExpense, id: VALID_ID, mode: "online", cardId: CARD_ID });
    expect(parsed.cardId).toBeNull();
  });
});

describe("card schemas — no sensitive card data", () => {
  const validCard = { type: "credit", name: "HDFC Credit", last4: "4582" };

  it("accepts a type, nickname and last four digits", () => {
    expect(cardCreateSchema.parse(validCard)).toEqual(validCard);
  });

  it("strips a full number, CVV, PIN, OTP and expiry instead of passing them through", () => {
    const parsed = cardCreateSchema.parse({
      ...validCard,
      number: "4111111111114582",
      cvv: "123",
      pin: "0000",
      otp: "123456",
      expiry: "12/30",
      userId: "someone-else",
    });
    expect(Object.keys(parsed).sort()).toEqual(["last4", "name", "type"]);
  });

  it.each(["458", "45821", "45a2", "", "4111111111114582"])("rejects %j as the last four digits", (last4) => {
    const result = cardCreateSchema.safeParse({ ...validCard, last4 });
    expect(result.success).toBe(false);
    expect(issuePaths(result.error)).toContain("last4");
  });

  it("rejects a type other than debit or credit", () => {
    expect(cardCreateSchema.safeParse({ ...validCard, type: "prepaid" }).success).toBe(false);
  });

  it("rejects an empty or overlong nickname", () => {
    expect(cardCreateSchema.safeParse({ ...validCard, name: "   " }).success).toBe(false);
    expect(cardCreateSchema.safeParse({ ...validCard, name: "x".repeat(41) }).success).toBe(false);
  });

  it("rejects a nickname that contains a card number", () => {
    const result = cardCreateSchema.safeParse({ ...validCard, name: "My card 4111 1111 1111 1111" });
    expect(result.success).toBe(false);
    expect(issuePaths(result.error)).toContain("name");
  });

  it("requires a valid id on update", () => {
    expect(cardUpdateSchema.safeParse({ ...validCard, id: { $ne: null } }).success).toBe(false);
    expect(cardUpdateSchema.safeParse({ ...validCard, id: VALID_ID }).success).toBe(true);
  });
});

describe("payment filter query parameters", () => {
  const CARD_ID = "65a1b2c3d4e5f60718293a4b";
  const parse = (qs: string) => parseExpenseQuery(`https://example.test/api/expenses?${qs}`);

  it("defaults to no payment filter", () => {
    expect(parse("")).toMatchObject({ mode: null, cardId: null });
  });

  it.each(["online", "card", "cash"])("accepts mode=%s", (mode) => {
    expect(parse(`mode=${mode}`)).toMatchObject({ mode, cardId: null });
  });

  it("treats a card filter as a card-payment filter", () => {
    expect(parse(`cardId=${CARD_ID}`)).toMatchObject({ mode: "card", cardId: CARD_ID });
    expect(parse(`mode=cash&cardId=${CARD_ID}`)).toMatchObject({ mode: "card", cardId: CARD_ID });
  });

  it("rejects an unknown mode or a malformed card id", () => {
    expect(() => parse("mode=crypto")).toThrow();
    expect(() => parse("cardId=4111111111111111")).toThrow();
    expect(() => parse("cardId[$ne]=x&cardId=%7B%7D")).toThrow();
  });
});

describe("additional payment details", () => {
  it("retains card references for online card payments", () => {
    const parsed = expenseCreateSchema.parse({ ...validExpense, mode: "online", onlineMethod: "card", cardId: VALID_ID });
    expect(parsed.cardId).toBe(VALID_ID);
  });
  it("requires a card for online card and RuPay UPI payments", () => {
    expect(expenseCreateSchema.safeParse({ ...validExpense, mode: "online", onlineMethod: "card" }).success).toBe(false);
    expect(expenseCreateSchema.safeParse({ ...validExpense, mode: "online", onlineMethod: "upi", upiSource: "rupay-credit" }).success).toBe(false);
  });
  it("never accepts refunds through ordinary expense writes", () => {
    expect(expenseCreateSchema.parse({ ...validExpense, refunds: [{ cents: 999999 }] })).not.toHaveProperty("refunds");
  });
  it("accepts personal category ids but rejects operator objects", () => {
    expect(expenseCreateSchema.safeParse({ ...validExpense, type: `custom:${VALID_ID}` }).success).toBe(true);
    expect(expenseCreateSchema.safeParse({ ...validExpense, type: { $ne: null } }).success).toBe(false);
  });
});
