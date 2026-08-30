import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
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

export default async function AnalyticsPage() {
    // Defence in depth (ET-H2): authorization must not depend on middleware alone.
    const session = await getServerSession(authOptions);
    if (!session) {
        redirect("/login");
    }

    return (
        <AnalyticsClientPage />
    );
}
