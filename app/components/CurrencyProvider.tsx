"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useNotification } from "@/app/components/elements/NotificationProvider";

export const currencyOptions = [
  { symbol: "₹", label: "INR", name: "Indian Rupee" },
  { symbol: "$", label: "USD", name: "US Dollar" },
  { symbol: "€", label: "EUR", name: "Euro" },
  { symbol: "£", label: "GBP", name: "British Pound" },
  { symbol: "¥", label: "JPY", name: "Japanese Yen" },
  { symbol: "₺", label: "TRY", name: "Turkish Lira" },
];

type CurrencyContextType = {
  currency: string;
  setCurrency: (currency: string) => Promise<void>;
  options: typeof currencyOptions;
  /** True until the signed-in user's saved preference is known. */
  loading: boolean;
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within CurrencyProvider");
  }
  return context;
}

/**
 * `initialCurrency` is read by the root layout on the server. When present the
 * preference is known on first paint and no request is made; otherwise it is
 * fetched once per signed-in user. `loading` is derived from which user the
 * current value belongs to, so it can never report a stale user's currency as
 * settled.
 */
export default function CurrencyProvider({ children, initialCurrency = null }: { children: React.ReactNode; initialCurrency?: string | null }) {
  const { data: session, status } = useSession();
  const email = session?.user?.email ?? null;
  const [state, setState] = useState<{ currency: string; loadedFor: string | null }>({
    currency: initialCurrency ?? "₹",
    loadedFor: initialCurrency ? email : null,
  });
  const { showNotification } = useNotification();

  useEffect(() => {
    if (status !== "authenticated" || !email || state.loadedFor === email) return;
    let active = true;

    async function loadPreferredCurrency() {
      let next: string | null = null;
      try {
        const res = await fetch("/api/user/currency");
        if (!res.ok) throw new Error("Unable to load currency preference");
        const data = await res.json();
        next = typeof data?.currency === "string" ? data.currency : null;
      } catch {
        if (active) showNotification("Couldn’t load your currency preference.", "warning");
      }
      if (active) setState((current) => ({ currency: next ?? current.currency, loadedFor: email }));
    }

    loadPreferredCurrency();
    return () => {
      active = false;
    };
  }, [status, email, state.loadedFor, showNotification]);

  const loading = status === "loading" || (status === "authenticated" && state.loadedFor !== email);

  const setCurrency = async (nextCurrency: string) => {
    if (!email) return;
    if (nextCurrency === state.currency) return;

    const valid = currencyOptions.some((option) => option.symbol === nextCurrency);
    if (!valid) return;

    try {
      const res = await fetch("/api/user/currency", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency: nextCurrency }),
      });

      if (!res.ok) {
        throw new Error("Unable to update currency");
      }

      const data = await res.json();
      setState({ currency: data.currency || nextCurrency, loadedFor: email });
      showNotification("Currency preference saved", "success");
    } catch {
      showNotification("Couldn’t save your currency preference. Try again.", "error");
    }
  };

  return (
    <CurrencyContext.Provider
      value={{ currency: state.currency, options: currencyOptions, setCurrency, loading }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}
