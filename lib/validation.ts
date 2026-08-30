import mongoose from "mongoose";
import { z } from "zod";
import { logError } from "@/lib/logger";

/**
 * Single source of truth for API input validation.
 *
 * The HTTP body is the trust boundary: nothing reaches Mongoose before it has
 * been parsed by one of these schemas. Schemas mirror `models/Expense.ts` and
 * strip unknown keys (zod objects are non-passthrough by default), so a client
 * cannot smuggle `_id`, `createdAt`, `updatedAt` or `userId` into a write.
 */

export const EXPENSE_MODES = ["online", "cash"] as const;

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
  .refine((value) => Number(value) > 0, { message: "must be greater than 0" });

const expenseFields = {
  date: dateSchema,
  description: descriptionSchema,
  quantity: quantitySchema,
  mode: z.enum(EXPENSE_MODES),
  type: z.enum(EXPENSE_TYPES),
  amount: amountSchema,
};

export const expenseCreateSchema = z.object(expenseFields);

export const expenseUpdateSchema = z.object({
  id: objectIdSchema,
  ...expenseFields,
});

export const expenseDeleteSchema = z.object({
  id: objectIdSchema,
});

export const currencyUpdateSchema = z.object({
  currency: z.enum(SUPPORTED_CURRENCIES),
});

export type ExpenseCreateInput = z.infer<typeof expenseCreateSchema>;
export type ExpenseUpdateInput = z.infer<typeof expenseUpdateSchema>;
export type ExpenseDeleteInput = z.infer<typeof expenseDeleteSchema>;

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
