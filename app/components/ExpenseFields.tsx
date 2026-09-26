"use client";
import { useId } from "react";
import CustomSelect from "./CustomSelect";
import DatePicker from "./DatePicker";
import { categories } from "@/lib/expense-options";

type Fields = { date: string; description: string; amount: string; type: string; mode: string };
export default function ExpenseFields({ form, currency, onChange, amountError }: { form: Fields; currency: string; onChange: (event: { target: { name: string; value: string } }) => void; amountError?: string }) {
  const id = useId();
  return <div className="form-grid">
    <label className="field form-full"><span>Description</span><input className="input" name="description" type="text" required maxLength={500} value={form.description} onChange={onChange} placeholder="e.g. Groceries" /></label>
    <label className="field"><span>Amount ({currency})</span><input className="input" name="amount" type="text" inputMode="decimal" required value={form.amount} onChange={onChange} placeholder="0.00" aria-invalid={!!amountError} aria-describedby={amountError ? `${id}-amount-error` : undefined} />{amountError && <span id={`${id}-amount-error`} role="alert" className="text-red-300">{amountError}</span>}</label>
    <div className="field"><span>Date</span><DatePicker label="Date" required value={form.date} onChange={(value) => onChange({ target: { name: "date", value } })} /></div>
    <div className="field"><span>Category</span><CustomSelect label="Category" value={form.type} onChange={(value) => onChange({ target: { name: "type", value } })} options={categories.map((category) => ({ value: category, label: category.charAt(0).toUpperCase() + category.slice(1) }))} /></div>
    <div className="field"><span>Payment method</span><CustomSelect label="Payment method" value={form.mode} onChange={(value) => onChange({ target: { name: "mode", value } })} options={[{ value: "online", label: "Online" }, { value: "cash", label: "Cash" }]} /></div>
  </div>;
}
