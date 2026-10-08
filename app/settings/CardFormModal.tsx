"use client";

import { useId, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faShieldHalved } from "@fortawesome/free-solid-svg-icons";
import CustomSelect from "@/app/components/CustomSelect";
import Modal from "@/app/components/Modal";
import { CARD_TYPE_ICONS } from "@/app/components/PaymentMethod";
import { useCards } from "@/app/components/CardsProvider";
import { useNotification } from "@/app/components/elements/NotificationProvider";
import { CARD_LIMIT_PER_TYPE, CARD_NAME_MAX_LENGTH, CARD_TYPES, CARD_TYPE_LABELS, cardLimitMessage, type CardType, type SavedCard } from "@/lib/payment";

type Errors = Partial<Record<"type" | "name" | "last4" | "form", string>>;

function validate(values: { name: string; last4: string }): Errors {
  const errors: Errors = {};
  const name = values.name.trim();
  if (!name) errors.name = "Enter a nickname for this card.";
  else if (/[0-9]{7}/.test(name.replace(/[\s-]/g, ""))) errors.name = "Don’t include your card number in the nickname.";
  if (!/^[0-9]{4}$/.test(values.last4)) errors.last4 = "Enter exactly the last 4 digits.";
  return errors;
}

/**
 * Add or edit a saved card. Collects only a type, a nickname and the last four
 * digits; there is deliberately no field for anything more sensitive. A type
 * that is already at its limit cannot be chosen, and says why.
 */
export default function CardFormModal({ card, initialType = "credit", onClose }: { card?: SavedCard; initialType?: CardType; onClose: () => void }) {
  const id = useId();
  const { cards, upsertCard } = useCards();
  const { showNotification } = useNotification();
  const [values, setValues] = useState({ type: card?.type ?? initialType, name: card?.name ?? "", last4: card?.last4 ?? "", network: card?.network ?? "" });
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  const atLimit = (type: CardType) => type !== card?.type && cards.filter((item) => item.type === type).length >= CARD_LIMIT_PER_TYPE;

  const submit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validate(values);
    if (atLimit(values.type)) found.type = cardLimitMessage(values.type);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      const res = await fetch("/api/cards", {
        method: card ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(card ? { id: card.id } : {}), type: values.type, name: values.name.trim(), last4: values.last4, network: values.network || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) { setErrors({ type: data.error ?? cardLimitMessage(values.type) }); return; }
      if (res.status === 400 && Array.isArray(data.details)) {
        const next: Errors = {};
        for (const detail of data.details as { field: string; message: string }[]) {
          if (detail.field === "name" || detail.field === "last4" || detail.field === "type") next[detail.field] = `This ${detail.field === "last4" ? "value" : detail.field} ${detail.message}.`;
        }
        setErrors(Object.keys(next).length ? next : { form: "Check the details and try again." });
        return;
      }
      if (!res.ok || !data.card) throw new Error("Save failed");
      upsertCard(data.card as SavedCard);
      showNotification(card ? "Card updated" : "Card added", "success");
      onClose();
    } catch {
      setErrors({ form: "Couldn’t save this card. Try again." });
    } finally {
      setSaving(false);
    }
  };

  const describe = (field: keyof Errors) => (errors[field] ? `${id}-${field}-error` : undefined);

  return <Modal title={card ? "Edit card" : "Add card"} description="Used to label card payments on your expenses." onClose={onClose} busy={saving}>
    <form onSubmit={submit} noValidate>
      <fieldset disabled={saving} className="grid gap-5 border-0 p-0 m-0 min-w-0">
        <div className="field"><span>Card network</span><CustomSelect label="Card network" value={values.network} onChange={(network) => setValues({ ...values, network })} disabled={saving} options={[{ value: "", label: "Unspecified" }, { value: "visa", label: "Visa" }, { value: "mastercard", label: "Mastercard" }, { value: "rupay", label: "RuPay" }]} /></div>
        <fieldset className="field border-0 p-0 m-0 min-w-0" aria-describedby={describe("type")}>
          <legend className="field-label mb-2">Card type</legend>
          <div className="choice-group">
            {CARD_TYPES.map((type) => <label key={type} className="choice">
              <input type="radio" name={`${id}-type`} value={type} checked={values.type === type} disabled={atLimit(type)} onChange={() => { setValues({ ...values, type }); setErrors({ ...errors, type: undefined }); }} />
              <FontAwesomeIcon icon={CARD_TYPE_ICONS[type]} aria-hidden="true" />
              <span>{CARD_TYPE_LABELS[type]}{atLimit(type) && <span className="muted font-normal"> · limit reached</span>}</span>
              <FontAwesomeIcon icon={faCircleCheck} className="choice-check" aria-hidden="true" />
            </label>)}
          </div>
          {errors.type && <span id={`${id}-type-error`} role="alert" className="field-error">{errors.type}</span>}
        </fieldset>
        <label className="field"><span>Card nickname</span>
          <input className="input" name="nickname" type="text" autoComplete="off" maxLength={CARD_NAME_MAX_LENGTH} placeholder="e.g. HDFC Credit" value={values.name} aria-invalid={!!errors.name} aria-describedby={describe("name")} onChange={(event) => { setValues({ ...values, name: event.target.value }); setErrors({ ...errors, name: undefined }); }} />
          {errors.name && <span id={`${id}-name-error`} role="alert" className="field-error">{errors.name}</span>}
        </label>
        <label className="field"><span>Last 4 digits</span>
          <input className="input tabular-nums" name="last4" type="text" inputMode="numeric" autoComplete="off" maxLength={4} placeholder="4582" value={values.last4} aria-invalid={!!errors.last4} aria-describedby={errors.last4 ? `${id}-last4-error` : `${id}-last4-hint`} onChange={(event) => { setValues({ ...values, last4: event.target.value.replace(/\D/g, "").slice(0, 4) }); setErrors({ ...errors, last4: undefined }); }} />
          {errors.last4 ? <span id={`${id}-last4-error`} role="alert" className="field-error">{errors.last4}</span> : <span id={`${id}-last4-hint`} className="field-hint">Shown as •••• {values.last4.padEnd(4, "•")}</span>}
        </label>
        <p className="inline-note"><FontAwesomeIcon icon={faShieldHalved} aria-hidden="true" /><span>Only the nickname and last 4 digits are saved. Never enter your full card number, CVV, PIN, OTP or expiry date.</span></p>
        {errors.form && <p role="alert" className="field-error">{errors.form}</p>}
      </fieldset>
      <div className="form-actions"><button type="button" className="btn" disabled={saving} onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : card ? "Save changes" : "Add card"}</button></div>
    </form>
  </Modal>;
}
