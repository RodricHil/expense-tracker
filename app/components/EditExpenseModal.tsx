"use client";
import { useState } from "react";
import { useCurrency } from "@/app/components/CurrencyProvider";
import { useCards } from "@/app/components/CardsProvider";
import { useNotification } from "@/app/components/elements/NotificationProvider";
import ExpenseFields, { cardSelectionError, paymentPayload } from "./ExpenseFields";
import Modal from "./Modal";

import { refundTotal, type ExpenseDetails } from "@/lib/expense-details";

type Expense = ExpenseDetails & { _id: string; date: string; description: string; quantity?: number; mode: string; cardId?: string | null; type: string; amount: number };
export default function EditExpenseModal({ expense, onClose, onUpdated }: { expense: Expense; onClose: () => void; onUpdated: () => void }) {
  const [form, setForm] = useState({ ...expense, cardId: expense.cardId ?? null, date: expense.date.slice(0, 10), amount: expense.amount.toFixed(2) });
  const [isLoading, setIsLoading] = useState(false);
  const [amountError, setAmountError] = useState("");
  const [cardError, setCardError] = useState("");
  const { currency } = useCurrency();
  const { cards } = useCards();
  const { showNotification } = useNotification();
  const handleChange = (event: { target: { name: string; value: string } }) => {
    const { name, value } = event.target;
    if (name === "amount" && value !== "" && !/^\d+$|^\d+\.\d{0,2}$/.test(value)) { setAmountError("Use up to two decimal places."); return; }
    if (name === "amount") setAmountError("");
    if (name === "mode" || name === "cardId") setCardError("");
    setForm((previous) => ({ ...previous, [name]: value, ...(name === "cardId" ? { cardNetwork: cards.find((card) => card.id === value)?.network ?? "" } : {}) }));
  };
  const handleUpdate = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) { setAmountError("Enter an amount greater than zero."); return; }
    if (Number(form.amount) < refundTotal(expense)) { setAmountError("Amount cannot be less than refunds already recorded."); return; }
    const cardProblem = cardSelectionError(form, cards);
    if (cardProblem) { setCardError(cardProblem); return; }
    setIsLoading(true);
    try {
      const response = await fetch("/api/expenses", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: expense._id, date: form.date, description: form.description, type: form.type, ...paymentPayload(form), quantity: form.quantity ? Number(form.quantity) : null, amount: Number(form.amount) }) });
      if (!response.ok) throw new Error("Update failed");
      onUpdated();
      onClose();
      showNotification("Expense updated", "success");
    } catch { showNotification("Couldn’t save changes. Try again.", "error"); }
    finally { setIsLoading(false); }
  };
  return <Modal title="Edit expense" onClose={onClose} busy={isLoading} wide>
    <form onSubmit={handleUpdate}><fieldset disabled={isLoading} className="border-0 p-0 m-0 min-w-0">
      <ExpenseFields form={form} currency={currency} onChange={handleChange} amountError={amountError} cardError={cardError} />
      <div className="form-actions"><button type="button" className="btn" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary" disabled={isLoading}>{isLoading ? "Saving…" : "Save changes"}</button></div>
    </fieldset></form>
  </Modal>;
}
