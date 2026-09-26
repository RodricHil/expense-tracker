"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import type { SavedCard } from "@/lib/payment";

type CardsContextType = {
  cards: SavedCard[];
  /** True until the signed-in user's cards are known. */
  loading: boolean;
  error: boolean;
  cardById: (id: string | null | undefined) => SavedCard | undefined;
  /** Insert or replace a card after a successful API write. */
  upsertCard: (card: SavedCard) => void;
  removeCard: (id: string) => void;
  reload: () => void;
};

const CardsContext = createContext<CardsContextType | undefined>(undefined);

export function useCards() {
  const context = useContext(CardsContext);
  if (!context) throw new Error("useCards must be used within CardsProvider");
  return context;
}

type State = { cards: SavedCard[]; loadedFor: string | null; error: boolean };

/**
 * The user's saved cards, shared by Settings (which edits them), the expense
 * form (which picks one) and every transaction list (which labels card
 * payments). Seeded by the root layout; fetched once per user otherwise.
 */
export default function CardsProvider({ children, initialCards = null }: { children: React.ReactNode; initialCards?: SavedCard[] | null }) {
  const { data: session, status } = useSession();
  const email = session?.user?.email ?? null;
  const [state, setState] = useState<State>({
    cards: initialCards ?? [],
    loadedFor: initialCards ? email : null,
    error: false,
  });

  useEffect(() => {
    if (status !== "authenticated" || !email || state.loadedFor === email) return;
    let active = true;
    async function load() {
      try {
        const res = await fetch("/api/cards");
        if (!res.ok) throw new Error("Unable to load cards");
        const data = (await res.json()) as { cards: SavedCard[] };
        if (active) setState({ cards: data.cards, loadedFor: email, error: false });
      } catch {
        if (active) setState((current) => ({ ...current, loadedFor: email, error: true }));
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [status, email, state.loadedFor]);

  const upsertCard = useCallback((card: SavedCard) => {
    setState((current) => {
      const exists = current.cards.some((item) => item.id === card.id);
      return { ...current, cards: exists ? current.cards.map((item) => (item.id === card.id ? card : item)) : [...current.cards, card] };
    });
  }, []);
  const removeCard = useCallback((id: string) => {
    setState((current) => ({ ...current, cards: current.cards.filter((card) => card.id !== id) }));
  }, []);
  const reload = useCallback(() => setState((current) => ({ ...current, loadedFor: null, error: false })), []);

  const value = useMemo<CardsContextType>(() => {
    const byId = new Map(state.cards.map((card) => [card.id, card]));
    return {
      cards: state.cards,
      loading: status === "loading" || (status === "authenticated" && state.loadedFor !== email),
      error: state.error,
      cardById: (id) => (id ? byId.get(id) : undefined),
      upsertCard,
      removeCard,
      reload,
    };
  }, [state, status, email, upsertCard, removeCard, reload]);

  return <CardsContext.Provider value={value}>{children}</CardsContext.Provider>;
}
