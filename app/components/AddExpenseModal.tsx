"use client";

import { useSyncExternalStore, useState } from "react";
import { localDateKey } from "@/lib/format";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import ExpenseFields, { cardSelectionError, paymentPayload } from "@/app/components/ExpenseFields";
import ReceiptScanner from "./ReceiptScanner";
import Modal from "./Modal";
import { useNotification } from "@/app/components/elements/NotificationProvider";
import { useCurrency } from "@/app/components/CurrencyProvider";
import { useCards } from "@/app/components/CardsProvider";



const subscribeToDate = (notify: () => void) => {
  const timer = window.setInterval(notify, 30_000);
  return () => window.clearInterval(timer);
};
const serverDate = () => "";

export default function AddExpenseModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const today = useSyncExternalStore(subscribeToDate, localDateKey, serverDate);
  const [scanning, setScanning] = useState(false);
  const [reviewRequired, setReviewRequired] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [amountError, setAmountError] = useState("");
  const [cardError, setCardError] = useState("");
  const { showNotification } = useNotification();
  const { currency } = useCurrency();
  const { cards } = useCards();

  const [form, setForm] = useState({
    date: null as string | null,
    description: "",
    quantity: "",
    mode: "online",
    cardId: null as string | null,
    type: "",
    amount: "",
    onlineMethod: "", upiApp: "", upiSource: "", cardNetwork: "", merchant: "", platform: "",
  });

  const handleChange = (
    e: { target: { name: string; value: string } }
  ) => {
    const { name, value } = e.target;

    if (name === "amount") {
      // Same strings as `^\d+(\.\d{0,2})?$`, expressed without a nested
      // quantifier so `security/detect-unsafe-regex` is satisfied. This is UX
      // only — lib/validation.ts is the authoritative check (ET-H4).
      const regex = /^\d+$|^\d+\.\d{0,2}$/;
      if (value === "" || regex.test(value)) {
        setAmountError("");
        setForm({ ...form, amount: value });
      } else {
        setAmountError("Only numbers with max 2 decimal places allowed");
      }
      return;
    }

    if (name === "mode" || name === "cardId") setCardError("");
    setForm((previous) => ({ ...previous, [name]: value, ...(name === "cardId" ? { cardNetwork: cards.find((card) => card.id === value)?.network ?? "" } : {}) }));
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (scanning || (reviewRequired && !reviewed)) return;

    if (!form.amount || Number(form.amount) <= 0) {
      setAmountError("Enter an amount greater than zero.");
      return;
    }
    if (!form.type) { showNotification("Choose one of your categories. Create it in Settings first.", "error"); return; }
    const cardProblem = cardSelectionError(form, cards);
    if (cardProblem) {
      setCardError(cardProblem);
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          ...paymentPayload(form),
          date: form.date ?? today,
          quantity: form.quantity ? Number(form.quantity) : null,
          amount: Number(form.amount),
        }),
      });

      if (res.ok) {
        showNotification("Expense added successfully", "success");
        onSaved();
        onClose();
      } else {
        showNotification("Couldn’t add the expense. Check the details and try again.", "error");
      }
    } catch {
      showNotification("Unable to save expense. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return <Modal title="Add expense" description="Record a purchase and how you paid for it." onClose={onClose} busy={isLoading || scanning} wide>
    <div className="expense-dialog-layout">
    <ReceiptScanner onBusy={setScanning} onReviewRequired={(required) => { setReviewRequired(required); setReviewed(false); }} onDraft={(draft) => setForm((previous) => ({ ...previous, description: "", merchant: "", platform: "", date: "", type: "", amount: "", mode: "online", onlineMethod: "", upiApp: "", upiSource: "", cardId: null, cardNetwork: "", ...Object.fromEntries(Object.entries(draft).filter(([, value]) => value !== undefined)) }))} />
    <form onSubmit={handleSubmit}>
      <fieldset disabled={isLoading || scanning} className="border-0 p-0 m-0 min-w-0">
        <ExpenseFields form={{ ...form, date: form.date ?? today }} currency={currency} onChange={handleChange} amountError={amountError} cardError={cardError} />
        {reviewRequired && <label className="flex gap-2 mt-4 text-sm"><input type="checkbox" required checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />I checked the scanned details and corrected any errors.</label>}
        <div className="form-actions">
          <button type="button" className="btn" disabled={isLoading} onClick={onClose}>Cancel</button>
          <button type="submit" disabled={isLoading || scanning || (reviewRequired && !reviewed)} className="btn btn-primary">{!isLoading && <FontAwesomeIcon icon={faCheck} aria-hidden="true" />}{isLoading ? "Saving…" : "Save expense"}</button>
        </div>
      </fieldset>
    </form>
    </div>
  </Modal>;
}
