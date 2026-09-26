"use client";

import { formatAmount, inclusiveDays } from "@/lib/format";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCurrency } from "@/app/components/CurrencyProvider";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faCalendarDay, faChartLine, faCircleExclamation, faLayerGroup, faPen, faPlus, faReceipt, faRotateRight, faTrash, faWallet, faCreditCard } from "@fortawesome/free-solid-svg-icons";
import EditExpenseModal from "@/app/components/EditExpenseModal";
import { useNotification } from "@/app/components/elements/NotificationProvider";
import DateRangeFilter from "@/app/components/DateRangeFilter";
import Pagination from "@/app/components/Pagination";
import ConfirmationModal from "@/app/components/ConfirmationModal";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import PaymentMethod from "@/app/components/PaymentMethod";
import PaymentBreakdown from "@/app/components/PaymentBreakdown";
import CategoryBreakdown from "@/app/components/CategoryBreakdown";
import { RowSkeletons, StatSkeletons } from "@/app/components/Skeleton";
import PaymentFilter, { ALL_PAYMENTS, appendPaymentFilter, describePaymentFilter, isSamePaymentFilter, type PaymentFilterValue } from "@/app/components/PaymentFilter";
import { useCards } from "@/app/components/CardsProvider";

type Expense = {
  _id: string;
  date: string;
  description: string;
  quantity?: number;
  mode: string;
  cardId?: string | null;
  type: string;
  amount: number;
};

type DateRange = {
  startDate: Date;
  endDate: Date;
  label: string;
};

/**
 * §G.4 — the envelope `GET /api/expenses` now returns.
 *
 * `expenses` is one PAGE of rows, not the account's history, and the totals are
 * computed by MongoDB over the whole selected range. That is the point of the
 * change: this page no longer downloads every row a user has ever created just
 * to add up three numbers.
 */
type PageMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
};

type Summary = {
  allTimeTotal: number;
  rangeTotal: number;
  byType: { type: string; amount: number }[];
  byMode: { mode: string; amount: number }[];
  byDay: { date: string; amount: number }[];
};

type ExpensesResponse = {
  expenses: Expense[];
  pagination: PageMeta;
  summary: Summary;
};

const ITEMS_PER_PAGE = 20;

const EMPTY_PAGINATION: PageMeta = {
  page: 1,
  limit: ITEMS_PER_PAGE,
  total: 0,
  totalPages: 1,
  hasMore: false,
};

const EMPTY_SUMMARY: Summary = {
  allTimeTotal: 0,
  rangeTotal: 0,
  byType: [],
  byMode: [],
  byDay: [],
};

/**
 * §G.3 — what the server component hands down.
 *
 * `initialRange` is computed on the SERVER so the first render and this
 * component's initial state describe the same instants; deriving the window
 * from `new Date()` in the browser would disagree by however long the response
 * took and force a redundant refetch. `initialData` is null when the server
 * read failed, in which case this component falls back to fetching on mount —
 * the pre-§G.3 behaviour.
 */
type Props = {
  initialRange: { startDate: string; endDate: string; label: string };
  initialData: ExpensesResponse | null;
};

export default function ExpensesPage({ initialRange, initialData }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>(
    initialData?.expenses ?? []
  );
  const [pagination, setPagination] = useState<PageMeta>(
    initialData?.pagination ?? EMPTY_PAGINATION
  );
  const [summary, setSummary] = useState<Summary>(
    initialData?.summary ?? EMPTY_SUMMARY
  );
  // Bumped by the mutation handlers to re-run the load effect. Cheaper and
  // safer than a second copy of the fetch logic, and it keeps the effect's
  // dependency array complete.
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(initialRange.startDate),
    endDate: new Date(initialRange.endDate),
    label: initialRange.label,
  });

  /**
   * True while the state below is still exactly what the server rendered.
   * The mount effect consumes it and skips its fetch, which is what actually
   * removes the waterfall — seeding initial state alone would not, because the
   * effect would immediately re-request the identical page.
   */
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilterValue>(ALL_PAYMENTS);
  const { cards } = useCards();
  const hasServerData = useRef(initialData !== null);
  /** False only until the first data arrives; later loads dim the page instead of showing skeletons. */
  const [hasData, setHasData] = useState(initialData !== null);
  const { currency } = useCurrency();

  /**
   * §G.4 — the server is the only source of expense state AND of the totals.
   *
   * This used to fetch `/api/expenses` with no parameters and then filter,
   * total and slice in the browser. It now sends the selected date range and
   * the requested page, and the server returns exactly one page of rows plus
   * MongoDB-computed aggregates. Changing the date range or the page therefore
   * costs one bounded round trip instead of one unbounded download.
   */
  const loadExpenses = useCallback(
    async (range: DateRange, page: number, filter: PaymentFilterValue): Promise<ExpensesResponse | null> => {
      const params = appendPaymentFilter(new URLSearchParams({
        page: String(page),
        limit: String(ITEMS_PER_PAGE),
        from: range.startDate.toISOString(),
        to: range.endDate.toISOString(),
      }), filter);

      const res = await fetch(`/api/expenses?${params.toString()}`);
      if (!res.ok) return null;
      return (await res.json()) as ExpensesResponse;
    },
    []
  );

  /** Re-run the load effect after a mutation, without duplicating the fetch. */
  const fetchExpenses = useCallback(() => {
    setLoading(true);
    setError("");
    setReloadToken((token) => token + 1);
  }, []);

  const { showNotification } = useNotification();

  /**
   * Read straight off the server-computed summary. These were three client-side
   * reductions over the full history; they are now single numbers that arrive
   * with the page and stay correct however large the account grows.
   */
  const totalSpent = summary.allTimeTotal;
  const filteredSpent = summary.rangeTotal;

  const handleDateRangeChange = (range: DateRange) => {
    if (range.startDate.getTime() === dateRange.startDate.getTime() && range.endDate.getTime() === dateRange.endDate.getTime()) return;
    setLoading(true);
    setError("");
    setDateRange(range);
    setCurrentPage(1); // Reset to page 1 when date range changes
  };

  const handlePaymentFilterChange = (filter: PaymentFilterValue) => {
    if (isSamePaymentFilter(filter, paymentFilter)) return;
    setLoading(true);
    setError("");
    setPaymentFilter(filter);
    setCurrentPage(1);
  };
  const filterLabel = describePaymentFilter(paymentFilter, cards);

  useEffect(() => {
    let cancelled = false;

    // The load is awaited inside the effect rather than kicked off by a bare
    // call: the state setters therefore run a network round trip later, not
    // synchronously in the effect body (no cascading render), and `cancelled`
    // discards a response that arrives after the component has unmounted or
    // after a newer request has superseded this one.
    if (hasServerData.current) {
      // The very first effect run: the server already fetched this exact page
      // for this exact range. Every later run (range change, page change,
      // post-mutation refresh) falls through and fetches normally.
      hasServerData.current = false;
      return;
    }

    async function load() {
      try {
        const data = await loadExpenses(dateRange, currentPage, paymentFilter);
        if (cancelled) return;
        if (!data) throw new Error("Load failed");
        setExpenses(data.expenses);
        setPagination(data.pagination);
        setSummary(data.summary);
        setHasData(true);
        setError("");
      } catch {
        if (!cancelled) setError("Couldn’t load expenses. Try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [loadExpenses, dateRange, currentPage, paymentFilter, reloadToken]);

  const handleDelete = (id: string) => {
    setDeletingExpenseId(id);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingExpenseId) return;

    setIsDeleting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deletingExpenseId }),
      });
      if (!res.ok) throw new Error("Delete failed");
      setShowDeleteConfirm(false);
      setDeletingExpenseId(null);
      if (expenses.length === 1 && currentPage > 1) {
        setLoading(true);
        setCurrentPage((page) => page - 1);
      } else fetchExpenses();
      showNotification("Expense deleted", "success");
    } catch {
      showNotification("Couldn’t delete the expense. Try again.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const dateLabel = (value: string) => new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const actions = (expense: Expense) => <div className="flex justify-end gap-1">
    <button type="button" className="btn btn-icon btn-sm btn-ghost" aria-label={`Edit ${expense.description}`} title="Edit" onClick={() => setEditingExpense(expense)}><FontAwesomeIcon icon={faPen} /></button>
    <button type="button" className="btn btn-icon btn-sm btn-ghost btn-danger" aria-label={`Delete ${expense.description}`} title="Delete" onClick={() => handleDelete(expense._id)}><FontAwesomeIcon icon={faTrash} /></button>
  </div>;

  /** No data at all yet (the server read failed and the first fetch is in flight). */
  const firstLoad = !hasData;
  const days = inclusiveDays(dateRange.startDate, dateRange.endDate);

  return <>
    <Navbar />
    <main className="app-shell">
      <div className="page-heading"><div><h1>Expenses</h1><p>{dateRange.label}{filterLabel && ` · ${filterLabel}`}</p></div><Link href="/add-expenses" className="btn btn-primary"><FontAwesomeIcon icon={faPlus} />Add expense</Link></div>
      <div className="stack">
        <DateRangeFilter onRangeChange={handleDateRangeChange}><PaymentFilter value={paymentFilter} onChange={handlePaymentFilterChange} /></DateRangeFilter>
        {/* Announced, not shown: a visible "Updating…" line pushed the page down on every change. */}
        <p role="status" className="sr-only">{loading ? "Updating expenses…" : ""}</p>
        {error && <div className="error-state" role="alert"><p><FontAwesomeIcon icon={faCircleExclamation} aria-hidden="true" />{error}</p><button type="button" className="btn btn-sm" onClick={fetchExpenses}><FontAwesomeIcon icon={faRotateRight} />Retry</button></div>}
        {!error && firstLoad && <>
          <StatSkeletons />
          <section className="panel"><RowSkeletons /></section>
        </>}
        {!error && !firstLoad && <div className="stack" aria-busy={loading} style={{ opacity: loading ? .6 : 1, transition: "opacity 160ms" }}>
          <div className="stats">
            <div className="stat"><span className="stat-icon"><FontAwesomeIcon icon={faWallet} aria-hidden="true" /></span><p className="stat-label">Spent in range</p><p className="stat-value">{currency} {formatAmount(filteredSpent)}</p>{filterLabel && <p className="stat-hint">{filterLabel} only</p>}</div>
            <div className="stat"><span className="stat-icon"><FontAwesomeIcon icon={faCalendarDay} aria-hidden="true" /></span><p className="stat-label">Daily average</p><p className="stat-value">{currency} {formatAmount(filteredSpent / days)}</p><p className="stat-hint">Over {days} {days === 1 ? "day" : "days"}</p></div>
            <div className="stat"><span className="stat-icon"><FontAwesomeIcon icon={faReceipt} aria-hidden="true" /></span><p className="stat-label">Transactions</p><p className="stat-value">{pagination.total}</p></div>
            <div className="stat"><span className="stat-icon"><FontAwesomeIcon icon={faChartLine} aria-hidden="true" /></span><p className="stat-label">All-time spending</p><p className="stat-value">{currency} {formatAmount(totalSpent)}</p>{filterLabel && <p className="stat-hint">All payment methods</p>}</div>
          </div>
          <div className="dashboard-grid">
            <section className="panel" aria-labelledby="transactions-heading">
              <div className="panel-heading"><h2 id="transactions-heading"><FontAwesomeIcon icon={faReceipt} className="heading-icon" aria-hidden="true" />Transactions <span className="count-badge">{pagination.total}</span></h2><Link href="/analytics" className="text-link">View analytics<FontAwesomeIcon icon={faArrowRight} aria-hidden="true" /></Link></div>
              {pagination.total === 0 ? <div className="empty-state"><span className="empty-state-icon"><FontAwesomeIcon icon={faReceipt} aria-hidden="true" /></span><strong>{filterLabel ? `No ${filterLabel} payments in this range` : "No expenses in this range"}</strong><p>{filterLabel ? "Try another payment filter or a wider date range." : "Try a wider date range, or add your first expense."}</p><Link href="/add-expenses" className="btn btn-primary"><FontAwesomeIcon icon={faPlus} />Add expense</Link></div> : <>
                <div className="hidden lg:block table-scroll">
                  <table className="expense-table"><caption className="sr-only">Expenses for {dateRange.label}{filterLabel && `, ${filterLabel}`}</caption>
                    <thead><tr><th scope="col">Date</th><th scope="col">Description</th><th scope="col">Category</th><th scope="col">Payment</th><th scope="col" className="text-right">Amount</th><th scope="col" className="text-right"><span className="sr-only">Actions</span></th></tr></thead>
                    <tbody>{expenses.map((expense) => <tr key={expense._id}>
                      <td className="date">{dateLabel(expense.date)}</td><td className="description">{expense.description}</td><td><span className="badge category-badge">{expense.type}</span></td><td><PaymentMethod mode={expense.mode} cardId={expense.cardId} /></td><td className="text-right money">{currency} {formatAmount(expense.amount)}</td><td>{actions(expense)}</td>
                    </tr>)}</tbody>
                  </table>
                </div>
                <div className="lg:hidden">{expenses.map((expense) => <article className="mobile-expense" key={expense._id}>
                  <div className="flex justify-between items-baseline gap-3"><p className="mobile-expense-title">{expense.description}</p><span className="money">{currency} {formatAmount(expense.amount)}</span></div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"><span className="muted">{dateLabel(expense.date)}</span><PaymentMethod mode={expense.mode} cardId={expense.cardId} inline /></div>
                  <div className="flex justify-between items-center gap-3"><span className="badge category-badge">{expense.type}</span>{actions(expense)}</div>
                </article>)}</div>
                <Pagination currentPage={currentPage} totalPages={pagination.totalPages} onPageChange={(page) => { setLoading(true); setCurrentPage(page); }} itemsPerPage={pagination.limit} totalItems={pagination.total} />
              </>}
            </section>
            <aside className="dashboard-aside" aria-label="Spending summary">
              <section className="panel" aria-labelledby="payment-heading"><div className="panel-heading"><h2 id="payment-heading"><FontAwesomeIcon icon={faCreditCard} className="heading-icon" aria-hidden="true" />Payment methods</h2></div><PaymentBreakdown byMode={summary.byMode} total={filteredSpent} currency={currency} /></section>
              <section className="panel" aria-labelledby="category-heading"><div className="panel-heading"><h2 id="category-heading"><FontAwesomeIcon icon={faLayerGroup} className="heading-icon" aria-hidden="true" />Top categories</h2><span className="panel-meta">Share of total</span></div><CategoryBreakdown categories={summary.byType} total={filteredSpent} currency={currency} limit={5} /></section>
            </aside>
          </div>
        </div>}
      </div>
    </main>
    {editingExpense && <EditExpenseModal expense={editingExpense} onClose={() => setEditingExpense(null)} onUpdated={fetchExpenses} />}
    {showDeleteConfirm && <ConfirmationModal title="Delete expense?" message="This expense will be permanently removed." confirmText="Delete expense" cancelText="Cancel" isLoading={isDeleting} isDangerous onConfirm={handleConfirmDelete} onCancel={() => { setShowDeleteConfirm(false); setDeletingExpenseId(null); }} />}
  </>;
}
