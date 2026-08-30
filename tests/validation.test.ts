import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  expenseCreateSchema,
  expenseDeleteSchema,
  expenseQuerySchema,
  expenseUpdateSchema,
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
