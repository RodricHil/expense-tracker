"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import NotificationProvider from "./NotificationProvider";
import CurrencyProvider from "../CurrencyProvider";
import AddExpenseProvider from "../AddExpenseProvider";
import ExpenseOptionsProvider from "../ExpenseOptionsProvider";
import CardsProvider from "../CardsProvider";
import type { SavedCard } from "@/lib/payment";

export default function Providers({
  children,
  session,
  initialCurrency = null,
  initialCards = null,
}: {
  children: React.ReactNode;
  /** `undefined` means "not resolved on the server"; the client resolves it. */
  session?: Session | null;
  initialCurrency?: string | null;
  initialCards?: SavedCard[] | null;
}) {
  return (
    <SessionProvider session={session}>
      <NotificationProvider>
        <CurrencyProvider initialCurrency={initialCurrency}>
          <CardsProvider initialCards={initialCards}><ExpenseOptionsProvider><AddExpenseProvider>{children}</AddExpenseProvider></ExpenseOptionsProvider></CardsProvider>
        </CurrencyProvider>
      </NotificationProvider>
    </SessionProvider>
  );
}
