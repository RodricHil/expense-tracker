import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Card from "@/models/Card";
import Expense from "@/models/Expense";
import {
  cardOwnerFilter,
  countCardsOfType,
  isOverCardLimit,
  listCards,
  serializeCard,
} from "@/lib/cards";
import { ownerFilter } from "@/lib/expenses";
import { CARD_LIMIT_PER_TYPE, cardLimitMessage } from "@/lib/payment";
import {
  cardCreateSchema,
  cardDeleteSchema,
  cardUpdateSchema,
  handleRouteError,
  notFound,
  parseJsonBody,
  unauthorized,
} from "@/lib/validation";

/**
 * Saved cards: list, create, update, delete.
 *
 * Mirrors `/api/expenses`: every verb authenticates first and scopes the query
 * by owner INSIDE the filter. Card data is limited to type, nickname and last
 * four digits by `cardCreateSchema`; nothing else is ever written.
 *
 * The 26-per-type limit is checked before the write AND re-counted after it.
 * Two concurrent creates can both pass the first check; the second check
 * catches that and rolls the extra card back, so the limit holds without a
 * transaction.
 */

const limitReached = (type: "debit" | "credit") =>
  Response.json(
    { error: cardLimitMessage(type), code: "CARD_LIMIT_REACHED", limit: CARD_LIMIT_PER_TYPE },
    { status: 409 }
  );

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return unauthorized();

    return Response.json({ cards: await listCards(session) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return unauthorized();

    const { type, name, last4, network } = cardCreateSchema.parse(await parseJsonBody(req));

    await connectDB();

    if ((await countCardsOfType(session, type)) >= CARD_LIMIT_PER_TYPE) {
      return limitReached(type);
    }

    const card = await Card.create({ ...cardOwnerFilter(session), type, name, last4, ...(network !== undefined ? { network } : {}) });

    if (isOverCardLimit(await countCardsOfType(session, type))) {
      await Card.deleteOne({ _id: card._id, ...cardOwnerFilter(session) });
      return limitReached(type);
    }

    return Response.json({ card: serializeCard(card) }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return unauthorized();

    const { id, type, name, last4, network } = cardUpdateSchema.parse(await parseJsonBody(req));

    await connectDB();

    const existing = await Card.findOne({ _id: id, ...cardOwnerFilter(session) }).lean<{ type: "debit" | "credit" }>();
    if (!existing) return notFound();

    // Changing a card's type moves it into the other type's quota.
    const changingType = existing.type !== type;
    if (changingType && (await countCardsOfType(session, type, id)) >= CARD_LIMIT_PER_TYPE) {
      return limitReached(type);
    }

    const updated = await Card.findOneAndUpdate(
      { _id: id, ...cardOwnerFilter(session) },
      { type, name, last4, ...(network !== undefined ? { network } : {}) },
      { new: true }
    );
    if (!updated) return notFound();

    if (changingType && isOverCardLimit(await countCardsOfType(session, type))) {
      await Card.updateOne({ _id: id, ...cardOwnerFilter(session) }, { type: existing.type });
      return limitReached(type);
    }

    return Response.json({ card: serializeCard(updated) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return unauthorized();

    const { id } = cardDeleteSchema.parse(await parseJsonBody(req));

    await connectDB();

    const card = await Card.findOneAndDelete({ _id: id, ...cardOwnerFilter(session) });
    if (!card) return notFound();

    // Past card payments stay card payments; they just stop pointing at a card
    // that no longer exists. Scoped to the caller's own expenses.
    await Expense.updateMany({ ...ownerFilter(session), cardId: id }, { $set: { cardId: null } });

    return Response.json({ message: "Deleted successfully" });
  } catch (error) {
    return handleRouteError(error);
  }
}
