import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { unstable_rethrow } from "next/navigation";
import { getServerSession, type Session } from "next-auth";
import "./globals.css";
import Providers from "@/app/components/elements/Providers";
import { authOptions } from "@/lib/auth";
import { listCards } from "@/lib/cards";
import { logError } from "@/lib/logger";
import { getPreferredCurrency } from "@/lib/preferences";
import type { SavedCard } from "@/lib/payment";

const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Finex | Expense tracker",
  description: "Track your expenses with analytics dashboard",
    alternates: {
    canonical: "https://finex-tracker.vercel.app",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0d0b" },
  ],
};

/**
 * Resolve the session on the server and hand it to `SessionProvider`.
 *
 * Without this every hard load started client-side in `status: "loading"`, and
 * the header briefly rendered "Sign in" for a signed-in user. Seeding the
 * provider means the first paint already knows who is signed in. Any failure
 * (e.g. a missing secret) falls back to the old client-side resolution, which
 * the header covers with a skeleton rather than a wrong state.
 */
async function resolveSession(): Promise<Session | null | undefined> {
  try {
    return await getServerSession(authOptions);
  } catch (error) {
    // Next signals "render this dynamically" by throwing; that must propagate.
    unstable_rethrow(error);
    logError("layout.session_failed", error);
    return undefined;
  }
}

/**
 * The currency and saved cards are seeded for the same reason: so amounts do
 * not render in ₹ and then switch, and card payments do not render as a bare
 * "Card" and then gain a label. Fails soft to a client fetch.
 */
async function resolveUserData(session: Session | null | undefined) {
  if (!session?.user?.email) return { currency: null, cards: null };
  const [currency, cards] = await Promise.allSettled([
    getPreferredCurrency(session.user.email),
    listCards(session),
  ]);
  for (const result of [currency, cards]) if (result.status === "rejected") unstable_rethrow(result.reason);
  if (currency.status === "rejected") logError("layout.currency_failed", currency.reason);
  if (cards.status === "rejected") logError("layout.cards_failed", cards.reason);
  return {
    currency: currency.status === "fulfilled" ? currency.value : null,
    cards: cards.status === "fulfilled" ? cards.value : null,
  } satisfies { currency: string | null; cards: SavedCard[] | null };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await resolveSession();
  const { currency, cards } = await resolveUserData(session);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Blocking local script prevents a flash of the wrong saved theme. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/theme.js" />
      </head>
      <body
        className={`${poppins.variable} antialiased`}
      >
        <Providers session={session} initialCurrency={currency} initialCards={cards}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
