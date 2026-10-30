import { isAllowedRange } from "./date-range";
export type Timeframe = "Daily" | "Weekly" | "Monthly" | "Yearly";
export type DayBucket = { date: string; amount: number };
const DAY = 86400000;
export const MAX_CHART_POINTS = 732;
export function chartGrouping(start: Date, end: Date, requested: Timeframe): Timeframe {
  const days = Math.floor((end.getTime() - start.getTime()) / DAY) + 1;
  return requested === "Daily" && days > MAX_CHART_POINTS ? "Weekly" : requested;
}

function periodKey(day: string, timeframe: Timeframe): string {
  if (timeframe === "Monthly") return day.slice(0, 7);
  if (timeframe === "Yearly") return day.slice(0, 4);
  if (timeframe === "Weekly") {
    const date = new Date(`${day}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
    return date.toISOString().slice(0, 10);
  }
  return day;
}

export function periodLabel(key: string, timeframe: Timeframe): string {
  if (timeframe === "Yearly") return key;
  const date = new Date(`${key.length === 7 ? `${key}-01` : key}T00:00:00Z`);
  const label = date.toLocaleDateString("en-IN", {
    ...(timeframe !== "Monthly" ? { day: "numeric" as const } : {}),
    month: "short", year: "numeric", timeZone: "UTC",
  });
  return timeframe === "Weekly" ? `Week of ${label}` : label;
}

/** ISO period keys keep dates chronological and distinct across year boundaries. */
export function buildSpendingSeries(buckets: DayBucket[], start: Date, end: Date, timeframe: Timeframe) {
  if (!isAllowedRange(start, end)) throw new RangeError("Choose a date range of at most 10 years.");
  timeframe = chartGrouping(start, end, timeframe);
  const totals = new Map<string, number>();
  // Calendar days are stored in UTC. Seed empty periods so zero-spend days remain visible.
  const first = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const last = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  let key = periodKey(new Date(first).toISOString().slice(0, 10), timeframe);
  const lastKey = periodKey(new Date(last).toISOString().slice(0, 10), timeframe);
  while (key <= lastKey && totals.size < MAX_CHART_POINTS) {
    totals.set(key, 0);
    const cursor = new Date(`${key.length === 4 ? `${key}-01-01` : key.length === 7 ? `${key}-01` : key}T00:00:00Z`);
    if (timeframe === "Yearly") cursor.setUTCFullYear(cursor.getUTCFullYear() + 1);
    else if (timeframe === "Monthly") cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    else cursor.setUTCDate(cursor.getUTCDate() + (timeframe === "Weekly" ? 7 : 1));
    key = periodKey(cursor.toISOString().slice(0, 10), timeframe);
  }
  for (const bucket of buckets) {
    const time = new Date(`${bucket.date}T00:00:00Z`).getTime();
    if (time < first || time > last || !Number.isFinite(time)) continue;
    const key = periodKey(bucket.date, timeframe);
    if (totals.has(key)) totals.set(key, (totals.get(key) ?? 0) + bucket.amount);
  }
  return Array.from(totals, ([key, amount]) => ({ key, label: periodLabel(key, timeframe), amount: Math.round(amount * 100) / 100 })).sort((a, b) => a.key.localeCompare(b.key));
}
