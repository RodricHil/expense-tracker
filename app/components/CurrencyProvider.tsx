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

export default function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [currency, setCurrencyState] = useState("₹");
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();

  useEffect(() => {
    let active = true;

    async function loadPreferredCurrency() {
      if (!session?.user?.email) {
        if (active) {
          setLoading(false);
        }
        return;
      }

      try {
        const res = await fetch("/api/user/currency");

        if (!res.ok) {
          throw new Error("Unable to load currency preference");
        }

        const data = await res.json();
        if (active && data?.currency) {
          setCurrencyState(data.currency);
        }
      } catch {
        if (active) {
          showNotification("Unable to load currency preference", "error");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadPreferredCurrency();

    return () => {
      active = false;
    };
  }, [session?.user?.email, showNotification]);

  const setCurrency = async (nextCurrency: string) => {
    if (!session?.user?.email) return;
    if (nextCurrency === currency) return;

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
      setCurrencyState(data.currency || nextCurrency);
      showNotification("Currency preference saved", "success");
    } catch {
      showNotification("Unable to save currency preference", "error");
    }
  };

  return (
    <CurrencyContext.Provider
      value={{ currency, options: currencyOptions, setCurrency, loading }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}
