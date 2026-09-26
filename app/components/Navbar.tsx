"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useCurrency } from "@/app/components/CurrencyProvider";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faXmark, faChevronDown, faUser } from "@fortawesome/free-solid-svg-icons";
import ConfirmationModal from "./ConfirmationModal";
import CustomSelect from "./CustomSelect";
import ThemeControl from "./ThemeControl";
import Brand from "./Brand";

const navLinks = [
  { href: "/dashboard", label: "Expenses" },
  { href: "/analytics", label: "Analytics" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { data: session } = useSession();
  const { currency, options, setCurrency, loading } = useCurrency();
  const pathname = usePathname();
  const profile = useRef<HTMLDivElement>(null);
  const profileButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (!profile.current?.contains(event.target as Node)) setProfileOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
        setOpen(false);
        if (profileOpen) profileButton.current?.focus();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [profileOpen]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try { await signOut({ callbackUrl: "/login" }); }
    finally { setIsLoggingOut(false); }
  };

  const currencySelect = (id: string) => (
    <CustomSelect id={id} label="Display currency" value={currency} onChange={(value) => void setCurrency(value)} disabled={!session || loading} options={options.map((option) => ({ value: option.symbol, label: `${option.symbol} ${option.label}` }))} />
  );

  return (
    <header className="app-header">
      <div className="nav-inner">
        <Link href="/dashboard" aria-label="Finex home"><Brand /></Link>
        <nav aria-label="Main navigation" className="hidden md:flex items-center gap-2 mr-auto ml-8">
          {navLinks.map((item) => <Link key={item.href} href={item.href} className="nav-link" aria-current={pathname === item.href ? "page" : undefined}>{item.label}</Link>)}
        </nav>
        <div className="flex items-center gap-3">
          <ThemeControl />
          <div className="hidden md:block">{currencySelect("currency-select")}</div>
          {session ? (
            <div ref={profile} className="relative">
              <button ref={profileButton} type="button" className="btn" aria-label="Account" aria-expanded={profileOpen} aria-controls="account-panel" onClick={() => setProfileOpen(!profileOpen)}>
                <span className="hidden sm:inline">{session.user?.name?.split(" ")[0] || "Account"}</span><FontAwesomeIcon icon={faUser} className="w-4 h-4 sm:hidden" />
                <FontAwesomeIcon icon={faChevronDown} className="w-3 h-3 hidden sm:block" />
              </button>
              {profileOpen && <div id="account-panel" className="profile-menu">
                <p className="font-medium truncate">{session.user?.name}</p>
                <p className="muted text-xs truncate mt-1">{session.user?.email}</p>
                <button type="button" className="btn w-full mt-4" onClick={() => { setProfileOpen(false); setShowLogoutConfirm(true); }}>Sign out</button>
              </div>}
            </div>
          ) : <Link className="btn btn-primary" href="/login">Sign in</Link>}
          <button type="button" className="btn btn-icon md:hidden" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)}>
            <FontAwesomeIcon icon={open ? faXmark : faBars} className="w-4 h-4" />
          </button>
        </div>
      </div>
      {open && <nav id="mobile-navigation" aria-label="Mobile navigation" className="md:hidden border-t border-stone-800 p-4 grid gap-3">
        {navLinks.map((item) => <Link key={item.href} href={item.href} className="nav-link" aria-current={pathname === item.href ? "page" : undefined} onClick={() => setOpen(false)}>{item.label}</Link>)}
        <Link href="/add-expenses" className="btn btn-primary" onClick={() => setOpen(false)}>Add expense</Link>
        {currencySelect("mobile-currency-select")}
      </nav>}
      {showLogoutConfirm && <ConfirmationModal title="Sign out?" message="You can sign back in with Google anytime." confirmText="Sign out" cancelText="Cancel" isLoading={isLoggingOut} onConfirm={handleLogout} onCancel={() => setShowLogoutConfirm(false)} />}
    </header>
  );
}
