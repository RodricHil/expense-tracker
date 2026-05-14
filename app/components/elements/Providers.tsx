"use client";

import { SessionProvider } from "next-auth/react";
import NotificationProvider from "./NotificationProvider";
import CurrencyProvider from "../CurrencyProvider";

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <NotificationProvider>
        <CurrencyProvider>{children}</CurrencyProvider>
      </NotificationProvider>
    </SessionProvider>
  );
}
