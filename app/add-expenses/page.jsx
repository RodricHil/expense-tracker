import AddExpense from "./addexpense";

export const metadata = {
  title: "Add Expense | Expense Tracker",
  description: "Add a new expense to your tracker and categorize it for better financial management",
  alternates: {
    canonical: "https://expense-tracker-eight-rho-59.vercel.app/add-expenses",
  },
  keywords: ["add expense", "track spending", "expense entry", "budget tracking"],
  openGraph: {
    title: "Add New Expense | Expense Tracker",
    description: "Add a new expense to your tracker and categorize it for better financial management",
    url: "https://expense-tracker-eight-rho-59.vercel.app/add-expenses",
    type: "website",
  },
};

export default function AddExpensePage() {
    return (
        <AddExpense />
    );
}