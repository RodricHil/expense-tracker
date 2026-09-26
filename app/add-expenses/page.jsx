import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import AddExpense from "./addexpense";

export const metadata = {
  title: "Add Expense | Finex",
  description: "Add a new expense to your tracker and categorize it for better financial management",
  alternates: {
    canonical: "https://finex-tracker.vercel.app/add-expenses",
  },
  keywords: ["add expense", "track spending", "expense entry", "budget tracking"],
  openGraph: {
    title: "Add New Expense | Finex",
    description: "Add a new expense to your tracker and categorize it for better financial management",
    url: "https://finex-tracker.vercel.app/add-expenses",
    type: "website",
  },
};

export default async function AddExpensePage() {
    // Defence in depth (ET-H2): authorization must not depend on middleware alone.
    const session = await getServerSession(authOptions);
    if (!session) {
        redirect("/login");
    }

    return (
        <AddExpense />
    );
}
