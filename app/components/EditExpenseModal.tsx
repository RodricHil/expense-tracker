"use client";

import { useState } from "react";
import { useNotification } from "@/app/components/elements/NotificationProvider";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faXmark,
  faCheck,
  faSpinner,
  faChevronDown,
} from "@fortawesome/free-solid-svg-icons";

type Expense = {
  _id: string;
  date: string;
  description: string;
  quantity?: number;
  mode: string;
  type: string;
  amount: number;
};

const categories = [
  "food",
  "electronics",
  "dress",
  "service",
  "gardening",
  "furniture",
  "house utility",
  "footwear",
  "makeup/grooming",
  "subscriptions",
  "toy/figures/stationary",
  "travel expenses",
  "gifts",
  "medicines",
  "harmful item",
  "investment",
  "bills",
  "repair",
  "vehicle expenses",
  "decoration",
  "others",
];

export default function EditExpenseModal({
  expense,
  onClose,
  onUpdated,
}: {
  expense: Expense;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [form, setForm] = useState({
    ...expense,
    date: expense.date.slice(0, 10),
  });

  const [isLoading, setIsLoading] = useState(false);
  const { showNotification } = useNotification();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleUpdate = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/expenses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          id: expense._id,
          quantity: form.quantity ? Number(form.quantity) : null,
          amount: Number(form.amount),
        }),
      });

      if (res.ok) {
        onUpdated();
        onClose();
        showNotification("Expense updated successfully", "success");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">

      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-slate-700">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Edit Expense
          </h2>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition"
          >
            <FontAwesomeIcon
              icon={faXmark}
              className="text-gray-600 dark:text-gray-400 w-5 h-5"
            />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleUpdate} className="px-6 py-6 space-y-5">

          {/* Date */}
          <InputField
            label="Date"
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
          />

          {/* Description */}
          <InputField
            label="Description"
            type="text"
            name="description"
            value={form.description}
            onChange={handleChange}
          />

          {/* Amount */}
          <InputField
            label="Amount (₹)"
            type="number"
            name="amount"
            value={form.amount}
            onChange={handleChange}
            step="0.01"
            min="0"
          />



          {/* Payment Mode Dropdown */}
          <SelectField
            label="Payment Mode"
            name="mode"
            value={form.mode}
            onChange={handleChange}
            options={[
              { value: "online", label: "Online" },
              { value: "cash", label: "Cash" },
            ]}
          />

          {/* Category Dropdown */}
          <SelectField
            label="Category"
            name="type"
            value={form.type}
            onChange={handleChange}
            options={categories.map((cat) => ({
              value: cat,
              label: cat.charAt(0).toUpperCase() + cat.slice(1),
            }))}
          />

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 cursor-pointer rounded-lg border border-gray-300 dark:border-slate-600 
              text-gray-700 dark:text-gray-300 font-semibold 
              hover:bg-gray-50 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r cursor-pointer from-purple-600 to-pink-600 
              hover:from-purple-700 hover:to-pink-700 
              disabled:opacity-50 text-white font-semibold 
              py-2 rounded-lg transition flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <FontAwesomeIcon
                    icon={faSpinner}
                    className="animate-spin w-4 h-4"
                  />
                  Updating...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faCheck} className="w-4 h-4" />
                  Update
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

/* ============================= */
/* Reusable Input Component */
/* ============================= */

function InputField(props: any) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
        {props.label}
      </label>
      <input
        {...props}
        required
        className="w-full px-4 py-2.5 rounded-lg 
        border border-gray-300 dark:border-slate-600 
        bg-white dark:bg-slate-800 
        text-gray-900 dark:text-white 
        focus:outline-none focus:ring-2 focus:ring-purple-500 
        transition"
      />
    </div>
  );
}

/* ============================= */
/* Reusable Select Component */
/* ============================= */

function SelectField({ label, name, value, onChange, options }: any) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>

      <div className="relative">
        <select
          name={name}
          value={value}
          onChange={onChange}
          className="w-full appearance-none px-4 py-2.5 rounded-lg 
          border border-gray-300 dark:border-slate-600 
          bg-white dark:bg-slate-800 
          text-gray-900 dark:text-white 
          focus:outline-none focus:ring-2 focus:ring-purple-500 
          transition cursor-pointer"
        >
          {options.map((opt: any) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Custom Arrow */}
        <FontAwesomeIcon
          icon={faChevronDown}
          className="absolute right-4 top-1/2 -translate-y-1/2 
          text-gray-500 dark:text-gray-400 
          pointer-events-none w-4 h-4"
        />
      </div>
    </div>
  );
}
