import { calendarToday } from "./format";
export const MAX_RANGE_DAYS = 3660;
export function isAllowedRange(start: Date, end: Date) {
  const days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  return Number.isFinite(days) && days >= 1 && days <= MAX_RANGE_DAYS;
}
export function defaultFilterRange() {
  const endDate = calendarToday(); endDate.setUTCHours(23, 59, 59, 999);
  const startDate = new Date(endDate); startDate.setUTCDate(startDate.getUTCDate() - 29); startDate.setUTCHours(0, 0, 0, 0);
  return { startDate, endDate, label: "Last 30 Days" };
}
