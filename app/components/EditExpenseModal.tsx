"use client";
import { useState } from "react";
import { useCurrency } from "@/app/components/CurrencyProvider";
import { useNotification } from "@/app/components/elements/NotificationProvider";
import ExpenseFields from "./ExpenseFields";
import Modal from "./Modal";

type Expense = { _id: string; date: string; description: string; quantity?: number; mode: string; type: string; amount: number };
export default function EditExpenseModal({ expense, onClose, onUpdated }: { expense: Expense; onClose: () => void; onUpdated: () => void }) {
  const [form, setForm] = useState({ ...expense, date: expense.date.slice(0, 10), amount: expense.amount.toFixed(2) });
  const [isLoading, setIsLoading] = useState(false);
  const [amountError, setAmountError] = useState("");
  const { currency } = useCurrency();
  const { showNotification } = useNotification();
  const handleChange = (event: { target: { name: string; value: string } }) => {
    const { name, value } = event.target;
    if (name === "amount" && value !== "" && !/^\d+$|^\d+\.\d{0,2}$/.test(value)) { setAmountError("Use up to two decimal places."); return; }
    if (name === "amount") setAmountError("");
    setForm({ ...form, [name]: value });
  };
  const handleUpdate = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) { setAmountError("Enter an amount greater than zero."); return; }
    setIsLoading(true);
    try {
      const response = await fetch("/api/expenses", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, id: expense._id, quantity: form.quantity ? Number(form.quantity) : null, amount: Number(form.amount) }) });
      if (!response.ok) throw new Error("Update failed");
      onUpdated();
      onClose();
      showNotification("Expense updated", "success");
    } catch { showNotification("Couldn’t save changes. Try again.", "error"); }
    finally { setIsLoading(false); }
  };
  return <Modal title="Edit expense" onClose={onClose} busy={isLoading}>
    <form onSubmit={handleUpdate}><fieldset disabled={isLoading}>
      <ExpenseFields form={form} currency={currency} onChange={handleChange} amountError={amountError} />
      <div className="form-actions"><button type="button" className="btn" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary" disabled={isLoading}>{isLoading ? "Saving…" : "Save changes"}</button></div>
    </fieldset></form>
  </Modal>;
}
