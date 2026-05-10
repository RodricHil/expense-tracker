"use client";

import { useState, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarDays } from "@fortawesome/free-solid-svg-icons";

type DateRange = {
  startDate: Date;
  endDate: Date;
  label: string;
};

type DateRangeFilterProps = {
  onRangeChange: (range: DateRange) => void;
};

const formatLabel = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default function DateRangeFilter({ onRangeChange }: DateRangeFilterProps) {
  const [selectedRange, setSelectedRange] = useState<
    "today" | "7days" | "30days" | "month" | "year" | "custom"
  >("30days");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);

  const getRangeFromPreset = (
    preset: "today" | "7days" | "30days" | "month" | "year" | "custom"
  ) => {
    const endDate = new Date();
    endDate.setUTCHours(23, 59, 59, 999);

    let startDate = new Date(endDate);

    switch (preset) {
      case "today":
        startDate.setUTCHours(0, 0, 0, 0);
        return { startDate, endDate, label: "Today" };

      case "7days":
        startDate.setUTCDate(startDate.getUTCDate() - 6);
        startDate.setUTCHours(0, 0, 0, 0);
        return { startDate, endDate, label: "Last 7 Days" };

      case "30days":
        startDate.setUTCDate(startDate.getUTCDate() - 29);
        startDate.setUTCHours(0, 0, 0, 0);
        return { startDate, endDate, label: "Last 30 Days" };

      case "month":
        startDate = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1));
        return { startDate, endDate, label: "This Month" };

      case "year":
        startDate = new Date(Date.UTC(endDate.getUTCFullYear(), 0, 1));
        return { startDate, endDate, label: "This Year" };

      case "custom":
        if (customStart && customEnd) {
          const start = new Date(`${customStart}T00:00:00.000Z`);
          const end = new Date(`${customEnd}T23:59:59.999Z`);
          return {
            startDate: start,
            endDate: end,
            label: `${formatLabel(customStart)} to ${formatLabel(customEnd)}`,
          };
        }
        return null;

      default:
        return null;
    }
  };

  const handlePresetSelect = (
    preset: "today" | "7days" | "30days" | "month" | "year" | "custom"
  ) => {
    setSelectedRange(preset);
    const range = getRangeFromPreset(preset);
    if (range) {
      onRangeChange(range);
    }
  };

  const handleCustomDateChange = () => {
    if (!customStart || !customEnd) return;
    const range = getRangeFromPreset("custom");
    if (range) onRangeChange(range);
  };

  const handleClear = () => {
    setCustomStart("");
    setCustomEnd("");
    setSelectedRange("30days");
    const defaultRange = getRangeFromPreset("30days");
    if (defaultRange) {
      onRangeChange(defaultRange);
    }
  };

  return (
    <div className="glass rounded-4xl border border-white/20 bg-white/80 p-6 shadow-xl backdrop-blur-xl dark:bg-slate-950/80 dark:border-slate-800">
      <div className="flex items-center gap-3 text-slate-900 dark:text-slate-100 mb-4">
        <FontAwesomeIcon icon={faCalendarDays} className="h-5 w-5 text-violet-600" />
        <h3 className="text-lg font-semibold">Refine your date range</h3>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { id: "today", label: "Today" },
          { id: "7days", label: "7 Days" },
          { id: "30days", label: "30 Days" },
          { id: "month", label: "This Month" },
          { id: "year", label: "This Year" },
          { id: "custom", label: "Custom" },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handlePresetSelect(item.id as any)}
            className={
              `rounded-2xl px-4 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-violet-500 ` +
              (selectedRange === item.id
                ? "bg-gradient-to-r from-violet-600 to-sky-500 text-white shadow-lg"
                : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600")
            }
          >
            {item.label}
          </button>
        ))}
      </div>

      {selectedRange === "custom" && (
        <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Start Date</span>
              <input
                ref={startRef}
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                onClick={() => startRef.current?.showPicker()}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">End Date</span>
              <input
                ref={endRef}
                type="date"
                value={customEnd}
                min={customStart || undefined}
                onChange={(e) => setCustomEnd(e.target.value)}
                onClick={() => endRef.current?.showPicker()}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClear}
              className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleCustomDateChange}
              disabled={!customStart || !customEnd}
              className={`rounded-2xl px-5 py-3 text-sm font-semibold transition ${
                customStart && customEnd
                  ? "bg-slate-900 text-white hover:bg-slate-800"
                  : "bg-slate-300 text-slate-500 cursor-not-allowed"
              }`}
            >
              Apply custom range
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
