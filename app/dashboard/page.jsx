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

export default function DashboardPage() {
    return (
        <ExpensesPage />
    );
}