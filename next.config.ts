import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * The single origin this app is served from. `headers()` is evaluated at build
 * time, so this resolves in the following order:
 *   1. NEXTAUTH_URL   — the canonical, explicitly-configured origin (preferred;
 *                       already required by NextAuth in production).
 *   2. VERCEL_PROJECT_PRODUCTION_URL / VERCEL_URL — host-only, needs a scheme.
 *   3. localhost      — local `next dev` / `next start`.
 *
 * ET-N4: this is used to pin `Access-Control-Allow-Origin` to our own origin
 * instead of the wildcard `*` observed on the live 200 response. The app has no
 * cross-origin consumer, so a same-origin ACAO is the correct value.
 */
function resolveAppOrigin(): string {
  const explicit = process.env.NEXTAUTH_URL;
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }

  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercelHost) {
    return `https://${vercelHost.replace(/\/+$/, "")}`;
  }

  return "http://localhost:3000";
}

const APP_ORIGIN = resolveAppOrigin();

/**
 * Content-Security-Policy (ET-H3 / ET-N1).
 *
 * ---------------------------------------------------------------------------
 * SHIPPED IN REPORT-ONLY MODE ON PURPOSE. To promote it to enforcing:
 *   1. Deploy this as-is and exercise the full flow in a real browser:
 *      login -> dashboard -> add-expense -> analytics -> edit -> delete -> logout.
 *   2. Collect every `[Report Only]` violation from the browser console
 *      (and/or point `report-to`/`report-uri` at a collector).
 *   3. Widen the directives below for any legitimate violation, then flip the
 *      header name in `headers()` from `Content-Security-Policy-Report-Only`
 *      to `Content-Security-Policy` (see CSP_HEADER_NAME).
 * It cannot be validated from the build environment, so enforcing it now would
 * risk breaking Next's inline bootstrap scripts, next/font, and the Google
 * avatar images. `frame-ancestors 'none'` is duplicated by the *enforcing*
 * `X-Frame-Options: DENY` below, so clickjacking is covered either way.
 * ---------------------------------------------------------------------------
 *
 * Notes on the individual allowances:
 * - 'unsafe-inline' in script-src: Next.js injects inline bootstrap/flight
 *   scripts without a nonce under the default (non-middleware-nonce) setup.
 *   Removing it requires the nonce plumbing described in the Next CSP docs.
 * - 'unsafe-eval' is DEV-ONLY (React Refresh / HMR); it is not emitted in prod.
 * - fonts.googleapis.com / fonts.gstatic.com: `app/layout.tsx` uses
 *   `next/font/google` (Geist, Geist_Mono). next/font self-hosts the files at
 *   build time, but these stay allow-listed so a fallback/dev fetch does not
 *   trip the report.
 * - img-src mirrors `images.remotePatterns` below: lh3.googleusercontent.com
 *   (Google account avatars) and developers.google.com (the "G" sign-in logo).
 *   ET-L4 (Round 6) removed the storage.googleapis.com/byteeit-bucket pattern
 *   along with the stray marketing template that was its only consumer, so the
 *   matching img-src allowance went with it.
 */
const cspDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  // Clickjacking defence; mirrored by the enforcing X-Frame-Options: DENY.
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "form-action 'self'",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'"
    : "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  [
    "img-src 'self' data: blob:",
    "https://lh3.googleusercontent.com",
    "https://developers.google.com",
  ].join(" "),
  isDev
    ? "connect-src 'self' ws: wss: https://fonts.googleapis.com https://fonts.gstatic.com"
    : "connect-src 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

/**
 * Flip this to "Content-Security-Policy" once the report-only run above is
 * clean. Nothing else needs to change.
 */
const CSP_HEADER_NAME = "Content-Security-Policy-Report-Only";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Every route, including the HTML document that ET-N4 was observed on.
        source: "/:path*",
        headers: [
          // ET-H3 / ET-N1 — report-only for now; see the block comment above.
          { key: CSP_HEADER_NAME, value: cspDirectives },

          // ET-H3 / ET-N3 — enforcing from day one, all low-risk.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

          // ET-H3 / ET-N2 — the app uses none of these capabilities.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },

          // ET-N4 — replaces the wildcard `Access-Control-Allow-Origin: *`.
          // Verified locally against `next start`: this value IS emitted on the
          // HTML document, on /api/* and on static assets. NOT verified from
          // here: whether it also wins over the `*` that Vercel's edge was
          // observed emitting in production — that needs a real deploy. Confirm
          // after deploying with:
          //   curl -sSD - -o /dev/null https://<preview>/ | grep -i access-control
          // If the wildcard survives, the override has to move to `vercel.json`
          // `headers` instead of here.
          { key: "Access-Control-Allow-Origin", value: APP_ORIGIN },
          // Correctness only — ACAO is a fixed value, never reflected from the
          // request. Next replaces this on app-router document responses with
          // its own Vary; it survives on /api/* routes.
          { key: "Vary", value: "Origin" },

          // NOTE: Strict-Transport-Security is deliberately NOT set here.
          // Vercel already emits `max-age=63072000; includeSubDomains; preload`
          // and a duplicate with a shorter max-age would be a regression.
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "developers.google.com",
        pathname: "/identity/images/g-logo.png",
      },
    ],
  },
};

export default nextConfig;
