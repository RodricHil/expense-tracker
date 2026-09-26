import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import Providers from "@/app/components/elements/Providers";

const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Finex | Expense tracker",
  description: "Track your expenses with analytics dashboard",
    alternates: {
    canonical: "https://finex-tracker.vercel.app",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
        <Providers>

          {children}
        </Providers>
      </body>
    </html>
  );
}
