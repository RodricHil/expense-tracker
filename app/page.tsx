import { Metadata } from "next";
import { redirect, unstable_rethrow } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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

/**
 * Redirect on the server. The old client-side redirect rendered an
 * "Opening Finex…" page and waited for the session to load in the browser
 * before navigating, which was a visible blank step on every visit.
 */
export default async function Page() {
  let signedIn = false;
  try {
    signedIn = Boolean(await getServerSession(authOptions));
  } catch (error) {
    unstable_rethrow(error);
    // Treat an unreadable session as signed out; /login handles the rest.
  }
  redirect(signedIn ? "/dashboard" : "/login");
}
