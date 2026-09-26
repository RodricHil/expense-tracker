import type { CSSProperties } from "react";

/** Decorative placeholder block. Pair with a `role="status"` label nearby. */
export default function Skeleton({ width, height, className = "", style }: { width?: number | string; height?: number | string; className?: string; style?: CSSProperties }) {
  return <span className={`skeleton ${className}`} aria-hidden="true" style={{ width, height, ...style }} />;
}

/** Stat cards in the loading state, sized like the real ones. */
export function StatSkeletons({ count = 4 }: { count?: number }) {
  return <div className="stats" aria-hidden="true">
    {Array.from({ length: count }, (_, index) => <div className="stat" key={index}>
      <Skeleton width={32} height={32} className="stat-icon" style={{ background: "var(--skeleton)", border: 0 }} />
      <Skeleton width="55%" className="skeleton-text stat-label" />
      <Skeleton width="70%" height={28} className="stat-value" />
    </div>)}
  </div>;
}

/** A table-shaped placeholder for transaction lists. */
export function RowSkeletons({ rows = 6 }: { rows?: number }) {
  return <div className="grid gap-4" aria-hidden="true">
    {Array.from({ length: rows }, (_, index) => <div key={index} className="flex items-center gap-4">
      <Skeleton width={88} className="skeleton-text hidden sm:block" />
      <Skeleton className="skeleton-text flex-1" />
      <Skeleton width={72} className="skeleton-text hidden md:block" />
      <Skeleton width={96} className="skeleton-text" />
    </div>)}
  </div>;
}
