import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * ET-H2 — THE AUTHORIZATION MATRIX.
 *
 * Round 2 turned the middleware from default-ALLOW (a trailing `return true`
 * and a matcher that did not even cover `/dashboard`) into default-DENY with an
 * explicit public allow-list. That is a one-line property and a one-line
 * regression: anyone who adds a `return true` fallback, or drops a route from
 * the matcher, silently reopens the gap.
 *
 * `withAuth` is mocked so the options object it is handed — including the
 * `authorized` callback that IS the policy — can be exercised directly, with no
 * NextAuth runtime, no secret and no network.
 */

type TokenLike = { id?: string } | null;

type AuthorizedArgs = {
  token: TokenLike;
  req: { nextUrl: { pathname: string } };
};

type WithAuthOptions = {
  callbacks: { authorized: (args: AuthorizedArgs) => boolean };
};

let capturedOptions: WithAuthOptions | undefined;

vi.mock("next-auth/middleware", () => ({
  withAuth: (handler: unknown, options: unknown) => {
    capturedOptions = options as WithAuthOptions;
    return handler;
  },
}));

vi.mock("next/server", () => ({
  NextResponse: {
    next: () => ({ kind: "next" }),
    redirect: (url: URL) => ({ kind: "redirect", location: url.toString() }),
  },
}));

const middlewareModule = await import("@/middleware");

type MiddlewareRequest = {
  nextUrl: { pathname: string };
  url: string;
  nextauth: { token: TokenLike };
};

const middleware = middlewareModule.default as unknown as (
  req: MiddlewareRequest
) => { kind: string; location?: string };

const { config } = middlewareModule;

const SESSION_TOKEN: TokenLike = { id: "108000000000000000001" };

function authorize(pathname: string, token: TokenLike): boolean {
  if (!capturedOptions) throw new Error("withAuth was never called");
  return capturedOptions.callbacks.authorized({
    token,
    req: { nextUrl: { pathname } },
  });
}

beforeEach(() => {
  expect(capturedOptions).toBeDefined();
});

describe("public paths", () => {
  const publicPaths = ["/", "/login"];

  it.each(publicPaths)("allows %s with no token", (pathname) => {
    expect(authorize(pathname, null)).toBe(true);
  });

  it.each(publicPaths)("allows %s with a token", (pathname) => {
    expect(authorize(pathname, SESSION_TOKEN)).toBe(true);
  });

  it.each([
    "/api/auth/signin",
    "/api/auth/callback/google",
    "/api/auth/session",
    "/api/auth/csrf",
  ])("allows the NextAuth endpoint %s with no token", (pathname) => {
    expect(authorize(pathname, null)).toBe(true);
  });
});

describe("protected paths — default deny", () => {
  const protectedPaths = [
    "/dashboard",
    "/dashboard/settings",
    "/add-expenses",
    "/analytics",
    "/settings",
    // NOTE: these two /api paths exercise the POLICY FUNCTION only. Next.js
    // never runs the middleware for them, because `config.matcher` below does
    // not include an /api pattern — see the "matcher coverage" block, which
    // asserts that gap explicitly. The API routes are protected by their own
    // in-handler getServerSession checks, not by this callback. Listing them
    // here proves the policy would deny them IF the matcher were widened; it
    // is not evidence that middleware guards the API today.
    "/api/expenses",
    "/api/user/currency",
    // Anything not on the allow-list, including a route that does not exist
    // yet. This is the property Round 2 introduced: new surfaces are private
    // until somebody deliberately makes them public.
    "/some/route/added/next/year",
    "/api/internal/metrics",
  ];

  it.each(protectedPaths)("denies %s with no token", (pathname) => {
    expect(authorize(pathname, null)).toBe(false);
  });

  it.each(protectedPaths)("allows %s with a token", (pathname) => {
    expect(authorize(pathname, SESSION_TOKEN)).toBe(true);
  });

  it("does not treat a path that merely CONTAINS a public path as public", () => {
    expect(authorize("/dashboard/login", null)).toBe(false);
    expect(authorize("/evil/api/auth/callback", null)).toBe(false);
  });

  // The public prefix must match on a segment boundary. A bare startsWith
  // would let an attacker-registered "/api/authx" inherit /api/auth's public
  // status. Latent today (no /api pattern in the matcher) but load-bearing the
  // moment one is added, so it is pinned by a test rather than by memory.
  it.each(["/api/authx", "/api/auth-admin", "/api/authentication"])(
    "does not treat %s as public just because it starts with /api/auth",
    (pathname) => {
      expect(authorize(pathname, null)).toBe(false);
    }
  );

  it("still allows the real /api/auth root and its children", () => {
    expect(authorize("/api/auth", null)).toBe(true);
    expect(authorize("/api/auth/callback/google", null)).toBe(true);
  });

  it("denies an undefined token, not just a null one", () => {
    expect(authorize("/dashboard", undefined as unknown as TokenLike)).toBe(false);
  });
});

describe("matcher coverage", () => {
  it("covers every page the review found unguarded (ET-H2)", () => {
    expect(config.matcher).toEqual(
      expect.arrayContaining([
        "/dashboard/:path*",
        "/add-expenses/:path*",
        "/analytics/:path*",
        "/settings/:path*",
        "/login",
      ])
    );
  });

  // Documents a REAL boundary rather than asserting a protection that does not
  // exist. Middleware is a page-level guard here; /api/* is guarded by each
  // handler's own getServerSession + userId-scoped query (the review's verified
  // "no IDOR" positive control). If someone later adds an /api pattern to the
  // matcher, this test fails and forces a deliberate re-think — withAuth would
  // then answer unauthenticated API calls with an HTML redirect to the sign-in
  // page instead of the clean 401 JSON the handlers return today.
  it("does NOT match /api — API auth lives in the handlers, by design", () => {
    expect(config.matcher.some((pattern) => pattern.startsWith("/api"))).toBe(false);
  });
});

describe("signed-in redirect away from /login", () => {
  it("redirects an authenticated visitor to the dashboard", () => {
    const result = middleware({
      nextUrl: { pathname: "/login" },
      url: "https://example.test/login",
      nextauth: { token: SESSION_TOKEN },
    });

    expect(result.kind).toBe("redirect");
    expect(result.location).toBe("https://example.test/dashboard");
  });

  it("lets an anonymous visitor reach /login", () => {
    const result = middleware({
      nextUrl: { pathname: "/login" },
      url: "https://example.test/login",
      nextauth: { token: null },
    });

    expect(result.kind).toBe("next");
  });
});
