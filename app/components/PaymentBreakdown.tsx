"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { PAYMENT_ICONS } from "./PaymentMethod";
import { formatAmount } from "@/lib/format";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/lib/payment";

const SWATCH = { online: "var(--chart-1)", card: "var(--chart-3)", cash: "var(--chart-2)" } as const;

/**
 * Spend split across Online / Card / Cash. Every method is always listed (with
 * zero where unused) so the three read consistently everywhere; each row has
 * its icon and name, so the bar colours are never the only cue.
 */
export default function PaymentBreakdown({ byMode, total, currency }: { byMode: { mode: string; amount: number }[]; total: number; currency: string }) {
  const rows = PAYMENT_METHODS.map((mode) => ({ mode, amount: byMode.find((item) => item.mode === mode)?.amount ?? 0 }));
  if (total <= 0) return <p className="muted">No payments in this range.</p>;
  return <>
    <div className="split-bar mb-6" aria-hidden="true">
      {rows.filter(({ amount }) => amount > 0).map(({ mode, amount }) => <span key={mode} style={{ width: `${amount / total * 100}%`, background: SWATCH[mode] }} />)}
    </div>
    <ul className="grid gap-4">
      {rows.map(({ mode, amount }) => <li className="payment-breakdown-row flex items-center justify-between gap-4" key={mode}>
        <div className="flex items-center gap-3 min-w-0">
          <span className="legend-swatch" style={{ background: SWATCH[mode] }} aria-hidden="true" />
          <FontAwesomeIcon icon={PAYMENT_ICONS[mode]} className="w-3.5 h-3.5 text-stone-500 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-medium">{PAYMENT_METHOD_LABELS[mode]}</p>
            <p className="muted text-xs">{(amount / total * 100).toFixed(1)}% of total</p>
          </div>
        </div>
        <span className="money">{currency} {formatAmount(amount)}</span>
      </li>)}
    </ul>
  </>;
}
