"use client";
import { useState } from "react";
import Modal from "@/app/components/Modal";
import CustomSelect from "@/app/components/CustomSelect";
import DatePicker from "@/app/components/DatePicker";
import { useNotification } from "@/app/components/elements/NotificationProvider";
import { localDateKey } from "@/lib/format";
import { INVESTMENT_TYPES, INVESTMENT_LABELS, INVESTMENT_STATUSES, investmentSchema, amountToCents, isInsurance, type InvestmentRecord, type InvestmentType } from "@/lib/investments";
const amount = (cents: number | null | undefined) => cents === null || cents === undefined ? "" : (cents / 100).toFixed(2);
export default function InvestmentForm({ record, currency, onClose, onSaved }: { record?: InvestmentRecord; currency: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: record?.name ?? "", type: record?.type ?? "sip", status: record?.status ?? "active", invested: amount(record?.investedCents), current: amount(record?.currentValueCents), contribution: amount(record?.contributionCents), frequency: record?.frequency ?? "none", startDate: record?.startDate ?? localDateKey(), maturityDate: record?.maturityDate ?? "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const { showNotification } = useNotification();
  const insurance = isInsurance(form.type);
  const savedCurrency = record?.currency ?? currency;
  const change = (key: keyof typeof form, value: string) => setForm((previous) => ({ ...previous, [key]: value }));
  const error = (key: string) => errors[key] && <span className="field-error" role="alert">{errors[key]}</span>;
  async function submit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = investmentSchema.safeParse({ name: form.name, type: form.type, status: form.status, currency: savedCurrency, investedCents: amountToCents(form.invested), currentValueCents: insurance ? null : amountToCents(form.current), contributionCents: form.frequency === "none" ? null : amountToCents(form.contribution), frequency: form.frequency, startDate: form.startDate, maturityDate: form.maturityDate || null });
    if (!result.success) { setErrors(Object.fromEntries(result.error.issues.map((issue) => [issue.path.join("."), issue.message]))); return; }
    setBusy(true); setErrors({});
    try {
      const response = await fetch("/api/investments", { method: record ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(record ? { id: record.id, record: result.data } : result.data) });
      if (!response.ok) {
        const data = await response.json();
        if (response.status === 400 && data.details) { setErrors(Object.fromEntries(data.details.map((detail: { field: string; message: string }) => [detail.field.replace(/^record\./, ""), detail.message]))); return; }
        throw new Error("Save failed");
      }
      showNotification(record ? "Record updated" : "Record added", "success"); onSaved(); onClose();
    } catch { setErrors({ form: "Couldn’t save this record. Try again." }); }
    finally { setBusy(false); }
  }
  return <Modal wide title={record ? "Edit investment or insurance" : "Add investment or insurance"} description="Use a nickname. Never enter account, folio, policy, PAN or Aadhaar numbers, passwords or other credentials." onClose={onClose} busy={busy}>
    <form onSubmit={submit}><fieldset disabled={busy} className="investment-form-grid">
      <label className="field investment-form-full"><span>Nickname</span><input className="input" maxLength={80} required value={form.name} onChange={(event) => change("name", event.target.value)} placeholder="e.g. Long-term index fund or Family health cover" autoComplete="off" aria-invalid={!!errors.name} />{error("name")}</label>
      <div className="field"><span>Type</span><CustomSelect label="Investment type" value={form.type} onChange={(value) => { change("type", value as InvestmentType); }} options={INVESTMENT_TYPES.map((type) => ({ value: type, label: INVESTMENT_LABELS[type] }))} />{error("type")}</div>
      <div className="field"><span>Status</span><CustomSelect label="Investment status" value={form.status} onChange={(value) => change("status", value)} options={INVESTMENT_STATUSES.map((status) => ({ value: status, label: status.charAt(0).toUpperCase() + status.slice(1) }))} />{error("status")}</div>
      <label className="field"><span>{insurance ? "Total premiums paid" : "Total invested"} ({savedCurrency})</span><input className="input" required type="number" min="0" max="1000000000" step="0.01" value={form.invested} onChange={(event) => change("invested", event.target.value)} />{error("investedCents")}</label>
      {!insurance && <label className="field"><span>Current value ({savedCurrency}) · optional</span><input className="input" type="number" min="0" max="1000000000" step="0.01" value={form.current} onChange={(event) => change("current", event.target.value)} placeholder="Leave blank if unknown" />{error("currentValueCents")}</label>}
      <div className="field"><span>Start date</span><DatePicker label="Start date" required value={form.startDate} onChange={(value) => change("startDate", value)} min="1900-01-01" max={form.maturityDate || "2200-12-31"} />{error("startDate")}</div>
      <div className="field"><span>{insurance ? "Renewal / end date" : "Maturity / target date"} · optional</span><DatePicker label={insurance ? "Renewal or end date" : "Maturity or target date"} value={form.maturityDate} min={form.startDate || "1900-01-01"} max="2200-12-31" onChange={(value) => change("maturityDate", value)} />{error("maturityDate")}</div>
      <div className="field"><span>{insurance ? "Premium frequency" : "Contribution frequency"}</span><CustomSelect label="Contribution frequency" value={form.frequency} onChange={(value) => change("frequency", value)} options={[{ value: "none", label: "One-time / no recurring payment" }, { value: "monthly", label: "Monthly" }, { value: "quarterly", label: "Quarterly" }, { value: "yearly", label: "Yearly" }]} />{error("frequency")}</div>
      {form.frequency !== "none" && <label className="field"><span>{insurance ? "Regular premium" : "Regular contribution"} ({savedCurrency})</span><input className="input" type="number" required min="0.01" max="1000000000" step="0.01" value={form.contribution} onChange={(event) => change("contribution", event.target.value)} />{error("contributionCents")}</label>}
      <p className="text-sm muted investment-form-full">Amounts are tracked in {savedCurrency}. Update totals manually after contributions or premiums; recurring amounts do not create payments automatically.</p>
      {errors.form && <p className="field-error investment-form-full" role="alert">{errors.form}</p>}
      <div className="form-actions investment-form-full"><button type="button" className="btn" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary">{busy ? "Saving…" : record ? "Save changes" : "Add record"}</button></div>
    </fieldset></form>
  </Modal>;
}
