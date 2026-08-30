"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faCheck,
  faSpinner,
  faChevronDown,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import { useNotification } from "@/app/components/elements/NotificationProvider";
import { useCurrency } from "@/app/components/CurrencyProvider";

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

export default function AddExpense() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [amountError, setAmountError] = useState("");
  const { showNotification } = useNotification();
  const { currency } = useCurrency();

  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    quantity: "",
    mode: "online",
    type: "food",
    amount: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name === "amount") {
      // Same strings as `^\d+(\.\d{0,2})?$`, expressed without a nested
      // quantifier so `security/detect-unsafe-regex` is satisfied. This is UX
      // only — lib/validation.ts is the authoritative check (ET-H4).
      const regex = /^\d+$|^\d+\.\d{0,2}$/;
      if (value === "" || regex.test(value)) {
        setAmountError("");
        setForm({ ...form, amount: value });
      } else {
        setAmountError("Only numbers with max 2 decimal places allowed");
      }
      return;
    }

    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!form.amount) {
      setAmountError("Amount is required");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          quantity: form.quantity ? Number(form.quantity) : null,
          amount: Number(form.amount),
        }),
      });

      if (res.ok) {
        showNotification("Expense added successfully", "success");
        router.push("/dashboard");
      } else {
        showNotification("Failed to add expense", "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Navbar />

      <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6">
        <div className="max-w-xl mx-auto">

          <h1 className="text-3xl sm:text-4xl font-bold bg-blue-600 bg-clip-text text-transparent mb-8">
            Add Expense
          </h1>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-xl border border-gray-200 dark:border-slate-700">

            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Date */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                  Date
                </label>
                <input
                  type="date"
                  name="date"
                  required
                  value={form.date}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 
                bg-white dark:bg-slate-800 
                text-gray-900 dark:text-white 
                focus:outline-none focus:ring-2 focus:ring-blue-500 
                transition"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <input
                  type="text"
                  name="description"
                  required
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Lunch, Grocery, etc."
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 
                bg-white dark:bg-slate-800 
                text-gray-900 dark:text-white 
                focus:outline-none focus:ring-2 focus:ring-blue-500 
                transition"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                  Amount ({currency})
                </label>
                <input
                  type="text"
                  name="amount"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 
                bg-white dark:bg-slate-800 
                text-gray-900 dark:text-white 
                focus:outline-none focus:ring-2 focus:ring-blue-500 
                transition"
                />
                {amountError && (
                  <p className="text-red-500 text-sm mt-1">
                    {amountError}
                  </p>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                  Category
                </label>

                <div className="relative">
                  <select
                    name="type"
                    value={form.type}
                    onChange={handleChange}
                    className="w-full appearance-none px-4 py-3 rounded-lg 
                  border border-gray-300 dark:border-slate-600 
                  bg-white dark:bg-slate-800 
                  text-gray-900 dark:text-white 
                  focus:outline-none focus:ring-2 focus:ring-blue-500 
                  transition cursor-pointer"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>

                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none w-4 h-4"
                  />
                </div>
              </div>

              {/* Payment Mode */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                  Payment Mode
                </label>

                <div className="grid grid-cols-2 gap-3">
                  {["online", "cash"].map((mode) => {
                    const isActive = form.mode === mode;

                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setForm({ ...form, mode })}
                        className={`py-3 rounded-lg font-medium transition-all duration-200 border cursor-pointer ${isActive
                            ? "bg-green-600 text-white border-green-600 shadow-md"
                            : "bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700"
                          }`}
                      >
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-indigo-500
                text-white py-3 rounded-lg font-semibold 
                flex items-center justify-center gap-2 
                hover:scale-[1.02] transition 
                cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} className="animate-spin w-4 h-4" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faCheck} className="w-4 h-4" />
                      Save Expense
                    </>
                  )}
                </button>

                <Link
                  href="/dashboard"
                  className="flex-1 sm:flex-none px-6 py-3 border 
                rounded-lg text-center font-semibold 
                border-blue-500 text-white bg-blue-600
                transition cursor-pointer 
                flex items-center justify-center gap-2"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
                  Back
                </Link>

              </div>

            </form>

          </div>
        </div>
      </div>
    </>
  );
}
