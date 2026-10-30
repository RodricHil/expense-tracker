"use client";

import { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarDays } from "@fortawesome/free-solid-svg-icons";

import CustomSelect from "./CustomSelect";
import DatePicker from "./DatePicker";
import { isDateKey } from "@/lib/calendar";
import { MAX_RANGE_DAYS, isAllowedRange } from "@/lib/date-range";
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
  compact?: boolean;
  rangeLabel?: string;
  onDirtyChange?: (dirty: boolean) => void;
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

export default function DateRangeFilter({ onRangeChange, children, compact = false, rangeLabel, onDirtyChange }: DateRangeFilterProps) {
  const [selectedRange, setSelectedRange] = useState<RangePreset>("30days");
  const [appliedPreset, setAppliedPreset] = useState<RangePreset>("30days");
  const [appliedCustom, setAppliedCustom] = useState({ start: "", end: "" });
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
        if (isDateKey(customStart) && isDateKey(customEnd) && customStart <= customEnd && isAllowedRange(new Date(customStart), new Date(customEnd))) {
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
      if (appliedPreset !== "custom") {
        const range = getRangeFromPreset(appliedPreset);
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
    onDirtyChange?.(preset !== "30days");
    if (preset === "custom") return;
    const range = getRangeFromPreset(preset);
    if (range) {
      setAppliedPreset(preset);
      onRangeChange(range);
    }
  };

  const handleCustomDateChange = () => {
    if (!customStart || !customEnd) return;
    const range = getRangeFromPreset("custom");
    if (range) { setAppliedPreset("custom"); setAppliedCustom({ start: customStart, end: customEnd }); onDirtyChange?.(true); onRangeChange(range); }
  };

  const pendingCustom = selectedRange === "custom" && (appliedPreset !== "custom" || customStart !== appliedCustom.start || customEnd !== appliedCustom.end);
  const validCustom = isDateKey(customStart) && isDateKey(customEnd) && customStart <= customEnd;
  const rangeTooWide = validCustom && !isAllowedRange(new Date(customStart), new Date(customEnd));
  const cancelCustom = () => {
    setSelectedRange(appliedPreset); setCustomStart(appliedCustom.start); setCustomEnd(appliedCustom.end);
    onDirtyChange?.(appliedPreset !== "30days");
  };

  return (
    <section className={compact ? "panel compact-filters" : "panel filter-panel py-4"} aria-label="Filters">
      {compact ? <div className="filter-field"><span className="filter-label">Date range</span><CustomSelect label="Date range" value={selectedRange} options={RANGE_PRESETS.map((item) => ({ value: item.id, label: item.id === "7days" ? "Last 7 days" : item.id === "30days" ? "Last 30 days" : item.id === "custom" ? "Custom dates" : item.label }))} onChange={(value) => handlePresetSelect(value as RangePreset)} />{rangeLabel && <p className="filter-hint">{rangeLabel}</p>}</div> : <div className="flex items-center justify-between gap-4 flex-wrap">
        <span className="text-secondary font-medium flex items-center gap-2"><FontAwesomeIcon icon={faCalendarDays} className="h-3.5 w-3.5 text-stone-500" aria-hidden="true" />Date range</span>
        <div className="segmented date-presets" role="group" aria-label="Date presets">
          {RANGE_PRESETS.map((item) => <button key={item.id} type="button" className="segment" aria-pressed={selectedRange === item.id} onClick={() => handlePresetSelect(item.id)}>{item.label}</button>)}
        </div>
      </div>}
      {compact && children}
      {selectedRange === "custom" && <div className="custom-range">
        {pendingCustom && <p className="filter-hint" role="status">Dates not applied. Results still use {rangeLabel || "the previous range"}.</p>}
        {rangeTooWide && <p className="field-error" role="alert">Choose a range of at most {MAX_RANGE_DAYS.toLocaleString()} days (about 10 years).</p>}
        <div className="custom-range-fields">
          <div className="field"><span>From</span><DatePicker label="Start date" value={customStart} max={customEnd || undefined} onChange={(value) => { setCustomStart(value); onDirtyChange?.(true); }} /></div>
          <div className="field"><span>To</span><DatePicker label="End date" value={customEnd} min={customStart || undefined} onChange={(value) => { setCustomEnd(value); onDirtyChange?.(true); }} /></div>
        </div>
        <div className="custom-range-actions">
          {pendingCustom && <button type="button" className="btn btn-ghost" onClick={cancelCustom}>Cancel changes</button>}
          <button type="button" className="btn btn-primary" disabled={!validCustom || rangeTooWide || !pendingCustom} onClick={handleCustomDateChange}>Apply range</button>
        </div>
        {customStart && customEnd && customStart > customEnd && <p role="alert" className="field-error custom-range-error">End date must be on or after start date.</p>}
      </div>}
      {!compact && children && <div className="mt-4 pt-4 border-t border-stone-800">{children}</div>}
    </section>
  );
}
