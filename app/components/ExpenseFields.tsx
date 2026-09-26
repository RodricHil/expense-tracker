"use client";
import { useId } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faCreditCard, faPlus } from "@fortawesome/free-solid-svg-icons";
import CustomSelect from "./CustomSelect";
import DatePicker from "./DatePicker";
import Skeleton from "./Skeleton";
import { useCards } from "./CardsProvider";
import { PAYMENT_ICONS } from "./PaymentMethod";
import { categories } from "@/lib/expense-options";
import { CARD_TYPE_LABELS, PAYMENT_METHODS, PAYMENT_METHOD_LABELS, cardLabel, type SavedCard } from "@/lib/payment";

type Fields = { date: string; description: string; amount: string; type: string; mode: string; cardId?: string | null };
type ChangeEvent = { target: { name: string; value: string } };

/**
 * A card payment must name one of the user's saved cards. The API enforces
 * the same rule; this gives the reason before a round trip.
 */
export function cardSelectionError(form: Pick<Fields, "mode" | "cardId">, cards: SavedCard[]): string {
  if (form.mode !== "card") return "";
  if (cards.length === 0) return "Add a card in Settings first, or choose Online or Cash.";
  return cards.some((card) => card.id === form.cardId) ? "" : "Select the card used for this payment.";
}

/** Only a card payment carries a card reference; the API enforces this too. */
export function paymentPayload(form: Pick<Fields, "mode" | "cardId">) {
  return { mode: form.mode, cardId: form.mode === "card" ? form.cardId || null : null };
}

export default function ExpenseFields({ form, currency, onChange, amountError, cardError }: { form: Fields; currency: string; onChange: (event: ChangeEvent) => void; amountError?: string; cardError?: string }) {
  const id = useId();
  const { cards, loading: cardsLoading } = useCards();
  const sortedCards = [...cards].sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));

  return <div className="form-grid">
    <label className="field form-full"><span>Description</span><input className="input" name="description" type="text" required maxLength={500} value={form.description} onChange={onChange} placeholder="e.g. Groceries" /></label>
    <label className="field"><span>Amount ({currency})</span><input className="input" name="amount" type="text" inputMode="decimal" autoComplete="off" required value={form.amount} onChange={onChange} placeholder="0.00" aria-invalid={!!amountError} aria-describedby={amountError ? `${id}-amount-error` : undefined} />{amountError && <span id={`${id}-amount-error`} role="alert" className="field-error">{amountError}</span>}</label>
    <div className="field"><span>Date</span><DatePicker label="Date" required value={form.date} onChange={(value) => onChange({ target: { name: "date", value } })} /></div>
    <div className="field"><span>Category</span><CustomSelect label="Category" value={form.type} onChange={(value) => onChange({ target: { name: "type", value } })} options={categories.map((category) => ({ value: category, label: category.charAt(0).toUpperCase() + category.slice(1) }))} /></div>

    <fieldset className="field border-0 p-0 m-0 min-w-0">
      <legend className="field-label mb-2">Payment method</legend>
      <div className="choice-group">
        {PAYMENT_METHODS.map((method) => <label key={method} className="choice">
          <input type="radio" name={`${id}-mode`} value={method} checked={form.mode === method} onChange={() => onChange({ target: { name: "mode", value: method } })} />
          <FontAwesomeIcon icon={PAYMENT_ICONS[method]} aria-hidden="true" />
          <span>{PAYMENT_METHOD_LABELS[method]}</span>
          <FontAwesomeIcon icon={faCircleCheck} className="choice-check" aria-hidden="true" />
        </label>)}
      </div>
    </fieldset>

    {form.mode === "card" && <div className="field form-full">
      <span>Select card</span>
      {cardsLoading ? <>
        <Skeleton height={46} />
        <span role="status" className="sr-only">Loading your saved cards…</span>
      </> : sortedCards.length === 0 ? <>
        <div className="empty-inline" data-invalid={!!cardError || undefined}>
          <p className="flex items-start gap-2.5"><FontAwesomeIcon icon={faCreditCard} className="w-4 h-4 mt-1 shrink-0 text-stone-500" aria-hidden="true" /><span><strong className="font-semibold text-stone-300">No cards added yet.</strong> Add a debit or credit card from Settings to record a card payment.</span></p>
          <Link href="/settings#cards" className="text-link w-fit"><FontAwesomeIcon icon={faPlus} aria-hidden="true" />Add a card in Settings</Link>
        </div>
        {cardError && <span role="alert" className="field-error">{cardError}</span>}
      </> : <>
        <CustomSelect
          label="Select card"
          placeholder="Choose a saved card"
          value={form.cardId ?? ""}
          invalid={!!cardError}
          describedBy={cardError ? `${id}-card-error` : undefined}
          onChange={(value) => onChange({ target: { name: "cardId", value } })}
          options={sortedCards.map((card) => ({ value: card.id, label: `${cardLabel(card)} · ${CARD_TYPE_LABELS[card.type]}` }))}
        />
        {cardError && <span id={`${id}-card-error`} role="alert" className="field-error">{cardError}</span>}
        <Link href="/settings#cards" className="text-link w-fit text-xs">Manage cards</Link>
      </>}
    </div>}
  </div>;
}
