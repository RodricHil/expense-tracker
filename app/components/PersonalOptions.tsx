"use client";
import CustomSelect from "./CustomSelect";
import Link from "next/link";
import { useExpenseOptions } from "./ExpenseOptionsProvider";
export default function PersonalOptions({ kind, value, onChange }: { kind: "category" | "upiApp"; value: string; onChange: (value: string) => void }) {
  const { options, error: loadError, loading } = useExpenseOptions();
  const choices = options.filter((o) => o.kind === kind && !o.archived).map((o) => ({ value: kind === "category" ? `custom:${o._id}` : o.name, name: o.name }));
  return <div className="field"><span>{kind === "category" ? "Category" : "UPI app"}</span><CustomSelect label={kind === "category" ? "Category" : "UPI app"} value={value} placeholder="Choose…" onChange={onChange} disabled={loading} options={[{ value: "", label: "Choose…" }, ...(!choices.some((o) => o.value === value) && value ? [{ value, label: value.startsWith("custom:") ? (options.find((option) => `custom:${option._id}` === value)?.name ?? "Saved personal category") : (options.find((option) => option.kind === "category" && option.legacyType === value)?.name ?? value) }] : []), ...choices.map((o) => ({ value: o.value, label: o.name }))]} /><Link href={kind === "category" ? "/settings#categories" : "/settings#upi-apps"} className="text-link text-xs">Manage {kind === "category" ? "categories" : "UPI apps"} in Settings</Link>{loadError && <span className="field-error" role="alert">{loadError}</span>}</div>;
}
