"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import AddExpenseModal from "./AddExpenseModal";

const AddExpenseContext = createContext<{ openAddExpense: () => void; expenseRevision: number } | null>(null);

export function useAddExpense() {
  const context = useContext(AddExpenseContext);
  if (!context) throw new Error("useAddExpense requires AddExpenseProvider");
  return context;
}

export default function AddExpenseProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [openOnPath, setOpenOnPath] = useState<string | null>(null);
  // Clear the dialog when navigation leaves its page, including browser history.
  useEffect(() => () => setOpenOnPath(null), [pathname]);
  const [expenseRevision, setExpenseRevision] = useState(0);
  return <AddExpenseContext.Provider value={{ openAddExpense: () => setOpenOnPath(pathname), expenseRevision }}>
    {children}
    {openOnPath === pathname && <AddExpenseModal onClose={() => setOpenOnPath(null)} onSaved={() => setExpenseRevision((value) => value + 1)} />}
  </AddExpenseContext.Provider>;
}
