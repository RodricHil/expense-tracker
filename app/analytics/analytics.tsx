"use client";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics | Expense Tracker",
  description: "View detailed analytics and insights about your spending patterns and financial trends",
  alternates: {
    canonical: "https://expense-tracker-eight-rho-59.vercel.app/analytics",
  },
  keywords: ["expense analytics", "spending insights", "financial reports", "budget analysis"],
  openGraph: {
    title: "Analytics & Insights | Expense Tracker",
    description: "View detailed analytics and insights about your spending patterns and financial trends",
    url: "https://expense-tracker-eight-rho-59.vercel.app/analytics",
    type: "website",
  },
};


import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Navbar from "@/app/components/Navbar";
import DateRangeFilter from "@/app/components/DateRangeFilter";
import { useCurrency } from "@/app/components/CurrencyProvider";

const timeframeOptions = ["Daily", "Weekly", "Monthly", "Yearly"] as const;
const palette = ["#2563EB", "#7C3AED", "#0EA5E9", "#F97316", "#14B8A6", "#F43F5E"];

/**
 * ET-L5 — hydration guard for recharts, without a setState-in-effect.
 *
 * `ResponsiveContainer` measures the DOM, so it must not render during SSR or
 * the server and client markup diverge. The usual `useState(false)` +
 * `useEffect(() => setIsMounted(true))` pattern does that with a cascading
 * render and trips `react-hooks/set-state-in-effect`. `useSyncExternalStore`
 * expresses the same thing directly: the server snapshot is `false`, the client
 * snapshot is `true`, and nothing ever changes afterwards — hence a subscribe
 * function that registers no listener. All three callbacks are module-scope
 * constants so their identities are stable across renders.
 */
const subscribeToNothing = () => () => {};
const getMountedSnapshot = () => true;
const getServerMountedSnapshot = () => false;

/**
 * Chart labels. All four render in UTC because the server buckets by UTC day;
 * formatting a UTC-midnight instant in the viewer's local zone would move a
 * bucket into the previous day for anyone west of Greenwich.
 */
const formatDailyKey = (date: Date) =>
  date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });

const getWeekLabel = (date: Date) => {
  const januaryFirst = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const days = Math.floor((date.getTime() - januaryFirst.getTime()) / 86400000);
  const week = Math.ceil((days + januaryFirst.getUTCDay() + 1) / 7);
  return `${date.getUTCFullYear()} W${week}`;
};

const getMonthLabel = (date: Date) =>
  date.toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

const getYearLabel = (date: Date) => date.getUTCFullYear().toString();

type Timeframe = (typeof timeframeOptions)[number];

type DateRange = {
  startDate: Date;
  endDate: Date;
  label: string;
};

/**
 * §G.4 — what this page now consumes.
 *
 * It used to `fetch("/api/expenses")` with no parameters, receive the account's
 * ENTIRE expense history, and aggregate it in the browser to draw four charts.
 * The server now does the aggregation in a MongoDB `$facet` pipeline and this
 * page reads the result, so it downloads no expense rows at all — the payload
 * is bounded by the length of the selected date range, not by account age.
 */
type Summary = {
  allTimeTotal: number;
  rangeTotal: number;
  byType: { type: string; amount: number }[];
  byMode: { mode: string; amount: number }[];
  /** One bucket per calendar day (UTC), `YYYY-MM-DD`, ascending. */
  byDay: { date: string; amount: number }[];
};

type ExpensesResponse = {
  summary: Summary;
};

const EMPTY_SUMMARY: Summary = {
  allTimeTotal: 0,
  rangeTotal: 0,
  byType: [],
  byMode: [],
  byDay: [],
};

/**
 * §G.3 — the aggregates the server component already computed for the default
 * window, so the charts have data on first paint instead of after a round trip.
 * `initialSummary` is null when the server read failed; this component then
 * fetches on mount, which is the pre-§G.3 behaviour.
 */
type Props = {
  initialRange: { startDate: string; endDate: string; label: string };
  initialSummary: Summary | null;
};

export default function AnalyticsClientPage({
  initialRange,
  initialSummary,
}: Props) {
  const [summary, setSummary] = useState<Summary>(
    initialSummary ?? EMPTY_SUMMARY
  );
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(initialRange.startDate),
    endDate: new Date(initialRange.endDate),
    label: initialRange.label,
  });

  /** See the identical guard in app/dashboard/dashboardclient.tsx. */
  const hasServerData = useRef(initialSummary !== null);
  const [timeframe, setTimeframe] = useState<Timeframe>("Monthly");
  const isMounted = useSyncExternalStore(
    subscribeToNothing,
    getMountedSnapshot,
    getServerMountedSnapshot
  );
  const { currency } = useCurrency();

  useEffect(() => {
    let cancelled = false;

    if (hasServerData.current) {
      // The server already aggregated this exact range during its render.
      hasServerData.current = false;
      return;
    }

    async function loadSummary() {
      // `limit=1` on purpose: this page renders no expense rows, only
      // aggregates. Asking for the smallest legal page keeps the response a
      // fixed size whatever the account contains.
      const params = new URLSearchParams({
        page: "1",
        limit: "1",
        from: dateRange.startDate.toISOString(),
        to: dateRange.endDate.toISOString(),
      });

      const res = await fetch(`/api/expenses?${params.toString()}`);
      if (!res.ok) return;

      const body = (await res.json()) as ExpensesResponse;
      if (!cancelled) setSummary(body.summary);
    }

    loadSummary();

    return () => {
      cancelled = true;
    };
  }, [dateRange]);

  const totalSpent = summary.rangeTotal;

  const categoryTotals = useMemo(
    () =>
      summary.byType.map(
        ({ type, amount }) => [type, amount] as [string, number]
      ),
    [summary]
  );

  const modeTotals = useMemo(
    () => summary.byMode.map(({ mode, amount }) => ({ mode, amount })),
    [summary]
  );

  /**
   * The daily buckets, parsed back into `Date`s. `%Y-%m-%d` is produced by the
   * server in UTC, so it is parsed as UTC midnight here and every label
   * formatter below also renders in UTC — otherwise a bucket would drift a day
   * for viewers west of Greenwich.
   */
  const dayBuckets = useMemo(
    () =>
      summary.byDay.map(({ date, amount }) => ({
        date: new Date(`${date}T00:00:00.000Z`),
        amount,
      })),
    [summary]
  );

  const buildSeries = useCallback(
    (groupBy: (date: Date) => string, rangeDays = false) => {
      const totals: Record<string, number> = {};

      // Rolling day buckets up into weeks/months/years is a client-side sum over
      // at most one entry per day in the range — a bounded amount of work on a
      // payload that no longer contains any expense rows.
      dayBuckets.forEach(({ date, amount }) => {
        const key = groupBy(date);
        totals[key] = (totals[key] || 0) + amount;
      });

      const series = Object.entries(totals)
        .map(([label, amount]) => ({ label, amount }))
        .sort((a, b) => (a.label > b.label ? 1 : -1));

      if (rangeDays && dayBuckets.length) {
        const list: { label: string; amount: number }[] = [];
        const dayMs = 24 * 60 * 60 * 1000;
        for (
          let current = new Date(dateRange.startDate);
          current <= dateRange.endDate;
          current = new Date(current.getTime() + dayMs)
        ) {
          const label = formatDailyKey(current);
          list.push({ label, amount: totals[label] || 0 });
        }
        return list;
      }

      return series;
    },
    [dayBuckets, dateRange]
  );

  const chartData = useMemo(() => {
    switch (timeframe) {
      case "Daily":
        return buildSeries(formatDailyKey, true);
      case "Weekly":
        return buildSeries(getWeekLabel);
      case "Yearly":
        return buildSeries(getYearLabel);
      default:
        return buildSeries(getMonthLabel);
    }
  }, [buildSeries, timeframe]);

  const averageDaily = useMemo(() => {
    const diffDays = Math.max(
      Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1,
      1
    );
    return Math.round(totalSpent / diffDays);
  }, [totalSpent, dateRange]);

  const topCategories = categoryTotals.slice(0, 8);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-slate-950 pt-24 pb-16 text-slate-100">
        <div className="px-6 lg:px-8">
          <div className="mb-8 rounded-[2rem] border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/20 backdrop-blur-xl">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

              {/* LEFT CONTENT */}
              <div className="max-w-xl">
                <p className="text-sm uppercase tracking-[0.26em] text-sky-400">Analytics</p>
                <h1 className="mt-2 text-4xl font-black tracking-tight text-white">
                  Spending analytics with modern insights
                </h1>
                <p className="mt-3 text-slate-300">
                  See your daily, weekly, monthly, yearly, and custom spending trends with category and mode breakdowns.
                </p>
              </div>

              {/* RIGHT CARDS */}
              <div className="grid w-full gap-4 sm:grid-cols-3 lg:max-w-xl">

                {/* CARD */}
                <div className="flex flex-col justify-between rounded-3xl border border-slate-800 bg-slate-950/80 p-5 h-28">
                  <p className="text-xs font-bold uppercase tracking-[0.26em] text-slate-500">
                    Total spent
                  </p>
                  <p className="text-xl font-semibold text-white whitespace-nowrap">
                    {currency} {totalSpent.toLocaleString()}
                  </p>
                </div>

                {/* CARD */}
                <div className="flex flex-col justify-between rounded-3xl border border-slate-800 bg-slate-950/80 p-5 h-28">
                  <p className="text-xs font-bold uppercase tracking-[0.26em] text-slate-500">
                    Average / day
                  </p>
                  <p className="text-xl font-semibold text-white whitespace-nowrap">
                    {currency} {averageDaily.toLocaleString()}
                  </p>
                </div>

                {/* CARD */}
                <div className="flex flex-col justify-between rounded-3xl border border-slate-800 bg-slate-950/80 p-5 h-28">
                  <p className="text-xs font-bold uppercase tracking-[0.26em] text-slate-500">
                    Timeframe
                  </p>
                  <p className="text-xl font-semibold text-white truncate">
                    {dateRange.label}
                  </p>
                </div>

              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/20">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.26em] text-slate-400">Date range</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Refine your window</h2>
              </div>
              {/* <div className="flex flex-wrap gap-3">
                  {timeframeOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setTimeframe(option)}
                      className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${timeframe === option
                          ? "bg-slate-100 text-slate-950"
                          : "border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white"
                        }`}
                    >
                      {option}
                    </button>
                  ))}
                </div> */}
            </div>

            <div className="mt-6">
              <DateRangeFilter onRangeChange={setDateRange} />
            </div>
          </div>

          <div className="grid gap-6 my-6">
            <div className="rounded-[2rem] border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/20">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.26em] text-slate-400">Trend view</p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">Spending over time</h3>
                </div>
                <p className="text-sm text-slate-400">{timeframe} data</p>
              </div>

              {chartData.length === 0 ? (
                <div className="mt-12 rounded-3xl bg-slate-950/60 p-8 text-center text-slate-400">No chart data available for this range.</div>
              ) : (
                <div className="mt-8 h-[360px] w-full">
                  {isMounted ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={320}>
                      <AreaChart data={chartData} margin={{ top: 10, right: 24, left: -12, bottom: 0 }}>
                        <defs>
                          <linearGradient id="curve" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.85} />
                            <stop offset="100%" stopColor="#38BDF8" stopOpacity={0.12} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#334155" strokeDasharray="4 4" />
                        <XAxis dataKey="label" tick={{ fill: "#94A3B8", fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#94A3B8", fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: "#0F172A", border: "1px solid #334155" }} labelStyle={{ color: "#F8FAFC" }} />
                        <Area type="monotone" dataKey="amount" stroke="#38BDF8" fill="url(#curve)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full w-full rounded-3xl bg-slate-950/60" />
                  )}
                </div>
              )}
            </div>


          </div>


          <div className="mb-8 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">


            <div className="rounded-[2rem] border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/20">
              <p className="text-sm uppercase tracking-[0.26em] text-slate-400">Top categories</p>
              <div className="mt-5 space-y-4">
                {topCategories.length === 0 ? (
                  <p className="text-slate-400">No expenses to analyze for this range.</p>
                ) : (
                  topCategories.map(([category, amount], index) => {
                    const ratio = totalSpent ? (amount / totalSpent) * 100 : 0;
                    return (
                      <div key={category} className="space-y-2 rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium capitalize text-white">{category}</p>
                          <p className="text-sm text-slate-400">{currency} {amount.toLocaleString()}</p>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                          <div className="h-full rounded-full bg-linear-to-r from-sky-500 to-cyan-400" style={{ width: `${Math.min(ratio, 100)}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[2rem] border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/20">
                <p className="text-sm uppercase tracking-[0.26em] text-slate-400">Category breakdown</p>
                <div className="mt-6 space-y-4">
                  {categoryTotals.length === 0 ? (
                    <p className="text-slate-400">No category data available.</p>
                  ) : (
                    <div className="space-y-3">
                      {categoryTotals.slice(0, 5).map(([category, amount], index) => (
                        <div key={category} className="flex items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                          <span className="text-sm text-slate-200 capitalize">{category}</span>
                          <span className="text-sm font-semibold text-white">{currency} {amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.26em] text-slate-400">Payment mode</p>
                    <h3 className="mt-2 text-xl font-semibold text-white">Online vs Cash</h3>
                  </div>
                </div>
                <div className="mt-8 h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={272}>
                    <PieChart>
                      <Pie data={modeTotals} dataKey="amount" nameKey="mode" innerRadius={58} outerRadius={98} paddingAngle={4}>
                        {modeTotals.map((entry, index) => (
                          <Cell key={entry.mode} fill={palette[index % palette.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "#0F172A", border: "1px solid #334155" }}
                        labelStyle={{ color: "#F8FAFC" }}
                        itemStyle={{ color: "#F8FAFC" }}
                      />                      <Legend verticalAlign="bottom" wrapperStyle={{ color: "#94A3B8" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>


          <div className="rounded-[2rem] border border-slate-800 bg-slate-900/80 mt-6 p-6 shadow-2xl shadow-slate-950/20">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.26em] text-slate-400">Insights</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">What the numbers mean</h3>
              </div>
              <Link href="/dashboard" className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200">
                Return to dashboard
              </Link>
            </div>
            <div className="mt-6 space-y-4 text-slate-300">
              <p className="leading-7">
                The line chart tracks your spending tempo over the selected date range. Switching between daily, weekly, monthly, and yearly views helps you detect fast-moving spending habits and seasonal patterns.
              </p>
              <p className="leading-7">
                Category breakdown highlights the biggest cost centers in your budget so you can act where it matters most. The payment mode chart surfaces cash versus online spending shares.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
