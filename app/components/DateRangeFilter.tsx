"use client";

import { useState } from "react";
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

export default function DateRangeFilter({ onRangeChange }: DateRangeFilterProps) {
  const today = new Date();
  const [selectedRange, setSelectedRange] = useState<"today" | "7days" | "30days" | "custom">("30days");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

const getRangeFromPreset = (
  preset: "today" | "7days" | "30days" | "custom"
) => {
  const endDate = new Date();
  endDate.setUTCHours(23, 59, 59, 999); // ✅ UTC

  let startDate = new Date();

  switch (preset) {
    case "today":
      startDate = new Date();
      startDate.setUTCHours(0, 0, 0, 0); // ✅ UTC
      return {
        startDate,
        endDate,
        label: "Today",
      };

    case "7days":
      startDate = new Date(endDate);
      startDate.setUTCDate(startDate.getUTCDate() - 7); // ✅ UTC
      startDate.setUTCHours(0, 0, 0, 0);
      return {
        startDate,
        endDate,
        label: "Last 7 Days",
      };

    case "30days":
      startDate = new Date(endDate);
      startDate.setUTCDate(startDate.getUTCDate() - 30); // ✅ UTC
      startDate.setUTCHours(0, 0, 0, 0);
      return {
        startDate,
        endDate,
        label: "Last 30 Days",
      };

    case "custom":
      if (customStart && customEnd) {
        const start = new Date(customStart + "T00:00:00.000Z"); // ✅ force UTC
        const end = new Date(customEnd + "T23:59:59.999Z"); // ✅ force UTC

        return {
          startDate: start,
          endDate: end,
          label: `${new Date(customStart).toLocaleDateString(
            "en-IN"
          )} to ${new Date(customEnd).toLocaleDateString("en-IN")}`,
        };
      }
      return null;

    default:
      return null;
  }
};


  const handlePresetSelect = (preset: "today" | "7days" | "30days" | "custom") => {
    setSelectedRange(preset);
    const range = getRangeFromPreset(preset);
    if (range) {
      onRangeChange(range);
    }
  };

  const handleCustomDateChange = () => {
    if (customStart && customEnd) {
      const range = getRangeFromPreset("custom");
      if (range) {
        onRangeChange(range);
      }
    }
  };
const handleClear = () => {
  setCustomStart("");
  setCustomEnd("");
  setSelectedRange("30days"); // default

  const defaultRange = getRangeFromPreset("30days");
  if (defaultRange) {
    onRangeChange(defaultRange);
  }
};

  return (
    <div className="glass rounded-2xl p-6 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-lg mb-8">
      <div className="flex items-center gap-2 mb-4">
        <FontAwesomeIcon icon={faCalendarDays} className="text-purple-600 dark:text-purple-400 w-5 h-5" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filter by Date Range</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <button
          onClick={() => handlePresetSelect("today")}
          className={`py-2 px-4 rounded-lg cursor-pointer font-medium transition-all ${
            selectedRange === "today"
              ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
              : "border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          }`}
        >
          Today
        </button>

        <button
          onClick={() => handlePresetSelect("7days")}
          className={`py-2 px-4 rounded-lg cursor-pointer font-medium transition-all ${
            selectedRange === "7days"
              ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg"
              : "border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          }`}
        >
          7 Days
        </button>

        <button
          onClick={() => handlePresetSelect("30days")}
          className={`py-2 px-4 rounded-lg cursor-pointer font-medium transition-all ${
            selectedRange === "30days"
              ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg"
              : "border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          }`}
        >
          30 Days
        </button>

        <button
          onClick={() => handlePresetSelect("custom")}
          className={`py-2 px-4 rounded-lg cursor-pointer font-medium transition-all ${
            selectedRange === "custom"
              ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg"
              : "border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          }`}
        >
          Custom Range
        </button>
      </div>

      {selectedRange === "custom" && (
  <div className="mt-2 p-4 rounded-xl bg-white/40 dark:bg-black/20 border border-white/30 dark:border-white/10 backdrop-blur-md">

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Start Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Start Date
        </label>
        <input
          type="date"
          value={customStart}
          onChange={(e) => setCustomStart(e.target.value)}
          className="w-full px-4 py-2.5 cursor-pointer rounded-lg border border-gray-300 dark:border-gray-600 
          bg-white dark:bg-gray-800 text-gray-900 dark:text-white 
          focus:ring-2 focus:ring-purple-500 focus:border-transparent transition shadow-sm"
        />
      </div>

      {/* End Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          End Date
        </label>
        <input
          type="date"
          value={customEnd}
          min={customStart || undefined}
          onChange={(e) => setCustomEnd(e.target.value)}
          className="w-full px-4 py-2.5 cursor-pointer rounded-lg border border-gray-300 dark:border-gray-600 
          bg-white dark:bg-gray-800 text-gray-900 dark:text-white 
          focus:ring-2 focus:ring-purple-500 focus:border-transparent transition shadow-sm"
        />
      </div>
    </div>

    {/* Apply Button */}
    <div className="flex justify-end mt-5 gap-3">
  <button
    onClick={handleClear}
    className="px-5 py-2.5 rounded-lg font-medium border border-gray-300 
    dark:border-gray-600 text-gray-700 dark:text-gray-300 
    hover:bg-gray-100 dark:hover:bg-gray-800 transition"
  >
    Clear
  </button>

  <button
    disabled={!customStart || !customEnd}
    onClick={() => handleCustomDateChange()}
    className={`px-5 py-2.5 rounded-lg font-medium transition-all shadow-md
      ${
        customStart && customEnd
          ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:scale-105 hover:shadow-lg"
          : "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
      }`}
  >
    Apply
  </button>
</div>


  </div>
)}

    </div>
  );
}
