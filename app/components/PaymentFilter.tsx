"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLayerGroup, faWallet } from "@fortawesome/free-solid-svg-icons";
import CustomSelect from "./CustomSelect";
import { useCards } from "./CardsProvider";
import { PAYMENT_ICONS } from "./PaymentMethod";
import { CARD_TYPE_LABELS, PAYMENT_METHODS, PAYMENT_METHOD_LABELS, cardLabel, paymentMethodLabel, type PaymentMethod, type SavedCard } from "@/lib/payment";

export type PaymentFilterValue = { mode: PaymentMethod | null; cardId: string | null };
export const ALL_PAYMENTS: PaymentFilterValue = { mode: null, cardId: null };

export function isSamePaymentFilter(a: PaymentFilterValue, b: PaymentFilterValue): boolean {
  return a.mode === b.mode && a.cardId === b.cardId;
}

/** Adds the filter to an `/api/expenses` query string. */
export function appendPaymentFilter(params: URLSearchParams, filter: PaymentFilterValue): URLSearchParams {
  if (filter.mode) params.set("mode", filter.mode);
  if (filter.cardId) params.set("cardId", filter.cardId);
  return params;
}

/** "Card · HDFC Credit •••• 4582" — for page subtitles and empty states. */
export function describePaymentFilter(filter: PaymentFilterValue, cards: SavedCard[]): string | null {
  if (!filter.mode) return null;
  const card = filter.cardId ? cards.find((item) => item.id === filter.cardId) : undefined;
  return card ? `${paymentMethodLabel(filter.mode)} · ${cardLabel(card)}` : paymentMethodLabel(filter.mode);
}

/**
 * Narrow a page to Online, Card or Cash payments, and card payments to one
 * saved card. Selection is shown by weight, border and background plus
 * `aria-pressed`, not by colour alone.
 */
export default function PaymentFilter({ value, onChange }: { value: PaymentFilterValue; onChange: (value: PaymentFilterValue) => void }) {
  const { cards } = useCards();
  const sortedCards = [...cards].sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));

  return <div className="flex items-center justify-between gap-3 flex-wrap">
    <span className="text-secondary font-medium flex items-center gap-2"><FontAwesomeIcon icon={faWallet} className="h-3.5 w-3.5 text-stone-500" aria-hidden="true" />Payment</span>
    <div className="payment-filter-controls flex items-center gap-2 flex-wrap justify-end">
      <div className="segmented" role="group" aria-label="Payment method filter">
        <button type="button" className="segment" aria-pressed={!value.mode} onClick={() => onChange(ALL_PAYMENTS)}><FontAwesomeIcon icon={faLayerGroup} className="w-3.5 h-3.5" aria-hidden="true" />All</button>
        {PAYMENT_METHODS.map((mode) => <button key={mode} type="button" className="segment" aria-pressed={value.mode === mode} onClick={() => onChange({ mode, cardId: null })}><FontAwesomeIcon icon={PAYMENT_ICONS[mode]} className="w-3.5 h-3.5" aria-hidden="true" />{PAYMENT_METHOD_LABELS[mode]}</button>)}
      </div>
      {value.mode === "card" && sortedCards.length > 0 && <div className="w-full sm:w-64">
        <CustomSelect
          id="payment-card-filter"
          label="Filter by card"
          value={value.cardId ?? ""}
          onChange={(cardId) => onChange({ mode: "card", cardId: cardId || null })}
          options={[{ value: "", label: "All cards" }, ...sortedCards.map((card) => ({ value: card.id, label: `${cardLabel(card)} · ${CARD_TYPE_LABELS[card.type]}` }))]}
        />
      </div>}
    </div>
  </div>;
}
