"use client";

import { useState } from "react";

export function initials(name?: string | null, email?: string | null): string {
  const source = (name ?? "").trim() || (email ?? "").split("@")[0] || "";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : source.slice(0, 2);
  return letters.toUpperCase() || "?";
}

/**
 * Profile picture with an initials fallback.
 *
 * The initials are always rendered underneath and the photo fades in only once
 * it has actually loaded, so a slow, blocked or expired Google avatar URL never
 * shows a broken-image icon or leaves an empty box. `referrerPolicy` matters:
 * lh3.googleusercontent.com intermittently refuses hot-linked requests that
 * carry a Referer, which is one of the ways the avatar used to go missing.
 */
export default function Avatar({ src, name, email, size = 32 }: { src?: string | null; name?: string | null; email?: string | null; size?: number }) {
  const [status, setStatus] = useState<{ src: string | null | undefined; state: "loading" | "loaded" | "failed" }>({ src, state: "loading" });
  // Reset when the source changes (e.g. after re-authentication) without an effect.
  const current = status.src === src ? status.state : "loading";
  if (status.src !== src) setStatus({ src, state: "loading" });

  return (
    <span className="avatar" style={{ "--avatar-size": `${size}px` } as React.CSSProperties} aria-hidden="true">
      {initials(name, email)}
      {src && current !== "failed" && (
        // eslint-disable-next-line @next/next/no-img-element -- a tiny, already-sized remote avatar; next/image would add a proxy hop and a layout wrapper for no gain.
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          referrerPolicy="no-referrer"
          decoding="async"
          data-loaded={current === "loaded"}
          ref={(img) => {
            // The image can finish (or fail) before React attaches onLoad/onError,
            // e.g. while the server-rendered page is still hydrating.
            if (img?.complete && current === "loading") setStatus({ src, state: img.naturalWidth > 0 ? "loaded" : "failed" });
          }}
          onLoad={() => setStatus({ src, state: "loaded" })}
          onError={() => setStatus({ src, state: "failed" })}
        />
      )}
    </span>
  );
}
