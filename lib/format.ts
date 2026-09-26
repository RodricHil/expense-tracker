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
