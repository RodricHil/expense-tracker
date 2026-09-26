import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

/**
 * NEXTAUTH_SECRET has no fallback (ET-H1): a missing secret must never silently
 * degrade to a publicly-known signing key. The check runs at REQUEST time rather
 * than at module scope on purpose — a module-scope throw would also fire during
 * `next build` page-data collection and break builds in environments that
 * legitimately have no runtime secret.
 */
function assertAuthSecret(): void {
  if (!process.env.NEXTAUTH_SECRET) {
    throw new Error(
      "NEXTAUTH_SECRET is not set. Refusing to serve authentication requests. " +
        "Generate one with `openssl rand -base64 32` and set it in the environment."
    );
  }
}

type AuthRouteContext = { params: Promise<{ nextauth: string[] }> };

async function authRouteHandler(req: Request, ctx: AuthRouteContext) {
  assertAuthSecret();
  return handler(req, ctx);
}

export { authRouteHandler as GET, authRouteHandler as POST };
