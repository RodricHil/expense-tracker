import type { Session } from "next-auth";
import { connectDB } from "@/lib/mongodb";
import { ownerId } from "@/lib/expenses";
import { CARD_LIMIT_PER_TYPE, type CardType, type SavedCard } from "@/lib/payment";
import Card from "@/models/Card";

/**
 * Saved-card data access, shared by `/api/cards`, the expense routes (which
 * check a submitted `cardId` belongs to the caller) and the root layout (which
 * seeds the client so card labels render on first paint).
 *
 * Cards are a new collection, so unlike expenses there is no legacy
 * email-keyed data: ownership is always the stable `ownerId(session)`, and it
 * is always part of the query filter, never checked after a fetch.
 */

type LeanCard = {
  _id: { toString(): string };
  type: CardType;
  name: string;
  last4: string;
};

/** The only fields that ever leave the server. */
export function serializeCard(card: LeanCard): SavedCard {
  return {
    id: card._id.toString(),
    type: card.type,
    name: card.name,
    last4: card.last4,
  };
}

export function cardOwnerFilter(session: Session): { userId: string } {
  return { userId: ownerId(session) };
}

export async function listCards(session: Session): Promise<SavedCard[]> {
  await connectDB();
  const cards = (await Card.find(cardOwnerFilter(session))
    .sort({ type: 1, createdAt: 1 })
    .lean()) as LeanCard[];
  return cards.map(serializeCard);
}

export async function countCardsOfType(
  session: Session,
  type: CardType,
  excludeId?: string
): Promise<number> {
  return Card.countDocuments({
    ...cardOwnerFilter(session),
    type,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  });
}

export function isOverCardLimit(count: number): boolean {
  return count > CARD_LIMIT_PER_TYPE;
}

/** True when `cardId` names a card owned by this session. */
export async function ownsCard(session: Session, cardId: string): Promise<boolean> {
  const found = await Card.exists({ _id: cardId, ...cardOwnerFilter(session) });
  return Boolean(found);
}
