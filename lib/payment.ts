/**
 * Payment methods and saved-card rules shared by the models, the zod trust
 * boundary and the UI. Kept free of server-only imports so client components
 * can use the same labels and limits the API enforces.
 */

export const PAYMENT_METHODS = ["online", "card", "cash"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  online: "Online",
  card: "Card",
  cash: "Cash",
};

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === "string" && (PAYMENT_METHODS as readonly string[]).includes(value);
}

/** Human label for a stored mode; unknown legacy values are shown as-is. */
export function paymentMethodLabel(mode: string): string {
  return isPaymentMethod(mode) ? PAYMENT_METHOD_LABELS[mode] : mode;
}

export const CARD_TYPES = ["debit", "credit"] as const;
export type CardType = (typeof CARD_TYPES)[number];

export const CARD_TYPE_LABELS: Record<CardType, string> = {
  debit: "Debit",
  credit: "Credit",
};

/** Per type, per user. Enforced by the API; mirrored in the UI. */
export const CARD_LIMIT_PER_TYPE = 26;
export const CARD_NAME_MAX_LENGTH = 40;

/**
 * The only card data the app stores: a nickname, the type and the last four
 * digits. Never the full number, CVV, PIN, OTP or expiry.
 */
export type SavedCard = {
  id: string;
  type: CardType;
  name: string;
  last4: string;
};

export function maskedCardNumber(card: Pick<SavedCard, "last4">): string {
  return `•••• ${card.last4}`;
}

/** "HDFC Credit •••• 4582" — used in selectors and transaction rows. */
export function cardLabel(card: Pick<SavedCard, "name" | "last4">): string {
  return `${card.name} ${maskedCardNumber(card)}`;
}

export function cardLimitMessage(type: CardType): string {
  const label = CARD_TYPE_LABELS[type].toLowerCase();
  return `You can save up to ${CARD_LIMIT_PER_TYPE} ${label} cards. Delete one to add another.`;
}
