"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGoogle } from "@fortawesome/free-brands-svg-icons";
import ThemeControl from "@/app/components/ThemeControl";
import Brand from "@/app/components/Brand";

export default function LoginClient({ hasAuthError = false }: { hasAuthError?: boolean }) {
  const { status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(hasAuthError ? "Sign-in didn’t finish. Please try again." : "");

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError("");
    try {
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch {
      setError("Unable to connect to Google. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <main className="login-shell">
      <header className="login-header"><Brand /><div className="flex items-center gap-5"><span className="muted text-sm hidden sm:inline">Personal Expense Tracker</span><ThemeControl /></div></header>
      <div className="login-content">
        <section className="login-intro" aria-labelledby="login-title">
          <h1 id="login-title">A clearer view of your spending.</h1>
          <p className="muted login-description text-base">Track everyday expenses. Understand the bigger picture.</p>
          <div className="login-preview" aria-label="Example expense overview">
            <div className="preview-heading"><span>Spending overview</span><span className="badge">Example</span></div>
            <div className="preview-total"><span className="muted text-xs">This month</span><p className="money">₹ 12,450.00</p></div>
            <div className="preview-chart" aria-hidden="true">
              {[28, 48, 35, 72, 44, 61, 86, 53, 39, 67, 47, 76].map((height, index) => <span key={index} style={{ height: `${height}%` }} />)}
            </div>
            <div className="preview-axis" aria-hidden="true"><span>01</span><span>15</span><span>30</span></div>
            <div className="preview-row"><span>Groceries <span className="badge">Food</span></span><span className="money">₹ 1,250.00</span></div>
            <div className="preview-row"><span>Train ticket <span className="badge">Travel</span></span><span className="money">₹ 320.00</span></div>
          </div>
        </section>
        <section className="login-form" aria-labelledby="signin-title">
          <div className="login-form-mark" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3h20v26H6zM11 10h10M11 16h10M11 22h6" /></svg></div>
          <h2 id="signin-title">Sign in to Finex</h2>
          <p className="muted">Your expenses, all in one place.</p>
          <button type="button" onClick={handleGoogleSignIn} disabled={isLoading || status !== "unauthenticated"} className="btn btn-primary google-signin">
            <FontAwesomeIcon icon={faGoogle} className="h-4 w-4" />
            <span>{status === "loading" ? "Loading…" : status === "authenticated" ? "Opening dashboard…" : isLoading ? "Connecting…" : "Continue with Google"}</span>
            <svg className="login-button-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6" /></svg>
          </button>
          {error && <p role="alert" className="mt-4 text-red-300">{error}</p>}
        </section>
      </div>
    </main>
  );
}
