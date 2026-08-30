import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { defaultDateRange, loadExpensePage } from "@/lib/expenses";
import { logError } from "@/lib/logger";
import { DEFAULT_PAGE_SIZE } from "@/lib/validation";
import ExpensesPage from "./dashboardclient";

export const metadata = {
  title: "Dashboard | Expense Tracker",
  description: "View and manage all your expenses with filtering, sorting, and detailed breakdowns",
  alternates: {
    canonical: "https://expense-tracker-eight-rho-59.vercel.app/dashboard",
  },
  keywords: ["dashboard", "expense management", "spending overview", "financial dashboard"],
  openGraph: {
    title: "Expense Dashboard | Expense Tracker",
    description: "View and manage all your expenses with filtering, sorting, and detailed breakdowns",
    url: "https://expense-tracker-eight-rho-59.vercel.app/dashboard",
    type: "website",
  },
};

/**
 * Per-user data, never cached or prerendered.
 *
 * `getServerSession` already forces this route dynamic; stating it is explicit
 * insurance, because a cached render of this page would serve one user's
 * expenses to another. §G.3 asked for `revalidate` caching — that is
 * deliberately NOT applied here for exactly this reason. The performance win
 * comes from removing the client fetch round trip, not from sharing a cache.
 */
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
    // Defence in depth (ET-H2): authorization must not depend on middleware alone.
    const session = await getServerSession(authOptions);
    if (!session) {
        redirect("/login");
    }

    /**
     * §G.3 — read MongoDB here instead of shipping a spinner.
     *
     * The dashboard used to render empty, hydrate, then `fetch("/api/expenses")`
     * from an effect: a full extra network round trip after first paint before
     * the user saw a single number. The first page of data is now read directly
     * on the server and handed to the client component as its initial state.
     *
     * FAIL SOFT, NOT FAIL CLOSED. If the database is unreachable this page still
     * renders — `initialData` is null and the client falls back to its own
     * fetch, which is exactly the old behaviour. A dashboard that 500s because a
     * read timed out would be strictly worse than one that loads a moment later.
     */
    const initialRange = defaultDateRange();
    let initialData = null;

    try {
        initialData = await loadExpensePage(session, {
            page: 1,
            limit: DEFAULT_PAGE_SIZE,
            from: new Date(initialRange.startDate),
            to: new Date(initialRange.endDate),
        });
    } catch (error) {
        // ET-M2: the logger records the error name/stack server-side only, never
        // the session, the email or the connection string.
        logError("dashboard.initial_load_failed", error);
    }

    return (
        <ExpensesPage initialRange={initialRange} initialData={initialData} />
    );
}
