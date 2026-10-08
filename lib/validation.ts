import mongoose from "mongoose";
import { z } from "zod";
import { needsCard, detailsPayload, type ExpenseDetails } from "@/lib/expense-details";
import { logError } from "@/lib/logger";
import {
  CARD_NAME_MAX_LENGTH,
  CARD_TYPES,
  PAYMENT_METHODS,
} from "@/lib/payment";

/**
 * Single source of truth for API input validation.
 *
 * The HTTP body is the trust boundary: nothing reaches Mongoose before it has
 * been parsed by one of these schemas. Schemas mirror `models/Expense.ts` and
 * strip unknown keys (zod objects are non-passthrough by default), so a client
 * cannot smuggle `_id`, `createdAt`, `updatedAt` or `userId` into a write.
 */

export const EXPENSE_MODES = PAYMENT_METHODS;

/** Copied verbatim from the `type` enum in models/Expense.ts. */
export const EXPENSE_TYPES = [
  "food",
  "electronics",
  "dress",
  "service",
  "gardening",
  "furniture",
  "house utility",
  "footwear",
  "makeup/grooming",
  "subscriptions",
  "toy/figures/stationary",
  "travel expenses",
  "gifts",
  "medicines",
  "harmful item",
  "investment",
  "bills",
  "repair",
  "vehicle expenses",
  "decoration",
  "others",
] as const;

export const SUPPORTED_CURRENCIES = ["₹", "$", "€", "£", "¥", "₺"] as const;

const DESCRIPTION_MAX_LENGTH = 500;

/**
 * Positive decimal with at most two fractional digits.
 *
 * Written as an alternation rather than the more obvious `^\d+(\.\d{1,2})?$`
 * because that form nests a bounded quantifier inside an optional group, which
 * `eslint-plugin-security`'s `detect-unsafe-regex` (safe-regex, star-height
 * heuristic) rejects. The two forms match exactly the same strings; this one is
 * provably linear, so the rule can stay at error severity for the whole repo.
 */
const AMOUNT_PATTERN = /^\d+$|^\d+\.\d{1,2}$/;

/**
 * Rejects anything that is not a plain 24-character hex ObjectId string, so
 * query-operator objects such as `{"$ne": null}` never reach a filter.
 */
const objectIdSchema = z
  .string()
  .trim()
  .refine(
    (value) => /^[0-9a-fA-F]{24}$/.test(value) && mongoose.isValidObjectId(value),
    { message: "must be a valid id" }
  );

const dateSchema = z
  .union([z.string().trim().min(1), z.date()])
  .transform((value) => (value instanceof Date ? value : new Date(value)))
  .refine((value) => !Number.isNaN(value.getTime()), {
    message: "must be a valid date",
  });

const descriptionSchema = z
  .string()
  .trim()
  .min(1, { message: "is required" })
  .max(DESCRIPTION_MAX_LENGTH, {
    message: `must be at most ${DESCRIPTION_MAX_LENGTH} characters`,
  });

const quantitySchema = z
  .number()
  .refine((value) => Number.isFinite(value), { message: "must be a number" })
  .min(0, { message: "must be greater than or equal to 0" })
  .nullable()
  .optional();

/**
 * Accepts a JSON number or a decimal string and normalises it to a canonical
 * string, which is what `Decimal128.fromString` needs. Anything non-numeric,
 * negative, zero, or with more than two decimal places is rejected here rather
 * than throwing inside Mongoose.
 */
const amountSchema = z
  .union([z.number(), z.string().trim()])
  .transform((value) => (typeof value === "number" ? String(value) : value))
  .refine((value) => AMOUNT_PATTERN.test(value), {
    message: "must be a number with at most 2 decimal places",
  })
  .refine((value) => Number(value) > 0, { message: "must be greater than 0" })
  .refine((value) => Number(value) <= 1_000_000_000_000, { message: "amount is too large" });

const expenseFields = {
  date: dateSchema,
  description: descriptionSchema,
  quantity: quantitySchema,
  mode: z.enum(EXPENSE_MODES),
  type: z.union([z.enum(EXPENSE_TYPES), z.string().regex(/^custom:[0-9a-f]{24}$/)]),
  onlineMethod: z.enum(["card", "upi"]).nullable().optional(),
  upiApp: z.string().trim().max(60).optional(),
  upiSource: z.enum(["bank", "rupay-credit"]).nullable().optional(),
  cardNetwork: z.enum(["visa", "mastercard", "rupay"]).nullable().optional(),
  merchant: z.string().trim().max(120).optional(),
  platform: z.string().trim().max(120).optional(),
  amount: amountSchema,
  cardId: objectIdSchema.nullable().optional(),
};

/**
 * Card payments (including online card and RuPay UPI) reference a saved card.
 * Cash and bank-funded UPI never carry one. A stale id from a form the user switched away from
 * is dropped here rather than persisted. Whether the id belongs to the caller
 * is checked by the route, which is the only place that knows who the caller is.
 */
function normaliseCardId<T extends ExpenseDetails & { mode: string; cardId?: string | null }>(
  expense: T
): Omit<T, "cardId"> & { cardId: string | null } {
  return {
    ...expense,
    ...Object.fromEntries(Object.entries(detailsPayload(expense)).filter(([key]) => Object.prototype.hasOwnProperty.call(expense, key))),
    cardId: needsCard(expense) ? (expense.cardId ?? null) : null,
  };
}

const requireCardForCardPayment = {
  check: (expense: { mode: string; cardId?: string | null; onlineMethod?: string | null; upiSource?: string | null }) =>
    !needsCard(expense) || Boolean(expense.cardId),
  params: { message: "is required for a card payment", path: ["cardId"] },
};

export const expenseCreateSchema = z
  .object(expenseFields)
  .refine(requireCardForCardPayment.check, requireCardForCardPayment.params)
  .transform(normaliseCardId);

export const expenseUpdateSchema = z
  .object({
    id: objectIdSchema,
    ...expenseFields,
  })
  .refine(requireCardForCardPayment.check, requireCardForCardPayment.params)
  .transform(normaliseCardId);

export const expenseDeleteSchema = z.object({
  id: objectIdSchema,
});

/**
 * §G.4 — GET /api/expenses query parameters.
 *
 * Before this existed the handler took no input at all and returned a user's
 * ENTIRE expense history, which the browser then filtered and aggregated. The
 * response therefore grew linearly with account age. These parameters are the
 * trust boundary for the read path: everything that reaches `skip`, `limit` and
 * the `date` range filter is parsed here first.
 *
 * Deliberate choices:
 *  - `limit` is CAPPED at MAX_PAGE_SIZE. A caller cannot ask for 10 million
 *    rows, so the response size is bounded no matter what is sent.
 *  - `page` is bounded too: `skip` grows with it and an unbounded skip is a
 *    trivial way to make the database do unbounded work.
 *  - Both are matched against a digits-only pattern rather than coerced, so
 *    "1e9", "-1", "0x20" and `{"$gt":0}` are 400s, not surprising numbers.
 *  - `from`/`to` reuse the same date parser the write path uses.
 */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const MAX_PAGE = 100_000;

/** Digits only, bounded length. Linear — safe under `detect-unsafe-regex`. */
const DIGITS_PATTERN = /^[0-9]{1,7}$/;

const boundedIntSchema = (min: number, max: number) =>
  z
    .string()
    .trim()
    .regex(DIGITS_PATTERN, { message: "must be a whole number" })
    .transform(Number)
    .refine((value) => value >= min && value <= max, {
      message: `must be between ${min} and ${max}`,
    });

export const expenseQuerySchema = z
  .object({
    page: boundedIntSchema(1, MAX_PAGE).optional(),
    limit: boundedIntSchema(1, MAX_PAGE_SIZE).optional(),
    from: dateSchema.optional(),
    to: dateSchema.optional(),
    mode: z.enum(EXPENSE_MODES).optional(),
    cardId: objectIdSchema.optional(),
  })
  .transform((query) => ({
    page: query.page ?? 1,
    limit: query.limit ?? DEFAULT_PAGE_SIZE,
    from: query.from ?? null,
    to: query.to ?? null,
    // A specific card only narrows card payments, so it implies mode=card.
    mode: query.cardId ? ("card" as const) : (query.mode ?? null),
    cardId: query.cardId ?? null,
  }))
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    message: "`from` must not be after `to`",
  });

export type ExpenseQuery = z.infer<typeof expenseQuerySchema>;

/** The only query keys the read path understands; anything else is ignored. */
const EXPENSE_QUERY_KEYS = ["page", "limit", "from", "to", "mode", "cardId"] as const;

/**
 * Pull the recognised query parameters off a request URL and validate them.
 * Absent or empty values are omitted so the schema applies its defaults rather
 * than failing on an empty string.
 */
export function parseExpenseQuery(url: string): ExpenseQuery {
  const { searchParams } = new URL(url);
  const raw: Record<string, string> = {};

  for (const key of EXPENSE_QUERY_KEYS) {
    const value = searchParams.get(key);
    if (value !== null && value.trim() !== "") {
      raw[key] = value;
    }
  }

  return expenseQuerySchema.parse(raw);
}

export const currencyUpdateSchema = z.object({
  currency: z.enum(SUPPORTED_CURRENCIES),
});

/**
 * Saved cards. The schema is the reason no sensitive card data can be stored:
 * it accepts exactly a type, a nickname and four digits, and strips every
 * other key (a full number, CVV, PIN, OTP or expiry sent by a client is
 * silently discarded, never persisted).
 */
const cardNameSchema = z
  .string()
  .trim()
  .min(1, { message: "is required" })
  .max(CARD_NAME_MAX_LENGTH, {
    message: `must be at most ${CARD_NAME_MAX_LENGTH} characters`,
  })
  // A nickname has no business holding a card number. Reject long digit runs
  // (spaces/dashes ignored) so a user cannot paste one in by mistake.
  .refine((value) => !/[0-9]{7}/.test(value.replace(/[\s-]/g, "")), {
    message: "must not contain a card number",
  });

const cardFields = {
  type: z.enum(CARD_TYPES),
  network: z.enum(["visa", "mastercard", "rupay"]).nullable().optional(),
  name: cardNameSchema,
  last4: z
    .string()
    .trim()
    .regex(/^[0-9]{4}$/, { message: "must be exactly 4 digits" }),
};

export const cardCreateSchema = z.object(cardFields);

export const cardUpdateSchema = z.object({
  id: objectIdSchema,
  ...cardFields,
});

export const cardDeleteSchema = z.object({
  id: objectIdSchema,
});

export type ExpenseCreateInput = z.infer<typeof expenseCreateSchema>;
export type ExpenseUpdateInput = z.infer<typeof expenseUpdateSchema>;
export type ExpenseDeleteInput = z.infer<typeof expenseDeleteSchema>;
export type CardCreateInput = z.infer<typeof cardCreateSchema>;

/** An error that maps to a specific HTTP status with a client-safe message. */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export const unauthorized = () =>
  Response.json({ error: "Unauthorized" }, { status: 401 });

export const notFound = () =>
  Response.json({ error: "Not Found" }, { status: 404 });

/**
 * `req.json()` throws on an absent or malformed body — turn that into a 400
 * instead of an unhandled 500.
 */
export async function parseJsonBody(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "Malformed JSON body");
  }
}

/**
 * Terminal error handler for every route. Validation problems become a 400 that
 * names only the offending fields; everything else becomes a generic 500 that
 * leaks no stack trace and no Mongoose/driver message.
 */
export function handleRouteError(error: unknown): Response {
  if (error instanceof z.ZodError) {
    return Response.json(
      {
        error: "Invalid request body",
        details: error.issues.map((issue) => ({
          field: issue.path.join(".") || "(body)",
          message: issue.message,
        })),
      },
      { status: 400 }
    );
  }

  if (error instanceof HttpError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  // Round 7 — the 500s ET-H4 used to hide are now observable.
  //
  // The client still learns nothing: it gets the same generic message plus an
  // opaque correlation id. Everything diagnostic (error name, message, stack)
  // goes to the structured log and stays server-side. `errorId` is what makes a
  // "it just said Internal Server Error" report actionable.
  const errorId = logError("api.unhandled_error", error);

  return Response.json(
    { error: "Internal Server Error", errorId },
    { status: 500 }
  );
}

export const refundSchema = z.object({ id: objectIdSchema, amount: amountSchema, date: dateSchema, source: z.string().trim().min(1).max(120) });
export const optionSchema = z.object({ kind: z.enum(["category", "upiApp"]), name: z.string().trim().min(1).max(60) });

export const categoryUpdateSchema = z.object({ kind: z.enum(["category", "upiApp"]).default("category"), id: objectIdSchema, name: z.string().trim().min(1).max(60) });

export const optionDeleteSchema = z.object({ id: objectIdSchema, kind: z.enum(["category", "upiApp"]).default("category") });
