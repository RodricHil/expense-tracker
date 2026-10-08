"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
export type PersonalOption = { _id: string; kind: "category" | "upiApp"; name: string; archived?: boolean; legacyType?: string };
type OptionsContext = {
  options: PersonalOption[]; error: string; loading: boolean; reload: () => void;
  add: (kind: PersonalOption["kind"], name: string) => Promise<PersonalOption>;
  rename: (id: string, name: string) => Promise<PersonalOption>;
  remove: (id: string) => Promise<PersonalOption>;
};
const Context = createContext<OptionsContext | null>(null);
export function useExpenseOptions() {
  const context = useContext(Context);
  if (!context) throw new Error("ExpenseOptionsProvider is required");
  return context;
}
export default function ExpenseOptionsProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const user = session?.user?.id ?? session?.user?.email ?? null;
  const [state, setState] = useState<{ user: string | null; options: PersonalOption[]; error: string }>({ user: null, options: [], error: "" });
  const [reloadToken, setReloadToken] = useState(0);
  const revision = useRef(0);
  useEffect(() => {
    if (!user) return;
    let active = true;
    const version = revision.current;
    fetch("/api/expense-options/import", { method: "POST" }).then((res) => { if (!res.ok) throw new Error(); return fetch("/api/expense-options"); }).then(async (res) => { if (!res.ok) throw new Error(); return res.json(); }).then((data) => { if (active && version === revision.current) setState({ user, options: data.options, error: "" }); }).catch(() => { if (active && version === revision.current) setState({ user, options: [], error: "Couldn’t load your saved options." }); });
    return () => { active = false; };
  }, [user, reloadToken]);
  async function mutate(method: string, body: Record<string, string>) {
    const res = await fetch("/api/expense-options", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json() as { option?: PersonalOption; error?: string };
    if (!res.ok || !data.option) throw new Error(data.error === "Invalid request body" ? "Enter a category name of up to 60 characters." : data.error || "Couldn’t save this option. Try again.");
    const option = data.option;
    revision.current++;
    setState((previous) => ({ user, error: "", options: [...(previous.user === user ? previous.options : []).filter((o) => o._id !== option._id), option] }));
    return option;
  }
  return <Context.Provider value={{
    options: state.user === user ? state.options : [], error: state.user === user ? state.error : "",
    loading: status === "loading" || (Boolean(user) && state.user !== user), reload: () => setReloadToken((token) => token + 1),
    add: (kind, name) => mutate("POST", { kind, name }), rename: (id, name) => mutate("PUT", { id, name, kind: state.options.find((o) => o._id === id)?.kind ?? "category" }), remove: (id) => mutate("DELETE", { id, kind: state.options.find((o) => o._id === id)?.kind ?? "category" }),
  }}>{children}</Context.Provider>;
}
