"use client";
import { useState } from "react";
import CustomSelect from "./CustomSelect";
import Modal from "./Modal";
import { localDateKey, formatAmount } from "@/lib/format";
import { refundTotal, type ExpenseDetails } from "@/lib/expense-details";
import { useCurrency } from "./CurrencyProvider";
export default function RefundModal({ expense, onClose, onSaved }: { expense: ExpenseDetails & { _id: string; amount: number; description: string }; onClose: () => void; onSaved: () => void }) {
  const remaining = Math.round((expense.amount - refundTotal(expense)) * 100) / 100;
  const [kind, setKind] = useState("full");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(localDateKey);
  const [source, setSource] = useState(expense.merchant || expense.platform || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { currency } = useCurrency();
  async function submit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const res = await fetch("/api/expenses", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: expense._id, amount: kind === "full" ? remaining.toFixed(2) : amount, date, source }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error === "Invalid request body" ? "Check the amount, date and source." : data.error); return; }
      onSaved(); onClose();
    } catch { setError("Couldn’t record the refund. Try again."); }
    finally { setBusy(false); }
  }
  return <Modal title="Track refund" description={expense.description} onClose={onClose} busy={busy}><form onSubmit={submit}><fieldset disabled={busy} className="grid gap-4 border-0 p-0 m-0"><p>Remaining refundable: {currency} {formatAmount(remaining)}</p><div className="field"><span>Refund type</span><CustomSelect label="Refund type" value={kind} onChange={setKind} disabled={busy} options={[{ value: "full", label: "Full remaining refund" }, { value: "partial", label: "Partial refund" }]} /></div>{kind === "partial" && <label className="field"><span>Refund amount</span><input className="input" type="number" min="0.01" max={remaining} step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} /></label>}<label className="field"><span>Refund date</span><input className="input" type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></label><label className="field"><span>Refund source</span><input className="input" required maxLength={120} value={source} onChange={(e) => setSource(e.target.value)} placeholder="Merchant, platform or bank" /></label>{(expense.refunds ?? []).map((refund, i) => <p className="text-sm muted" key={i}>{refund.date.slice(0, 10)} · {refund.source} · {currency} {formatAmount(refund.cents / 100)}</p>)}{error && <p className="field-error" role="alert">{error}</p>}<div className="form-actions"><button className="btn" type="button" onClick={onClose}>Cancel</button><button className="btn btn-primary" type="submit" disabled={remaining <= 0 || busy}>{busy ? "Saving…" : "Record refund"}</button></div></fieldset></form></Modal>;
}
