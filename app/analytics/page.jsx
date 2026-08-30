import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { defaultDateRange, loadExpensePage } from "@/lib/expenses";
import { logError } from "@/lib/logger";
import AnalyticsClientPage from "./analytics";

export const metadata = {
  title: "Analytics | Expense Tracker",
  description: "View detailed analytics and insights about your spending patterns and financial trends",
  alternates: {
    canonical: "https://expense-tracker-eight-rho-59.vercel.app/analytics",
  },
  keywords: ["expense analytics", "spending insights", "financial reports", "budget analysis"],
  openGraph: {
    title: "Analytics & Insights | Expense Tracker",
    description: "View detailed analytics and insights about your spending patterns and financial trends",
    url: "https://expense-tracker-eight-rho-59.vercel.app/analytics",
    type: "website",
  },
};

/** Per-user data: never cached, never prerendered. See app/dashboard/page.jsx. */
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
    // Defence in depth (ET-H2): authorization must not depend on middleware alone.
    const session = await getServerSession(authOptions);
    if (!session) {
        redirect("/login");
    }

    /**
     * §G.3 — the charts' data is aggregated by MongoDB during this render.
     *
     * This page renders no expense ROWS at all, only aggregates, so it asks for
     * the smallest legal page (limit 1) and uses only the `summary`. That is the
     * §G.4 payoff: what used to be "download the account's entire history, then
     * aggregate it in the browser" is now a fixed-size result computed in the
     * database. Fails soft exactly like the dashboard.
     */
    const initialRange = defaultDateRange();
    let initialSummary = null;

    try {
        const data = await loadExpensePage(session, {
            page: 1,
            limit: 1,
            from: new Date(initialRange.startDate),
            to: new Date(initialRange.endDate),
        });
        initialSummary = data.summary;
    } catch (error) {
        logError("analytics.initial_load_failed", error);
    }

    return (
        <AnalyticsClientPage
            initialRange={initialRange}
            initialSummary={initialSummary}
        />
    );
}
