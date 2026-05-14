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

export default function AnalyticsPage() {
    return (
        <AnalyticsClientPage />
    );
}