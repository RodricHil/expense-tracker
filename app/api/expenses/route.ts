import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import ExpenseOption from "@/models/ExpenseOption";
import { EXPENSE_TYPES, refundSchema } from "@/lib/validation";
import Expense from "@/models/Expense";
import { loadExpensePage, ownerFilter, ownerId } from "@/lib/expenses";
import { ownsCard } from "@/lib/cards";
import {
  HttpError,
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
 * A card payment may reference one of the caller's saved cards by id. The id
 * is checked against the caller's own cards before the write, so an expense
 * can never point at somebody else's card.
 *
 * The read query itself lives in `lib/expenses.ts` because the dashboard and
 * analytics server components run the same one directly (§G.3).
 */

/** 400 unless `cardId` is absent or one of the caller's own saved cards. */
async function assertOwnCard(
  session: Parameters<typeof ownsCard>[0],
  cardId: string | null,
  rupayCredit = false
): Promise<void> {
  if (cardId && !(await ownsCard(session, cardId, rupayCredit))) {
    throw new HttpError(400, "Selected card was not found");
  }
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
    const { date, description, quantity, mode, type, amount, cardId, ...details } =
      expenseCreateSchema.parse(await parseJsonBody(req));

    await connectDB();
    await assertOwnCard(session, cardId, mode === "online" && details.onlineMethod === "upi" && details.upiSource === "rupay-credit");
    await assertCategory(session, type);

    const expense = await Expense.create({
      // Stable id: new rows never carry an email as their owner key.
      userId: ownerId(session),
      date,
      description,
      quantity: quantity ?? null,
      mode,
      cardId,
      type,
      ...details,
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

    const { id, date, description, quantity, mode, type, amount, cardId, ...details } =
      expenseUpdateSchema.parse(await parseJsonBody(req));

    await connectDB();
    await assertOwnCard(session, cardId, mode === "online" && details.onlineMethod === "upi" && details.upiSource === "rupay-credit");
    await assertCategory(session, type, id);

    const updatedExpense = await Expense.findOneAndUpdate(
      {
        _id: id,
        $expr: { $lte: [{ $sum: "$refunds.cents" }, Math.round(Number(amount) * 100)] },
        ...ownerFilter(session), // ownership check, still enforced in the query
      },
      {
        date,
        description,
        quantity: quantity ?? null,
        mode,
        cardId,
        type,
        ...details,
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

async function assertCategory(session: Parameters<typeof ownerId>[0], type: string, expenseId?: string) {
  if ((EXPENSE_TYPES as readonly string[]).includes(type)) {
    if (expenseId && await Expense.exists({ _id: expenseId, ...ownerFilter(session), type })) return;
    throw new HttpError(400, "Create and select your own category in Categories first");
  }
  if (!await ExpenseOption.exists({ _id: type.slice(7), userId: ownerId(session), kind: "category", archived: { $ne: true } })) {
    if (expenseId && await Expense.exists({ _id: expenseId, ...ownerFilter(session), type })) return;
    throw new HttpError(400, "Selected category was not found");
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return unauthorized();
    const { id, amount, date, source } = refundSchema.parse(await parseJsonBody(req));
    const cents = Math.round(Number(amount) * 100);
    if (!Number.isSafeInteger(cents)) throw new HttpError(400, "Refund amount is too large");
    await connectDB();
    // Conditional write makes concurrent refunds unable to exceed the original purchase.
    const updated = await Expense.findOneAndUpdate({
      _id: id, ...ownerFilter(session),
      $expr: { $lte: [{ $add: [{ $sum: "$refunds.cents" }, cents] }, { $round: [{ $multiply: [{ $toDouble: "$amount" }, 100] }, 0] }] },
    }, { $push: { refunds: { cents, date, source } } }, { new: true, runValidators: true });
    if (!updated) throw new HttpError(400, "Expense not found or refund exceeds the remaining amount");
    return Response.json({ message: "Refund recorded" });
  } catch (error) { return handleRouteError(error); }
}
