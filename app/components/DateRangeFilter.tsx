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

  const getRangeFromPreset = (preset: "today" | "7days" | "30days" | "custom") => {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    let startDate = new Date();

    switch (preset) {
      case "today":
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        return {
          startDate,
          endDate,
          label: "Today",
        };
      case "7days":
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        return {
          startDate,
          endDate,
          label: "Last 7 Days",
        };
      case "30days":
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        return {
          startDate,
          endDate,
          label: "Last 30 Days",
        };
      case "custom":
        if (customStart && customEnd) {
          return {
            startDate: new Date(customStart),
            endDate: new Date(new Date(customEnd).setHours(23, 59, 59, 999)),
            label: `${new Date(customStart).toLocaleDateString("en-IN")} to ${new Date(customEnd).toLocaleDateString("en-IN")}`,
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
        <div className="grid grid-cols-1  md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => {
                setCustomStart(e.target.value);
                if (customEnd) {
                  const range = {
                    startDate: new Date(e.target.value),
                    endDate: new Date(new Date(customEnd).setHours(23, 59, 59, 999)),
                    label: `${new Date(e.target.value).toLocaleDateString("en-IN")} to ${new Date(customEnd).toLocaleDateString("en-IN")}`,
                  };
                  onRangeChange(range);
                }
              }}
              className="w-full px-4 py-2 cursor-pointer rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => {
                setCustomEnd(e.target.value);
                if (customStart) {
                  const range = {
                    startDate: new Date(customStart),
                    endDate: new Date(new Date(e.target.value).setHours(23, 59, 59, 999)),
                    label: `${new Date(customStart).toLocaleDateString("en-IN")} to ${new Date(e.target.value).toLocaleDateString("en-IN")}`,
                  };
                  onRangeChange(range);
                }
              }}
              className="w-full px-4 py-2 cursor-pointer rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
            />
          </div>
        </div>
      )}
    </div>
  );
}
