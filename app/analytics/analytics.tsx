"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Navbar from "@/app/components/Navbar";
import DateRangeFilter from "@/app/components/DateRangeFilter";
import CategoryBreakdown from "@/app/components/CategoryBreakdown";
import { useCurrency } from "@/app/components/CurrencyProvider";
import { formatAmount, inclusiveDays } from "@/lib/format";
import { buildSpendingSeries, type Timeframe } from "@/lib/chart-data";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarCheck, faCalendarDay, faChartColumn, faCircleExclamation, faCreditCard, faLayerGroup, faPlus, faRotateRight, faTrophy, faWallet } from "@fortawesome/free-solid-svg-icons";
import PaymentBreakdown from "@/app/components/PaymentBreakdown";
import { StatSkeletons } from "@/app/components/Skeleton";
import PaymentFilter, { ALL_PAYMENTS, appendPaymentFilter, describePaymentFilter, isSamePaymentFilter, type PaymentFilterValue } from "@/app/components/PaymentFilter";
import { useCards } from "@/app/components/CardsProvider";

const timeframeOptions: Timeframe[] = ["Daily", "Weekly", "Monthly", "Yearly"];
const subscribeToNothing = () => () => {};
const getMountedSnapshot = () => true;
const getServerMountedSnapshot = () => false;
type DateRange = { startDate: Date; endDate: Date; label: string };
type Summary = {
  allTimeTotal: number;
  rangeTotal: number;
  byType: { type: string; amount: number }[];
  byMode: { mode: string; amount: number }[];
  byDay: { date: string; amount: number }[];
};
const EMPTY_SUMMARY: Summary = { allTimeTotal: 0, rangeTotal: 0, byType: [], byMode: [], byDay: [] };
type Props = { initialRange: { startDate: string; endDate: string; label: string }; initialSummary: Summary | null };

export default function AnalyticsClientPage({ initialRange, initialSummary }: Props) {
  const [summary, setSummary] = useState(initialSummary ?? EMPTY_SUMMARY);
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: new Date(initialRange.startDate), endDate: new Date(initialRange.endDate), label: initialRange.label });
  const [timeframe, setTimeframe] = useState<Timeframe>("Daily");
  const [loading, setLoading] = useState(!initialSummary);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const hasServerData = useRef(initialSummary !== null);
  const isMounted = useSyncExternalStore(subscribeToNothing, getMountedSnapshot, getServerMountedSnapshot);
  const { currency } = useCurrency();

  const [paymentFilter, setPaymentFilter] = useState<PaymentFilterValue>(ALL_PAYMENTS);
  const { cards } = useCards();
  const filterLabel = describePaymentFilter(paymentFilter, cards);
  const changePaymentFilter = (filter: PaymentFilterValue) => {
    if (isSamePaymentFilter(filter, paymentFilter)) return;
    setLoading(true);
    setError("");
    setPaymentFilter(filter);
  };

  const changeRange = (range: DateRange) => {
    if (range.startDate.getTime() === dateRange.startDate.getTime() && range.endDate.getTime() === dateRange.endDate.getTime()) return;
    setLoading(true);
    setError("");
    setDateRange(range);
  };

  useEffect(() => {
    if (hasServerData.current) { hasServerData.current = false; return; }
    const controller = new AbortController();
    async function load() {
      try {
        const params = appendPaymentFilter(new URLSearchParams({ page: "1", limit: "1", from: dateRange.startDate.toISOString(), to: dateRange.endDate.toISOString() }), paymentFilter);
        const res = await fetch(`/api/expenses?${params}`, { signal: controller.signal });
        if (!res.ok) throw new Error("Unable to load analytics");
        const body = await res.json();
        if (!controller.signal.aborted) { setSummary(body.summary); setError(""); }
      } catch {
        if (!controller.signal.aborted) setError("Couldn’t load this range. Try again.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [dateRange, paymentFilter, retry]);

  const chartData = useMemo(() => buildSpendingSeries(summary.byDay, dateRange.startDate, dateRange.endDate, timeframe), [summary.byDay, dateRange, timeframe]);
  const total = summary.rangeTotal;
  const days = inclusiveDays(dateRange.startDate, dateRange.endDate);
  const average = total / days;
  const topCategory = [...summary.byType].sort((a, b) => b.amount - a.amount)[0];
  const firstLoad = loading && !initialSummary && summary === EMPTY_SUMMARY;
  const peak = chartData.reduce<(typeof chartData)[number] | null>((best, row) => !best || row.amount > best.amount ? row : best, null);
  const axisFormat = (value: number) => new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(value);

  return <>
    <Navbar />
    <main className="app-shell">
      <div className="page-heading"><div><h1>Analytics</h1><p>{dateRange.label}{filterLabel && ` · ${filterLabel}`}</p></div><Link href="/add-expenses" className="btn btn-primary"><FontAwesomeIcon icon={faPlus} />Add expense</Link></div>
      <div className="stack">
        <DateRangeFilter onRangeChange={changeRange}><PaymentFilter value={paymentFilter} onChange={changePaymentFilter} /></DateRangeFilter>
        <p role="status" className="sr-only">{loading ? "Updating analytics…" : ""}</p>
        {error && <div className="error-state" role="alert"><p><FontAwesomeIcon icon={faCircleExclamation} aria-hidden="true" />{error}</p><button type="button" className="btn btn-sm" onClick={() => { setLoading(true); setError(""); setRetry((n) => n + 1); }}><FontAwesomeIcon icon={faRotateRight} />Retry</button></div>}
        {!error && firstLoad && <><StatSkeletons /><section className="panel" style={{ height: 420 }} aria-hidden="true" /></>}
        {!error && !firstLoad && <div className="stack" aria-busy={loading} style={{ opacity: loading ? .6 : 1, transition: "opacity 160ms" }}>
          <div className="stats">
            <div className="stat"><span className="stat-icon"><FontAwesomeIcon icon={faWallet} aria-hidden="true" /></span><p className="stat-label">Spent in range</p><p className="stat-value">{currency} {formatAmount(total)}</p>{filterLabel && <p className="stat-hint">{filterLabel} only</p>}</div>
            <div className="stat"><span className="stat-icon"><FontAwesomeIcon icon={faCalendarDay} aria-hidden="true" /></span><p className="stat-label">Daily average</p><p className="stat-value">{currency} {formatAmount(average)}</p></div>
            <div className="stat"><span className="stat-icon"><FontAwesomeIcon icon={faCalendarCheck} aria-hidden="true" /></span><p className="stat-label">Days with expenses</p><p className="stat-value">{summary.byDay.length}<span className="unit">/ {days}</span></p></div>
            <div className="stat"><span className="stat-icon"><FontAwesomeIcon icon={faTrophy} aria-hidden="true" /></span><p className="stat-label">Top category</p><p className="stat-value capitalize" style={{ fontSize: "var(--fs-section)" }}>{topCategory?.type ?? "—"}</p>{topCategory && <p className="stat-hint">{currency} {formatAmount(topCategory.amount)}</p>}</div>
          </div>
          <section className="panel" aria-labelledby="chart-heading">
            <div className="panel-heading"><h2 id="chart-heading"><FontAwesomeIcon icon={faChartColumn} className="heading-icon" aria-hidden="true" />Spending over time</h2><div className="segmented" role="group" aria-label="Chart grouping">{timeframeOptions.map((option) => <button key={option} type="button" className="segment" aria-pressed={timeframe === option} onClick={() => setTimeframe(option)}>{option}</button>)}</div></div>
            <div className="flex justify-between gap-4 flex-wrap text-xs muted"><span>Amount ({currency})</span>{peak && total > 0 && <span>Highest: <span className="text-secondary font-medium">{peak.label} · {currency} {formatAmount(peak.amount)}</span></span>}</div>
            {!summary.byDay.length ? <div className="empty-state"><span className="empty-state-icon"><FontAwesomeIcon icon={faChartColumn} aria-hidden="true" /></span><strong>{filterLabel ? `No ${filterLabel} payments in this range` : "No spending in this range"}</strong><p>{filterLabel ? "Try another payment filter or a wider date range." : "Pick another range or add an expense to see trends."}</p><Link href="/add-expenses" className="btn"><FontAwesomeIcon icon={faPlus} />Add an expense</Link></div> : <>
              <div className="chart" role="img" aria-label={`${timeframe} spending in ${currency}. Exact values are available in the data table below.`}>
                {isMounted && <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }} accessibilityLayer>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 13 }} minTickGap={40} tickMargin={12} tickFormatter={(label: string) => label.replace("Week of ", "")} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 13 }} tickFormatter={axisFormat} width={56} tickMargin={8} domain={[0, "auto"]} />
                    <Tooltip cursor={{ fill: "var(--surface-hover)" }} content={({ active, payload, label }) => active && payload?.length ? <div className="chart-tooltip"><p className="muted text-xs">{label}</p><p className="money">{currency} {formatAmount(Number(payload[0].value))}</p></div> : null} />
                    <Bar dataKey="amount" name="Spent" fill="var(--chart-1)" maxBarSize={48} isAnimationActive={false} activeBar={{ fill: "var(--accent-text)" }} />
                  </BarChart>
                </ResponsiveContainer>}
              </div>
              <details className="chart-table"><summary>View data table</summary><div className="overflow-auto max-h-72 mt-4"><table className="expense-table"><caption className="sr-only">{timeframe} spending totals</caption><thead><tr><th scope="col">Period</th><th scope="col" className="text-right">Amount ({currency})</th></tr></thead><tbody>{chartData.map((row) => <tr key={row.key}><td>{row.label}</td><td className="money text-right">{formatAmount(row.amount)}</td></tr>)}</tbody></table></div></details>
            </>}
          </section>
          <div className="grid gap-[var(--space-section)] lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <section className="panel" aria-labelledby="category-heading"><div className="panel-heading"><h2 id="category-heading"><FontAwesomeIcon icon={faLayerGroup} className="heading-icon" aria-hidden="true" />By category</h2><span className="panel-meta">Share of total</span></div><CategoryBreakdown categories={summary.byType} total={total} currency={currency} /></section>
            <section className="panel" aria-labelledby="payment-heading"><div className="panel-heading"><h2 id="payment-heading"><FontAwesomeIcon icon={faCreditCard} className="heading-icon" aria-hidden="true" />Payment methods</h2></div><PaymentBreakdown byMode={summary.byMode} total={total} currency={currency} /></section>
          </div>
        </div>}
      </div>
    </main>
  </>;
}
