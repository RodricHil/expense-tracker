"use client";

import { useSyncExternalStore, useState } from "react";
import { localDateKey } from "@/lib/format";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ExpenseFields from "@/app/components/ExpenseFields";
import Navbar from "@/app/components/Navbar";
import { useNotification } from "@/app/components/elements/NotificationProvider";
import { useCurrency } from "@/app/components/CurrencyProvider";



const subscribeToDate = (notify: () => void) => {
  const timer = window.setInterval(notify, 30_000);
  return () => window.clearInterval(timer);
};
const serverDate = () => "";

export default function AddExpense() {
  const today = useSyncExternalStore(subscribeToDate, localDateKey, serverDate);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [amountError, setAmountError] = useState("");
  const { showNotification } = useNotification();
  const { currency } = useCurrency();

  const [form, setForm] = useState({
    date: null as string | null,
    description: "",
    quantity: "",
    mode: "online",
    type: "food",
    amount: "",
  });

  const handleChange = (
    e: { target: { name: string; value: string } }
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

    if (!form.amount || Number(form.amount) <= 0) {
      setAmountError("Enter an amount greater than zero.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          date: form.date ?? today,
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
    } catch {
      showNotification("Unable to save expense. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return <>
    <Navbar />
    <main className="app-shell" style={{ maxWidth: 760 }}>
      <div className="page-heading"><h1>Add expense</h1><Link href="/dashboard" className="text-link">All expenses</Link></div>
      <section className="panel">
        <form onSubmit={handleSubmit}>
          <fieldset disabled={isLoading}>
            <ExpenseFields form={{ ...form, date: form.date ?? today }} currency={currency} onChange={handleChange} amountError={amountError} />
            <div className="form-actions"><Link href="/dashboard" className="btn">Cancel</Link><button type="submit" disabled={isLoading} className="btn btn-primary">{isLoading ? "Saving…" : "Save expense"}</button></div>
          </fieldset>
        </form>
      </section>
    </main>
  </>;
}
