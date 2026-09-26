"use client";

import { useSyncExternalStore, useState } from "react";
import { localDateKey } from "@/lib/format";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faCheck } from "@fortawesome/free-solid-svg-icons";
import ExpenseFields, { cardSelectionError, paymentPayload } from "@/app/components/ExpenseFields";
import Navbar from "@/app/components/Navbar";
import { useNotification } from "@/app/components/elements/NotificationProvider";
import { useCurrency } from "@/app/components/CurrencyProvider";
import { useCards } from "@/app/components/CardsProvider";



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
  const [cardError, setCardError] = useState("");
  const { showNotification } = useNotification();
  const { currency } = useCurrency();
  const { cards } = useCards();

  const [form, setForm] = useState({
    date: null as string | null,
    description: "",
    quantity: "",
    mode: "online",
    cardId: null as string | null,
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

    if (name === "mode" || name === "cardId") setCardError("");
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!form.amount || Number(form.amount) <= 0) {
      setAmountError("Enter an amount greater than zero.");
      return;
    }
    const cardProblem = cardSelectionError(form, cards);
    if (cardProblem) {
      setCardError(cardProblem);
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          ...paymentPayload(form),
          date: form.date ?? today,
          quantity: form.quantity ? Number(form.quantity) : null,
          amount: Number(form.amount),
        }),
      });

      if (res.ok) {
        showNotification("Expense added successfully", "success");
        router.push("/dashboard");
      } else {
        showNotification("Couldn’t add the expense. Check the details and try again.", "error");
      }
    } catch {
      showNotification("Unable to save expense. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return <>
    <Navbar />
    <main className="app-shell">
      <div className="content-narrow">
        <div className="page-heading"><div><h1>Add expense</h1><p>Record a purchase and how you paid for it.</p></div><Link href="/dashboard" className="text-link"><FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" />All expenses</Link></div>
        <section className="panel" aria-label="Expense details">
          <form onSubmit={handleSubmit}>
            <fieldset disabled={isLoading} className="border-0 p-0 m-0 min-w-0">
              <ExpenseFields form={{ ...form, date: form.date ?? today }} currency={currency} onChange={handleChange} amountError={amountError} cardError={cardError} />
              <div className="form-actions"><Link href="/dashboard" className="btn">Cancel</Link><button type="submit" disabled={isLoading} className="btn btn-primary">{!isLoading && <FontAwesomeIcon icon={faCheck} aria-hidden="true" />}{isLoading ? "Saving…" : "Save expense"}</button></div>
            </fieldset>
          </form>
        </section>
      </div>
    </main>
  </>;
}
