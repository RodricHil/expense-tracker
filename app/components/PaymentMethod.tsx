"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBuildingColumns, faCreditCard, faGlobe, faMoneyBillWave, faWallet, type IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { useCards } from "./CardsProvider";
import { CARD_TYPE_LABELS, isPaymentMethod, maskedCardNumber, paymentMethodLabel, type CardType, type PaymentMethod as Method } from "@/lib/payment";

export const PAYMENT_ICONS: Record<Method, IconDefinition> = {
  online: faGlobe,
  card: faCreditCard,
  cash: faMoneyBillWave,
};

/** Credit and debit differ by icon and by label, never by colour alone. */
export const CARD_TYPE_ICONS: Record<CardType, IconDefinition> = {
  credit: faCreditCard,
  debit: faBuildingColumns,
};

export function paymentIcon(mode: string): IconDefinition {
  return isPaymentMethod(mode) ? PAYMENT_ICONS[mode] : faWallet;
}

/**
 * How a transaction's payment method is shown everywhere: icon + label, and
 * for a card payment the saved card it used ("HDFC Credit · •••• 4582").
 * The card is looked up by id; nothing about it is stored on the expense.
 */
export default function PaymentMethod({ mode, cardId, inline = false }: { mode: string; cardId?: string | null; inline?: boolean }) {
  const { cardById, loading, error } = useCards();
  const card = cardById(cardId);
  const detail = card
    ? `${card.name} ${maskedCardNumber(card)}`
    : cardId && !loading && !error
      ? "Card removed"
      : null;

  return <span className={`payment ${inline ? "payment-inline" : ""}`}>
    <FontAwesomeIcon icon={card ? CARD_TYPE_ICONS[card.type] : paymentIcon(mode)} className="payment-icon" aria-hidden="true" />
    <span className="payment-text">
      <span className="payment-label">{card ? `${mode === "online" ? "Online · " : ""}${CARD_TYPE_LABELS[card.type]} card` : paymentMethodLabel(mode)}</span>
      {detail && <span className="payment-detail">{detail}</span>}
    </span>
  </span>;
}
