"use client";

import { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarDays } from "@fortawesome/free-solid-svg-icons";

import DatePicker from "./DatePicker";
import { isDateKey } from "@/lib/calendar";
import { calendarToday, localDateKey } from "@/lib/format";

type DateRange = {
  startDate: Date;
  endDate: Date;
  label: string;
};

type DateRangeFilterProps = {
  onRangeChange: (range: DateRange) => void;
  /** Further filters (e.g. payment method), shown as extra rows in the same panel. */
  children?: React.ReactNode;
};

/** The six preset buttons. Named so the button list can be typed rather than cast. */
type RangePreset = "today" | "7days" | "30days" | "month" | "year" | "custom";

const RANGE_PRESETS: { id: RangePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7days", label: "7 Days" },
  { id: "30days", label: "30 Days" },
  { id: "month", label: "This Month" },
  { id: "year", label: "This Year" },
  { id: "custom", label: "Custom" },
];

const formatLabel = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-IN", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default function DateRangeFilter({ onRangeChange, children }: DateRangeFilterProps) {
  const [selectedRange, setSelectedRange] = useState<RangePreset>("30days");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const getRangeFromPreset = (preset: RangePreset) => {
    const endDate = calendarToday();
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
        if (isDateKey(customStart) && isDateKey(customEnd) && customStart <= customEnd) {
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

  const refreshRange = useRef(() => {});
  useEffect(() => {
    refreshRange.current = () => {
      if (selectedRange !== "custom") {
        const range = getRangeFromPreset(selectedRange);
        if (range) onRangeChange(range);
      }
    };
  });
  useEffect(() => {
    let day = localDateKey();
    refreshRange.current();
    const timer = window.setInterval(() => {
      const next = localDateKey();
      if (next !== day) {
        day = next;
        refreshRange.current();
      }
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const handlePresetSelect = (preset: RangePreset) => {
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
    <section className="panel py-4" aria-label="Filters">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <span className="text-secondary font-medium flex items-center gap-2"><FontAwesomeIcon icon={faCalendarDays} className="h-3.5 w-3.5 text-stone-500" aria-hidden="true" />Date range</span>
        <div className="segmented" role="group" aria-label="Date presets">
          {RANGE_PRESETS.map((item) => <button key={item.id} type="button" className="segment" aria-pressed={selectedRange === item.id} onClick={() => handlePresetSelect(item.id)}>{item.label}</button>)}
        </div>
      </div>
      {selectedRange === "custom" && <div className="mt-5 pt-5 border-t border-stone-800">
        <div className="form-grid">
          <div className="field"><span>From</span><DatePicker label="Start date" value={customStart} max={customEnd || undefined} onChange={setCustomStart} /></div>
          <div className="field"><span>To</span><DatePicker label="End date" value={customEnd} min={customStart || undefined} onChange={setCustomEnd} /></div>
        </div>
        {customStart && customEnd && customStart > customEnd && <p role="alert" className="field-error mt-3">End date must be on or after start date.</p>}
        <div className="flex justify-end gap-3 mt-5">
          <button type="button" className="btn" onClick={handleClear}>Reset</button>
          <button type="button" className="btn btn-primary" disabled={!isDateKey(customStart) || !isDateKey(customEnd) || customStart > customEnd} onClick={handleCustomDateChange}>Apply range</button>
        </div>
      </div>}
      {children && <div className="mt-4 pt-4 border-t border-stone-800">{children}</div>}
    </section>
  );
}
