import Navbar from "./Navbar";
import Skeleton, { RowSkeletons, StatSkeletons } from "./Skeleton";

type Variant = "dashboard" | "analytics" | "form" | "settings";

/**
 * Route-level loading state. Keeps the real header (which already knows the
 * session) and mirrors each page's layout, so content replaces the skeleton
 * in place rather than shifting it.
 */
export default function PageSkeleton({ variant, label }: { variant: Variant; label: string }) {
  const heading = <div className="page-heading" aria-hidden="true">
    <div className="grid gap-2"><Skeleton width={180} height={30} /><Skeleton width={120} className="skeleton-text" /></div>
    {variant !== "settings" && variant !== "form" && <Skeleton width={148} height={44} />}
  </div>;

  return <>
    <Navbar />
    <main className="app-shell" aria-busy="true">
      <p role="status" className="sr-only">{label}</p>
      {variant === "form" ? <div className="content-narrow">
        {heading}
        <section className="panel" aria-hidden="true"><div className="form-grid">
          {[0, 1, 2, 3, 4].map((index) => <div key={index} className={`grid gap-2 ${index === 0 ? "form-full" : ""}`}><Skeleton width={96} className="skeleton-text" /><Skeleton height={46} /></div>)}
        </div></section>
      </div> : variant === "settings" ? <>
        {heading}
        <div className="settings-layout">
          <div className="hidden lg:grid gap-2" aria-hidden="true"><Skeleton height={44} /><Skeleton height={44} /></div>
          <div className="stack" aria-hidden="true">
            <section className="panel grid gap-4"><Skeleton width={140} height={22} /><Skeleton height={46} /><Skeleton height={46} /></section>
            <section className="panel grid gap-4"><Skeleton width={100} height={22} /><div className="card-grid"><Skeleton height={68} /><Skeleton height={68} /><Skeleton height={68} /></div></section>
          </div>
        </div>
      </> : <>
        {heading}
        <div className="stack">
          <section className="panel py-4" aria-hidden="true"><Skeleton height={40} /></section>
          <StatSkeletons />
          {variant === "dashboard" ? <section className="panel"><RowSkeletons rows={8} /></section> : <section className="panel" aria-hidden="true"><Skeleton width={180} height={22} /><Skeleton height={300} style={{ marginTop: 24 }} /></section>}
        </div>
      </>}
    </main>
  </>;
}
