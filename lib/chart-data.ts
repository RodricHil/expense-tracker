export type Timeframe = "Daily" | "Weekly" | "Monthly" | "Yearly";
export type DayBucket = { date: string; amount: number };
const DAY = 86400000;

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
  const totals = new Map<string, number>();
  // Calendar days are stored in UTC. Seed empty periods so zero-spend days remain visible.
  const first = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const last = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  for (let time = first; time <= last; time += DAY) {
    totals.set(periodKey(new Date(time).toISOString().slice(0, 10), timeframe), 0);
  }
  for (const bucket of buckets) {
    const time = new Date(`${bucket.date}T00:00:00Z`).getTime();
    if (time < first || time > last || !Number.isFinite(time)) continue;
    const key = periodKey(bucket.date, timeframe);
    if (totals.has(key)) totals.set(key, (totals.get(key) ?? 0) + bucket.amount);
  }
  return Array.from(totals, ([key, amount]) => ({ key, label: periodLabel(key, timeframe), amount: Math.round(amount * 100) / 100 })).sort((a, b) => a.key.localeCompare(b.key));
}
