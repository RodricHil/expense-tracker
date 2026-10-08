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
import PersonalOptions from "./PersonalOptions";
import { needsCard, detailsPayload, type ExpenseDetails } from "@/lib/expense-details";
import { CARD_TYPE_LABELS, PAYMENT_METHODS, PAYMENT_METHOD_LABELS, cardLabel, type SavedCard } from "@/lib/payment";

type Fields = ExpenseDetails & { date: string; description: string; amount: string; type: string; mode: string; cardId?: string | null };
type ChangeEvent = { target: { name: string; value: string } };

/**
 * A card payment must name one of the user's saved cards. The API enforces
 * the same rule; this gives the reason before a round trip.
 */
export function cardSelectionError(form: Pick<Fields, "mode" | "cardId"> & ExpenseDetails, cards: SavedCard[]): string {
  if (!needsCard(form)) return "";
  if (form.mode === "online" && form.onlineMethod === "upi" && form.upiSource === "rupay-credit" && !cards.some((card) => card.id === form.cardId && card.type === "credit" && card.network === "rupay")) return "Select a saved RuPay credit card. Set its network in Settings first.";
  if (cards.length === 0) return "Add a card in Settings first, or choose Online or Cash.";
  return cards.some((card) => card.id === form.cardId) ? "" : "Select the card used for this payment.";
}

/** Only a card payment carries a card reference; the API enforces this too. */
export function paymentPayload(form: Pick<Fields, "mode" | "cardId"> & ExpenseDetails) {
  return { ...detailsPayload(form), mode: form.mode, cardId: needsCard(form) ? form.cardId || null : null };
}

export default function ExpenseFields({ form, currency, onChange, amountError, cardError }: { form: Fields; currency: string; onChange: (event: ChangeEvent) => void; amountError?: string; cardError?: string }) {
  const id = useId();
  const { cards, loading: cardsLoading } = useCards();
  const isRupayUPI = form.mode === "online" && form.onlineMethod === "upi" && form.upiSource === "rupay-credit";
  const sortedCards = cards.filter((card) => !isRupayUPI || (card.type === "credit" && card.network === "rupay")).sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));

  return <div className="form-grid">
    <label className="field form-full"><span>Description</span><textarea className="input expense-description" name="description" rows={2} required maxLength={500} value={form.description} onChange={onChange} placeholder="Describe your expense…" /></label>
    <label className="field"><span>Amount ({currency})</span><input className="input" name="amount" type="text" inputMode="decimal" autoComplete="off" required value={form.amount} onChange={onChange} placeholder="0.00" aria-invalid={!!amountError} aria-describedby={amountError ? `${id}-amount-error` : undefined} />{amountError && <span id={`${id}-amount-error`} role="alert" className="field-error">{amountError}</span>}</label>
    <div className="field"><span>Date</span><DatePicker label="Date" required value={form.date} onChange={(value) => onChange({ target: { name: "date", value } })} /></div>
    <PersonalOptions kind="category" value={form.type} onChange={(value) => onChange({ target: { name: "type", value } })} />

    <label className="field"><span>Platform</span><input className="input" maxLength={120} value={form.platform ?? ""} onChange={(e) => onChange({ target: { name: "platform", value: e.target.value } })} placeholder="e.g. Amazon or Swiggy" /></label>

    {form.mode === "online" && <div className="field"><span>Online payment</span><CustomSelect label="Online payment" value={form.onlineMethod ?? ""} onChange={(value) => onChange({ target: { name: "onlineMethod", value } })} options={[{ value: "", label: "Unspecified" }, { value: "card", label: "Card" }, { value: "upi", label: "UPI" }]} /></div>}
    {form.mode === "online" && form.onlineMethod === "upi" && <>
      <PersonalOptions kind="upiApp" value={form.upiApp ?? ""} onChange={(value) => onChange({ target: { name: "upiApp", value } })} />
      <div className="field"><span>UPI funding source</span><CustomSelect label="UPI funding source" value={form.upiSource ?? ""} onChange={(value) => onChange({ target: { name: "upiSource", value } })} options={[{ value: "", label: "Unspecified" }, { value: "bank", label: "Bank account" }, { value: "rupay-credit", label: "RuPay credit card" }]} /></div>
    </>}
    <label className="field"><span>Merchant</span><input className="input" maxLength={120} value={form.merchant ?? ""} onChange={(e) => onChange({ target: { name: "merchant", value: e.target.value } })} placeholder="Store or business" /></label>
    <fieldset className="field expense-payment-field border-0 p-0 m-0 min-w-0">
      <legend className="field-label mb-2">Payment method</legend>
      <div className="choice-group expense-payment-choices">
        {PAYMENT_METHODS.map((method) => <label key={method} className="choice">
          <input type="radio" name={`${id}-mode`} value={method} checked={form.mode === method} onChange={() => onChange({ target: { name: "mode", value: method } })} />
          <FontAwesomeIcon icon={PAYMENT_ICONS[method]} aria-hidden="true" />
          <span>{PAYMENT_METHOD_LABELS[method]}</span>
          <FontAwesomeIcon icon={faCircleCheck} className="choice-check" aria-hidden="true" />
        </label>)}
      </div>
    </fieldset>
    {needsCard(form) && <div className="field">
      <span>Select card</span>
      {cardsLoading ? <>
        <Skeleton height={46} />
        <span role="status" className="sr-only">Loading your saved cards…</span>
      </> : sortedCards.length === 0 ? <>
        <div className="empty-inline" data-invalid={!!cardError || undefined}>
          <p className="flex items-start gap-2.5"><FontAwesomeIcon icon={faCreditCard} className="w-4 h-4 mt-1 shrink-0 text-stone-500" aria-hidden="true" /><span><strong className="font-semibold text-stone-300">No cards added yet.</strong> Add a compatible card from Settings to record this payment.</span></p>
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
