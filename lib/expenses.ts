import type { PipelineStage } from "mongoose";
import type { Session } from "next-auth";
import { connectDB } from "@/lib/mongodb";
import Expense from "@/models/Expense";
import type { ExpenseQuery } from "@/lib/validation";

/**
 * §G.3 / §G.4 — the single expense data-access module.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Two consumers now need exactly the same query: the `GET /api/expenses` route
 * handler, and the dashboard/analytics *server components*, which read MongoDB
 * directly on the first render instead of shipping a spinner to the browser and
 * making it fetch (§G.3 — the client-fetch waterfall). Having one module means
 * the two can never drift, and — critically — that the ownership scoping below
 * is written once rather than twice.
 *
 * OWNERSHIP IS ENFORCED HERE, INSIDE THE QUERY FILTER (§E positive control).
 * Not after the fetch, not in the caller. Every read path in the application
 * goes through `ownerFilter()`, so there is exactly one place to audit.
 */

/**
 * ET-M1 — expense ownership.
 *
 * `session.user.id` is the immutable Google `sub`. `session.user.email` is
 * mutable: Google lets a user change their address, and a freed address can be
 * reassigned to somebody else. Ownership must not hang off the mutable one, so
 * every NEW expense is written with the stable id.
 */
export function ownerId(session: Session): string {
  // The email fallback only fires for a session minted before `token.id`
  // existed. It keeps such a session writing under the same key it can already
  // read, rather than orphaning the row under `undefined`.
  return session.user?.id ?? (session.user?.email as string);
}

/**
 * TRANSITIONAL — remove only after the migration has been applied AND verified.
 *
 * Every expense written before Round 5 stores the owner's EMAIL in `userId`.
 * Switching reads to the stable id alone would make all of that data invisible
 * to its owner, so reads, updates and deletes match either key.
 *
 * The removal procedure, in order:
 *   1. `node --env-file=.env.local scripts/migrate-userid.mjs`          (dry run)
 *   2. `node --env-file=.env.local scripts/migrate-userid.mjs --apply`  (writes)
 *   3. Verify `db.expenses.countDocuments({ userId: { $regex: "@" } })` is 0
 *      and that the "unmapped" count printed by the script is 0.
 *   4. Then, and only then, replace every `ownerFilter(session)` call with
 *      `{ userId: ownerId(session) }` and delete this function.
 *
 * Matching on a two-element `$in` still uses the `userId` index, so this costs
 * nothing measurable in the meantime.
 */
export function ownerFilter(session: Session): { userId: { $in: string[] } } {
  const ids = [session.user?.id, session.user?.email].filter(
    (value): value is string => typeof value === "string" && value.length > 0
  );

  return { userId: { $in: Array.from(new Set(ids)) } };
}

/**
 * Shape of an expense document as returned by `.lean()`.
 *
 * `models/Expense.ts` is an untyped Mongoose model, so queries resolve to `any`.
 * This is the minimum contract the read path relies on: an `amount` that can be
 * stringified (it is a `Decimal128`), plus whatever else the document carries
 * and is spread through untouched.
 */
type LeanExpense = Record<string, unknown> & { amount: { toString(): string } };

/** A `$facet` sub-pipeline result row: a grouping key plus its rolled-up totals. */
type FacetBucket = { _id: string | null; amount: number; count?: number };

type ExpenseFacets = {
  allTime?: FacetBucket[];
  rangeTotal?: FacetBucket[];
  byType?: FacetBucket[];
  byMode?: FacetBucket[];
  byDay?: FacetBucket[];
};

export type ExpensePage = {
  expenses: Record<string, unknown>[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  summary: {
    allTimeTotal: number;
    rangeTotal: number;
    byType: { type: string; amount: number }[];
    byMode: { mode: string; amount: number }[];
    byDay: { date: string; amount: number }[];
  };
};

/**
 * Money crosses the wire as a JSON number, and `$toDouble` on a Decimal128
 * reintroduces binary floating point. Round at the edge so the client never
 * renders `1234.5600000000002`.
 */
function money(value: number | undefined): number {
  return Math.round((value ?? 0) * 100) / 100;
}

/**
 * Make the rows structurally cloneable.
 *
 * A `.lean()` document still holds an `ObjectId` in `_id` and `Date`s in
 * `date`/`createdAt`. `Response.json` flattens those to strings on its own, but
 * a SERVER COMPONENT hands its props to React's serializer, which rejects class
 * instances ("Only plain objects can be passed to Client Components"). Running
 * the same JSON round-trip here makes both consumers see byte-identical data —
 * and keeps the HTTP response shape exactly what it was before §G.4.
 */
function toPlainRows(rows: LeanExpense[]): Record<string, unknown>[] {
  const formatted = rows.map((row) => ({
    ...row,
    amount: parseFloat(row.amount.toString()),
  }));

  return JSON.parse(JSON.stringify(formatted)) as Record<string, unknown>[];
}

/**
 * One page of a user's expenses plus MongoDB-computed totals for the whole
 * selected range.
 *
 * Response size is bounded by `query.limit` (capped in `lib/validation.ts`) and
 * by the length of the date range — never by how many expenses the account has
 * accumulated. That is the whole point of §G.4.
 */
export async function loadExpensePage(
  session: Session,
  query: ExpenseQuery
): Promise<ExpensePage> {
  const { page, limit, from, to } = query;

  await connectDB();

  const owner = ownerFilter(session);

  // Built from parsed `Date` objects only — a client cannot inject an operator
  // here, because zod already rejected anything that is not a date.
  const dateRange: { $gte?: Date; $lte?: Date } = {};
  if (from) dateRange.$gte = from;
  if (to) dateRange.$lte = to;
  const dateFilter: PipelineStage.Match["$match"] =
    from || to ? { date: dateRange } : {};

  // `$match` on the owner FIRST so every facet below inherits the ownership
  // scope; the per-facet `$match` only narrows by date.
  const summaryPipeline: PipelineStage[] = [
    { $match: owner },
    {
      $facet: {
        allTime: [
          { $group: { _id: null, amount: { $sum: { $toDouble: "$amount" } } } },
        ],
        rangeTotal: [
          { $match: dateFilter },
          {
            $group: {
              _id: null,
              amount: { $sum: { $toDouble: "$amount" } },
              count: { $sum: 1 },
            },
          },
        ],
        byType: [
          { $match: dateFilter },
          {
            $group: { _id: "$type", amount: { $sum: { $toDouble: "$amount" } } },
          },
          { $sort: { amount: -1 } },
        ],
        byMode: [
          { $match: dateFilter },
          {
            $group: { _id: "$mode", amount: { $sum: { $toDouble: "$amount" } } },
          },
          { $sort: { amount: -1 } },
        ],
        // One bucket per calendar day in UTC. Bounded by the length of the
        // requested range, not by the number of expenses in it — this is what
        // lets the analytics page draw daily/weekly/monthly/yearly series
        // without ever downloading a single expense row.
        byDay: [
          { $match: dateFilter },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$date",
                  timezone: "UTC",
                },
              },
              amount: { $sum: { $toDouble: "$amount" } },
            },
          },
          { $sort: { _id: 1 } },
        ],
      },
    },
  ];

  const [rows, facetResult] = await Promise.all([
    Expense.find({ ...owner, ...dateFilter })
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean() as Promise<LeanExpense[]>,
    Expense.aggregate(summaryPipeline) as Promise<ExpenseFacets[]>,
  ]);

  const facets: ExpenseFacets = facetResult[0] ?? {};
  const total = facets.rangeTotal?.[0]?.count ?? 0;

  return {
    expenses: toPlainRows(rows),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasMore: page * limit < total,
    },
    summary: {
      allTimeTotal: money(facets.allTime?.[0]?.amount),
      rangeTotal: money(facets.rangeTotal?.[0]?.amount),
      byType: (facets.byType ?? []).map((bucket) => ({
        type: bucket._id ?? "unknown",
        amount: money(bucket.amount),
      })),
      byMode: (facets.byMode ?? []).map((bucket) => ({
        mode: bucket._id ?? "unknown",
        amount: money(bucket.amount),
      })),
      byDay: (facets.byDay ?? []).map((bucket) => ({
        date: bucket._id ?? "",
        amount: money(bucket.amount),
      })),
    },
  };
}

/**
 * The window both data pages open on: the last 30 days, inclusive, in UTC.
 *
 * Computed on the SERVER so the first render and the client's initial state
 * agree on the same instants. Deriving it independently in the browser (from
 * `new Date()`) would produce a slightly different range, which is both a
 * hydration hazard and an immediate redundant refetch.
 */
export function defaultDateRange(): {
  startDate: string;
  endDate: string;
  label: string;
} {
  const end = new Date();
  end.setUTCHours(23, 59, 59, 999);

  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 29);
  start.setUTCHours(0, 0, 0, 0);

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    label: "Last 30 Days",
  };
}
