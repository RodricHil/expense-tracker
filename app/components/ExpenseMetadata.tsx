"use client";
import { useExpenseOptions } from "./ExpenseOptionsProvider";
import { refundTotal, type ExpenseDetails } from "@/lib/expense-details";
import { formatAmount } from "@/lib/format";
export function CategoryLabel({ value }: { value: string }) {
  const { options } = useExpenseOptions();
  const label = value.startsWith("custom:") ? options.find((o) => o._id === value.slice(7) && o.kind === "category")?.name : options.find((o) => o.kind === "category" && o.legacyType === value)?.name ?? value;
  return <>{label ?? (value.startsWith("custom:") ? "Personal category" : value)}</>;
}
export default function ExpenseMetadata({ expense, currency }: { expense: ExpenseDetails & { amount: number }; currency: string }) {
  const refunded = refundTotal(expense);
  const payment = [expense.onlineMethod === "upi" ? "UPI" : expense.onlineMethod === "card" ? "Online card" : "", expense.upiApp, expense.upiSource === "bank" ? "Bank account" : expense.upiSource === "rupay-credit" ? "RuPay credit card" : "", expense.cardNetwork];
  return <div className="text-xs muted"><p>{[expense.merchant, expense.platform, ...payment].filter(Boolean).join(" · ")}</p>{refunded > 0 && <p>{Math.round(refunded * 100) >= Math.round(expense.amount * 100) ? "Full refund" : "Partial refund"}: {currency} {formatAmount(refunded)} · Net {currency} {formatAmount(expense.amount - refunded)}</p>}</div>;
}
