import { connectDB } from "@/lib/mongodb";
import Expense from "@/models/Expense";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import mongoose from "mongoose";
import {
  expenseCreateSchema,
  expenseDeleteSchema,
  expenseUpdateSchema,
  handleRouteError,
  notFound,
  parseJsonBody,
  unauthorized,
} from "@/lib/validation";

/**
 * Shape of an expense document as returned by `.lean()`.
 *
 * `models/Expense.ts` is an untyped Mongoose model, so queries resolve to `any`.
 * This is the minimum contract the GET handler relies on: an `amount` that can be
 * stringified (it is a `Decimal128`), plus whatever else the document carries and
 * is spread through untouched.
 */
type LeanExpense = Record<string, unknown> & { amount: { toString(): string } };

/**
 * ET-M1 — expense ownership.
 *
 * `session.user.id` is the immutable Google `sub`. `session.user.email` is
 * mutable: Google lets a user change their address, and a freed address can be
 * reassigned to somebody else. Ownership must not hang off the mutable one, so
 * every NEW expense is written with the stable id.
 */
function ownerId(session: Session): string {
  // The email fallback only fires for a session minted before `token.id`
  // existed. It keeps such a session writing under the same key it can already
  // read, rather than orphaning the row under `undefined`.
  return session.user?.id ?? (session.user?.email as string);
}

/**
 * TRANSITIONAL — remove only after the migration has been applied AND verified.
 *
 * Every expense written before this change stores the owner's EMAIL in
 * `userId`. Switching reads to the stable id alone would make all of that data
 * invisible to its owner, so reads, updates and deletes match either key.
 *
 * The removal procedure, in order:
 *   1. `node --env-file=.env.local scripts/migrate-userid.mjs`          (dry run)
 *   2. `node --env-file=.env.local scripts/migrate-userid.mjs --apply`  (writes)
 *   3. Verify `db.expenses.countDocuments({ userId: { $regex: "@" } })` is 0
 *      and that the "unmapped" count printed by the script is 0.
 *   4. Then, and only then, replace every `ownerFilter(session)` below with
 *      `{ userId: ownerId(session) }` and delete this function.
 *
 * Matching on a two-element `$in` still uses the `userId` index, so this costs
 * nothing measurable in the meantime.
 */
function ownerFilter(session: Session): { userId: { $in: string[] } } {
  const ids = [session.user?.id, session.user?.email].filter(
    (value): value is string => typeof value === "string" && value.length > 0
  );

  return { userId: { $in: Array.from(new Set(ids)) } };
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return unauthorized();
    }

    // Validate before touching the database. Unknown keys (_id, createdAt,
    // updatedAt, userId, ...) are dropped by the schema, and the fields below
    // are destructured explicitly — the request body is never spread.
    const { date, description, quantity, mode, type, amount } =
      expenseCreateSchema.parse(await parseJsonBody(req));

    await connectDB();

    const expense = await Expense.create({
      // Stable id: new rows never carry an email as their owner key.
      userId: ownerId(session),
      date,
      description,
      quantity: quantity ?? null,
      mode,
      type,
      amount: mongoose.Types.Decimal128.fromString(amount),
    });

    return Response.json({
      ...expense.toObject(),
      amount: parseFloat(expense.amount.toString()),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return unauthorized();
    }

    await connectDB();

    // ET-L5: `models/Expense.ts` exports an untyped Mongoose model, so `.lean()`
    // resolves to `any`. Narrowing it here — at the single point of use — keeps
    // the `no-explicit-any` escape hatch out of the code and documents the one
    // field this handler actually reshapes (Decimal128 is not JSON-serialisable
    // as a number, so it is stringified by the driver and parsed back here).
    const expenses: LeanExpense[] = await Expense.find(ownerFilter(session))
      .sort({ date: -1 })
      .lean();

    const formatted = expenses.map((exp) => ({
      ...exp,
      amount: parseFloat(exp.amount.toString()),
    }));

    return Response.json(formatted);
  } catch (error) {
    return handleRouteError(error);
  }
}


export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return unauthorized();
    }

    // `id` is validated as a real ObjectId string, so a query operator such as
    // {"$ne": null} is rejected with a 400 before it reaches the filter.
    const { id } = expenseDeleteSchema.parse(await parseJsonBody(req));

    await connectDB();

    const expense = await Expense.findOneAndDelete({
      _id: id,
      ...ownerFilter(session), // ownership check, still enforced in the query
    });

    if (!expense) {
      return notFound();
    }

    return Response.json({ message: "Deleted successfully" });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return unauthorized();
    }

    const { id, date, description, quantity, mode, type, amount } =
      expenseUpdateSchema.parse(await parseJsonBody(req));

    await connectDB();

    const updatedExpense = await Expense.findOneAndUpdate(
      {
        _id: id,
        ...ownerFilter(session), // ownership check, still enforced in the query
      },
      {
        date,
        description,
        quantity: quantity ?? null,
        mode,
        type,
        amount: mongoose.Types.Decimal128.fromString(amount),
      },
      { new: true }
    );

    if (!updatedExpense) {
      return notFound();
    }

    return Response.json({
      ...updatedExpense.toObject(),
      amount: parseFloat(updatedExpense.amount.toString()),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
