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
        const params = new URLSearchParams({ page: "1", limit: "1", from: dateRange.startDate.toISOString(), to: dateRange.endDate.toISOString() });
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
  }, [dateRange, retry]);

  const chartData = useMemo(() => buildSpendingSeries(summary.byDay, dateRange.startDate, dateRange.endDate, timeframe), [summary.byDay, dateRange, timeframe]);
  const total = summary.rangeTotal;
  const average = total / inclusiveDays(dateRange.startDate, dateRange.endDate);
  const modes = ["online", "cash"].map((mode) => ({ mode, amount: summary.byMode.find((item) => item.mode === mode)?.amount ?? 0 }));
  const peak = chartData.reduce<(typeof chartData)[number] | null>((best, row) => !best || row.amount > best.amount ? row : best, null);
  const axisFormat = (value: number) => new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(value);

  return <>
    <Navbar />
    <main className="app-shell">
      <div className="page-heading"><div><h1>Analytics</h1><p>{dateRange.label}</p></div><Link href="/add-expenses" className="btn btn-primary">Add expense</Link></div>
      <div className="stack">
        <DateRangeFilter onRangeChange={changeRange} />
        {error && <div className="error-state" role="alert"><p>{error}</p><button type="button" className="btn" onClick={() => { setLoading(true); setError(""); setRetry((n) => n + 1); }}>Retry</button></div>}
        {loading && <p role="status" className="muted">Updating analytics…</p>}
        {!error && <div className="stack" aria-busy={loading} style={{ opacity: loading ? .45 : 1 }}>
          <div className="stats">
            <div className="stat"><p className="stat-label">Spent in range</p><p className="stat-value">{currency} {formatAmount(total)}</p></div>
            <div className="stat"><p className="stat-label">Daily average</p><p className="stat-value">{currency} {formatAmount(average)}</p></div>
            <div className="stat"><p className="stat-label">Days with expenses</p><p className="stat-value">{summary.byDay.length}<span className="muted text-sm ml-2">/ {inclusiveDays(dateRange.startDate, dateRange.endDate)}</span></p></div>
          </div>
          <section className="panel" aria-label="Spending over time">
            <div className="panel-heading"><h2>Spending over time</h2><div className="segmented" role="group" aria-label="Chart grouping">{timeframeOptions.map((option) => <button key={option} type="button" className="segment" aria-pressed={timeframe === option} onClick={() => setTimeframe(option)}>{option}</button>)}</div></div>
            <div className="flex justify-between gap-4 flex-wrap text-xs muted"><span>Amount ({currency})</span>{peak && total > 0 && <span>Highest: {peak.label} · {currency} {formatAmount(peak.amount)}</span>}</div>
            {!summary.byDay.length ? <div className="empty-state"><p>No spending in this range.</p><Link href="/add-expenses" className="btn">Add an expense</Link></div> : <>
              <div className="chart" role="img" aria-label={`${timeframe} spending in ${currency}. Exact values are available in the data table below.`}>
                {isMounted && <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }} accessibilityLayer>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} minTickGap={40} tickMargin={12} tickFormatter={(label: string) => label.replace("Week of ", "")} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} tickFormatter={axisFormat} width={52} tickMargin={8} domain={[0, "auto"]} />
                    <Tooltip cursor={{ fill: "var(--surface-hover)" }} content={({ active, payload, label }) => active && payload?.length ? <div className="chart-tooltip"><p className="muted text-xs">{label}</p><p className="money">{currency} {formatAmount(Number(payload[0].value))}</p></div> : null} />
                    <Bar dataKey="amount" name="Spent" fill="var(--accent)" maxBarSize={40} isAnimationActive={false} activeBar={{ fill: "var(--accent-hover)" }} />
                  </BarChart>
                </ResponsiveContainer>}
              </div>
              <details className="chart-table"><summary>View data</summary><div className="overflow-auto max-h-72 mt-4"><table className="expense-table"><caption className="sr-only">{timeframe} spending totals</caption><thead><tr><th scope="col">Period</th><th scope="col" className="text-right">Amount ({currency})</th></tr></thead><tbody>{chartData.map((row) => <tr key={row.key}><td>{row.label}</td><td className="money text-right">{formatAmount(row.amount)}</td></tr>)}</tbody></table></div></details>
            </>}
          </section>
          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <section className="panel"><div className="panel-heading"><h2>By category</h2><span className="muted text-xs">Share of total</span></div><CategoryBreakdown categories={summary.byType} total={total} currency={currency} /></section>
            <section className="panel"><div className="panel-heading"><h2>Payment method</h2></div>
              {total === 0 ? <p className="muted">No payments in this range.</p> : <>
                <div className="flex h-3 mb-8" aria-hidden="true">{modes.map(({ mode, amount }, index) => <div key={mode} style={{ width: `${amount / total * 100}%`, background: index === 0 ? "var(--accent)" : "var(--chart-secondary)" }} />)}</div>
                <div className="grid gap-6">{modes.map(({ mode, amount }, index) => <div className="flex justify-between gap-4" key={mode}><div><p className="capitalize flex items-center gap-2"><span className="w-2 h-2" style={{ background: index === 0 ? "var(--accent)" : "var(--chart-secondary)" }} />{mode}</p><p className="muted text-xs mt-1">{(amount / total * 100).toFixed(1)}% of total</p></div><span className="money">{currency} {formatAmount(amount)}</span></div>)}</div>
              </>}
            </section>
          </div>
        </div>}
      </div>
    </main>
  </>;
}
