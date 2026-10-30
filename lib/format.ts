/** Money is always displayed with two fractional digits, including zero. */
export function formatAmount(value: number): string {
  return value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Expenses are calendar dates stored at UTC midnight, not event timestamps. */
export function localDateKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function calendarToday(now = new Date()): Date {
  return new Date(`${localDateKey(now)}T00:00:00.000Z`);
}

export function inclusiveDays(start: Date, end: Date): number {
  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1);
}

/** Compact date span, retaining months and years when they differ. */
export function formatDateRange(start: Date, end: Date): string {
  const format = (date: Date, options: Intl.DateTimeFormatOptions) => date.toLocaleDateString("en-IN", { ...options, timeZone: "UTC" });
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const sameMonth = sameYear && start.getUTCMonth() === end.getUTCMonth();
  const full = { day: "numeric", month: "short", year: "numeric" } as const;
  if (start.toISOString().slice(0, 10) === end.toISOString().slice(0, 10)) return format(start, full);
  return `${format(start, sameMonth ? { day: "numeric" } : sameYear ? { day: "numeric", month: "short" } : full)}–${format(end, full)}`;
}
