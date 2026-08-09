"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useCurrency } from "@/app/components/CurrencyProvider";
import { useNotification } from "@/app/components/elements/NotificationProvider";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faPlus,
  faRightFromBracket,
  faRightToBracket,
  faGauge,
  faChartLine,
  faChevronDown,
} from "@fortawesome/free-solid-svg-icons";
import Image from "next/image";
import ConfirmationModal from "./ConfirmationModal";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: faGauge },
  { href: "/analytics", label: "Analytics", icon: faChartLine },
  { href: "/add-expenses", label: "Add Expense", icon: faPlus },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { data: session } = useSession();
  const { currency, options: currencyOptions, setCurrency, loading: currencyLoading } = useCurrency();
  const { showNotification } = useNotification();
  const pathname = usePathname() || "/";

  const handleCurrencyChange = async (nextCurrency: string) => {
    await setCurrency(nextCurrency);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    showNotification("Logged out successfully", "success");
    await signOut({ callbackUrl: "/" });
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 shadow-sm">
      <nav className="backdrop-blur-xl bg-white/92 dark:bg-slate-950/92 border-b border-slate-200/80 dark:border-slate-800">
        <div className="mx-auto flex  items-center justify-between py-3 px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-sky-600 to-violet-600 text-lg font-black text-white shadow-lg shadow-sky-500/20">
                ET
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Expense Tracker</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Secure spending analytics</p>
              </div>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  `inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition ` +
                  (isActive(item.href)
                    ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10"
                    : "text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white")
                }
              >
                <FontAwesomeIcon icon={item.icon} className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
              <label htmlFor="currency-select" className="sr-only">
                Currency
              </label>
              <select
                id="currency-select"
                value={currency}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                disabled={!session || currencyLoading}
                className="bg-transparent text-sm outline-none"
              >
                {currencyOptions.map((option) => (
                  <option key={option.symbol} value={option.symbol}>
                    {option.symbol} {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {session ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
                >
                  {session.user?.image ? (
                    <Image
                      src={session.user.image}
                      alt={session.user.name || "User"}
                      width={28}
                      height={28}
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-white">
                      {session.user?.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                  )}
                  <span className="hidden sm:inline">{session.user?.name?.split(" ")[0]}</span>
                  <FontAwesomeIcon icon={faChevronDown} className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-950">
                    <div className="p-4 border-b border-slate-200/70 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        {session.user?.image ? (
                          <Image
                            src={session.user.image}
                            alt={session.user.name || "User"}
                            width={40}
                            height={40}
                            className="h-10 w-10 rounded-2xl object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-800 text-base font-semibold text-white">
                            {session.user?.name?.charAt(0).toUpperCase() || "U"}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{session.user?.name}</p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{session.user?.email}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowLogoutConfirm(true);
                          setProfileOpen(false);
                        }}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-400 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-900/80 dark:text-rose-200 dark:hover:bg-rose-800"
                      >
                        <FontAwesomeIcon icon={faRightFromBracket} className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800"
              >
                <FontAwesomeIcon icon={faRightToBracket} className="w-4 h-4" />
                Login
              </Link>
            )}

            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900 md:hidden"
              onClick={() => setOpen((value) => !value)}
              aria-label="Toggle menu"
            >
              <FontAwesomeIcon icon={faBars} className="w-5 h-5" />
            </button>
          </div>
        </div>

        {open && (
          <div className="border-t border-slate-200/80 bg-white/95 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/95 md:hidden">
            <div className="space-y-2">
              {navLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ` +
                    (isActive(item.href)
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900")
                  }
                >
                  <FontAwesomeIcon icon={item.icon} className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
              <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <label htmlFor="mobile-currency-select" className="block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400 mb-3">
                  Currency
                </label>
                <div className="relative">
                  <select
                    id="mobile-currency-select"
                    value={currency}
                    onChange={(e) => handleCurrencyChange(e.target.value)}
                    disabled={!session || currencyLoading}
                    className="w-full appearance-none rounded-2xl border border-slate-300 bg-white px-4 py-3 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  >
                    {currencyOptions.map((option) => (
                      <option key={option.symbol} value={option.symbol}>
                        {option.symbol} {option.label}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-3 top-1/2 flex -translate-y-1/2 items-center text-slate-500 dark:text-slate-400">
                    <FontAwesomeIcon icon={faChevronDown} className="w-4 h-4" />
                  </div>
                </div>
              </div>
              {!session && (
                <Link
                  href="/login"
                  className="block rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>
      {showLogoutConfirm && (
        <ConfirmationModal
          title="Logout?"
          message="Are you sure you want to logout from your account?"
          confirmText="Yes"
          cancelText="No"
          isLoading={isLoggingOut}
          isDangerous={true}
          onConfirm={handleLogout}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}
    </header>
  );
}
