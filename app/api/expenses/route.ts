import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Expense from "@/models/Expense";
import { loadExpensePage, ownerFilter, ownerId } from "@/lib/expenses";
import {
  expenseCreateSchema,
  expenseDeleteSchema,
  expenseUpdateSchema,
  handleRouteError,
  notFound,
  parseExpenseQuery,
  parseJsonBody,
  unauthorized,
} from "@/lib/validation";

/**
 * The four expense verbs.
 *
 * Every one of them authenticates first and then scopes the database operation
 * by `ownerFilter(session)` INSIDE the query filter — never by checking
 * ownership after a fetch. That is the §E "no IDOR" positive control, and
 * tests/expenses-route.test.ts is its regression gate.
 *
 * The read query itself lives in `lib/expenses.ts` because the dashboard and
 * analytics server components run the same one directly (§G.3).
 */

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

/**
 * §G.4 — GET /api/expenses
 *
 * This handler used to take no input and return `Expense.find(owner)` in full:
 * every row a user had ever created, on every dashboard and analytics page
 * load. The browser then did the filtering and the aggregation, so the response
 * grew linearly with account age — a multi-year account downloaded thousands of
 * documents to draw one chart.
 *
 * It now returns AT MOST `limit` rows (hard cap: MAX_PAGE_SIZE) plus a
 * MongoDB-computed summary. `expenses[]` items are byte-for-byte what this
 * route always returned (all document fields, `amount` as a JSON number); they
 * now sit in an envelope alongside `pagination` and `summary`, because a single
 * page can no longer answer "total spent". Both callers
 * (app/dashboard/dashboardclient.tsx, app/analytics/analytics.tsx) read it.
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return unauthorized();
    }

    // Validated before it can reach `skip`, `limit` or a date filter.
    const query = parseExpenseQuery(req.url);

    return Response.json(await loadExpensePage(session, query));
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
