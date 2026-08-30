import { Metadata } from "next";
import HomeRedirect from "./HomeRedirect";

export const metadata: Metadata = {
  title: "Home | Expense Tracker",
  description:
    "Manage and track your daily expenses with detailed analytics and reports",
  alternates: {
    canonical: "https://finex-tracker.vercel.app",
  },
  keywords: [
    "expense tracker",
    "budget management",
    "financial tracking",
    "expense analytics",
  ],
  openGraph: {
    title: "Expense Tracker - Manage Your Finances",
    description: "Track your expenses with analytics dashboard",
    url: "https://finex-tracker.vercel.app",
    type: "website",
  },
};

export default function Page() {
  return <HomeRedirect />;
}