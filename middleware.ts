import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * Public, unauthenticated surfaces. Everything NOT listed here requires a
 * session (ET-H2: default-deny). Add to this list deliberately — never widen
 * the policy by falling through to `return true`.
 */
const PUBLIC_PATHS = ["/", "/login"];
const PUBLIC_PREFIXES = ["/api/auth"];

function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

export default withAuth(
  function middleware(req) {
    // If user is logged in and tries to go to login, redirect to dashboard
    if (req.nextUrl.pathname === "/login" && req.nextauth.token) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Explicit allow-list first...
        if (isPublicPath(req.nextUrl.pathname)) {
          return true;
        }

        // ...then deny by default: every other matched route needs a session.
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/add-expenses/:path*",
    "/analytics/:path*",
    "/login",
  ],
};
