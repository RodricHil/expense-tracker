"use client";
import { useState } from "react";
import { formatAmount } from "@/lib/format";

export default function CategoryBreakdown({ categories, total, currency, limit = 6 }: { categories: { type: string; amount: number }[]; total: number; currency: string; limit?: number }) {
  const [expanded, setExpanded] = useState(false);
  const sorted = [...categories].sort((a, b) => b.amount - a.amount);
  const visible = expanded ? sorted : sorted.slice(0, limit);
  if (!visible.length) return <p className="muted">No expenses in this range.</p>;
  return <>
    <div className="grid gap-5">
      {visible.map(({ type, amount }) => {
        const share = total > 0 ? amount / total * 100 : 0;
        return <div key={type} className="rank-row">
          <div className="rank-label"><span>{type}</span><span className="money">{currency} {formatAmount(amount)}</span></div>
          <div className="flex items-center gap-3"><div className="progress-track flex-1" aria-hidden="true"><div className="progress-fill" style={{ width: `${Math.min(share, 100)}%` }} /></div><span className="muted text-xs w-14 text-right tabular-nums">{share.toFixed(1)}%</span></div>
        </div>;
      })}
    </div>
    {sorted.length > limit && <button type="button" className="btn mt-6 w-full" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? "Show fewer" : `All ${sorted.length} categories`}</button>}
  </>;
}
