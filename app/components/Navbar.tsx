"use client";

import { useAddExpense } from "@/app/components/AddExpenseProvider";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useCurrency } from "@/app/components/CurrencyProvider";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRightFromBracket, faBars, faChartColumn, faChevronDown, faGear, faPlus, faReceipt, faRightToBracket, faXmark } from "@fortawesome/free-solid-svg-icons";
import ConfirmationModal from "./ConfirmationModal";
import CustomSelect from "./CustomSelect";
import ThemeControl from "./ThemeControl";
import Brand from "./Brand";
import Avatar from "./Avatar";
import Skeleton from "./Skeleton";

const navLinks = [
  { href: "/dashboard", label: "Expenses", icon: faReceipt },
  { href: "/analytics", label: "Analytics", icon: faChartColumn },
  { href: "/settings", label: "Settings", icon: faGear },
];

export default function Navbar() {
  const { openAddExpense } = useAddExpense();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { data: session, status } = useSession();
  const { currency, options, setCurrency, loading: currencyLoading } = useCurrency();
  const pathname = usePathname();
  const header = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const profile = useRef<HTMLDivElement>(null);
  const profileButton = useRef<HTMLButtonElement>(null);
  const user = session?.user;
  const firstName = user?.name?.split(" ")[0] || "Account";

  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (!profile.current?.contains(event.target as Node)) setProfileOpen(false);
      if (!header.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
        setOpen(false);
        if (profileOpen) profileButton.current?.focus();
        else if (open) menuButton.current?.focus();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [profileOpen, open]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try { await signOut({ callbackUrl: "/login" }); }
    finally { setIsLoggingOut(false); }
  };

  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  /** Hidden while the saved preference loads, so ₹ never flashes before $. */
  const currencySelect = (id: string, width?: number) => currencyLoading
    ? <Skeleton width={width ?? "100%"} height={46} />
    : <CustomSelect id={id} label="Display currency" value={currency} onChange={(value) => void setCurrency(value)} disabled={!session} options={options.map((option) => ({ value: option.symbol, label: `${option.symbol} ${option.label}` }))} />;

  /**
   * Three explicit states. "loading" renders a placeholder the same size as
   * the signed-in control, so nothing jumps when the session resolves and
   * "Sign in" is never shown to somebody who is signed in.
   */
  let account: React.ReactNode;
  if (status === "loading") {
    account = <span className="account-button" aria-hidden="true" style={{ borderColor: "var(--border)" }}>
      <Skeleton width={32} height={32} />
      <Skeleton width={56} className="skeleton-text hidden sm:block" />
      <FontAwesomeIcon icon={faChevronDown} className="chevron hidden sm:block" />
    </span>;
  } else if (status === "authenticated" && user) {
    account = <div ref={profile} className="relative" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setProfileOpen(false); }}>
      <button ref={profileButton} type="button" className="account-button" aria-label={`Account menu for ${user.name ?? user.email ?? "you"}`} aria-expanded={profileOpen} aria-controls="account-panel" onClick={() => setProfileOpen(!profileOpen)}>
        <Avatar src={user.image} name={user.name} email={user.email} />
        <span className="account-name hidden sm:inline">{firstName}</span>
        <FontAwesomeIcon icon={faChevronDown} className="chevron hidden sm:block" />
      </button>
      {profileOpen && <div id="account-panel" className="profile-menu">
        <div className="profile-summary">
          <Avatar src={user.image} name={user.name} email={user.email} size={40} />
          <div className="min-w-0">
            <p className="font-semibold truncate">{user.name}</p>
            <p className="muted text-xs truncate">{user.email}</p>
          </div>
        </div>

        <div className="lg:hidden field px-2 py-3"><span>Display currency</span>{currencySelect("tablet-currency-select")}</div>
        <button type="button" className="menu-item" onClick={() => { setProfileOpen(false); setShowLogoutConfirm(true); }}><FontAwesomeIcon icon={faArrowRightFromBracket} />Sign out</button>
      </div>}
    </div>;
  } else {
    account = <Link className="btn btn-primary" href="/login"><FontAwesomeIcon icon={faRightToBracket} />Sign in</Link>;
  }

  return (
    <header ref={header} className="app-header">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <div className="nav-inner">
        <Link href="/dashboard" aria-label="Finex home" className="shrink-0"><Brand /></Link>
        <nav aria-label="Main navigation" className="hidden md:flex items-center gap-1 mr-auto ml-4 lg:ml-8">
          {navLinks.map((item) => <Link key={item.href} href={item.href} className="nav-link" aria-current={isCurrent(item.href) ? "page" : undefined}><FontAwesomeIcon icon={item.icon} aria-hidden="true" />{item.label}</Link>)}
        </nav>
        <div className="header-actions">
          <ThemeControl />
          {status !== "unauthenticated" && <div className="hidden lg:block" style={{ width: 132 }}>{currencySelect("currency-select", 132)}</div>}
          <div className="hidden md:block">{account}</div>
          <button ref={menuButton} type="button" className="btn btn-icon md:hidden" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => { setProfileOpen(false); setOpen(!open); }}>
            <FontAwesomeIcon icon={open ? faXmark : faBars} className="w-4 h-4" />
          </button>
        </div>
      </div>
      {open && <nav id="mobile-navigation" aria-label="Mobile navigation" className="mobile-nav md:hidden">
        {navLinks.map((item) => <Link key={item.href} href={item.href} className="nav-link" aria-current={isCurrent(item.href) ? "page" : undefined} onClick={() => setOpen(false)}><FontAwesomeIcon icon={item.icon} aria-hidden="true" />{item.label}</Link>)}
        <button type="button" className="btn btn-primary" onClick={() => { setOpen(false); openAddExpense(); }}><FontAwesomeIcon icon={faPlus} />Add expense</button>
        {status === "authenticated" && <div className="mobile-account-row">
          <label className="field"><span>Display currency</span><select className="input" value={currency} disabled={currencyLoading} onChange={(event) => void setCurrency(event.target.value)}>{options.map((option) => <option key={option.symbol} value={option.symbol}>{option.symbol} {option.label}</option>)}</select></label>
          <button type="button" className="btn btn-ghost" onClick={() => { setOpen(false); setShowLogoutConfirm(true); }}><FontAwesomeIcon icon={faArrowRightFromBracket} />Sign out</button>
        </div>}
        {status === "unauthenticated" && <Link href="/login" className="btn" onClick={() => setOpen(false)}>Sign in</Link>}
      </nav>}
      {showLogoutConfirm && <ConfirmationModal title="Sign out?" message="You can sign back in with Google anytime." confirmText="Sign out" cancelText="Cancel" isLoading={isLoggingOut} onConfirm={handleLogout} onCancel={() => setShowLogoutConfirm(false)} />}
    </header>
  );
}
