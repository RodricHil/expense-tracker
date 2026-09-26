import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import type { GoogleProfile } from "next-auth/providers/google";
import User from "@/models/User";
import { connectDB } from "@/lib/mongodb";
import { logError } from "@/lib/logger";

declare module "next-auth" {
  interface User {
    id: string;
    image?: string;
  }
  
  interface Session {
    user: User & {
      id: string;
      image?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    image?: string;
  }
}

/**
 * True for a MongoDB duplicate-key error (E11000).
 *
 * Two browser tabs finishing the OAuth dance at the same moment both issue the
 * upsert below; MongoDB resolves that race by letting one insert win and
 * failing the other with E11000 rather than by merging them.
 */
function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === 11000
  );
}

/**
 * Render an error for the log WITHOUT leaking PII (ET-M2).
 *
 * Driver error messages routinely embed the offending document — an E11000 on
 * the unique email index quotes the email address verbatim — so only the error
 * name and code are safe to emit in production.
 */
function describeError(error: unknown): string {
  if (!(error instanceof Error)) return "non-Error thrown";

  const code = (error as { code?: unknown }).code;
  const suffix = code === undefined ? "" : ` (code ${String(code)})`;

  return process.env.NODE_ENV === "production"
    ? `${error.name}${suffix}`
    : `${error.name}${suffix}: ${error.message}`;
}

/**
 * Create or refresh the `User` record for a Google sign-in (ET-M8, ET-M1).
 *
 * Three deliberate changes from the previous implementation:
 *
 * 1. It uses the cached `connectDB()` helper instead of calling
 *    `mongoose.connect()` directly, so sign-ins reuse the pooled connection
 *    instead of opening a new one per callback.
 * 2. The find-then-save read-modify-write is replaced by a single idempotent
 *    `findOneAndUpdate(..., { upsert: true })`. Concurrent sign-ins therefore
 *    converge on exactly one document; the E11000 retry below covers the
 *    narrow window where two upserts race to insert.
 * 3. Failures are surfaced instead of swallowed. This is a deliberate move
 *    from fail-open to fail-closed: persisting `googleId` is now load-bearing
 *    (the currency preference is read by email, and the `userId` migration
 *    maps email -> googleId), so a user whose record silently failed to write
 *    would be left in a half-provisioned state that nothing reports.
 *
 * The filter stays keyed on `email` rather than `googleId`: records created
 * before `googleId` existed have no such value, and upserting on `googleId`
 * would create a second document for every returning user.
 */
async function persistGoogleUser(profile: GoogleProfile): Promise<void> {
  const email = profile.email?.toLowerCase();

  if (!email) {
    throw new Error("Google profile did not include an email address.");
  }

  // Cached, pooled connection (ET-M8) — not a fresh `mongoose.connect()` per
  // sign-in. Throws rather than silently skipping if the database is
  // unreachable.
  await connectDB();

  const filter = { email };

  // `email` is supplied by the filter on insert — repeating it in the update
  // would be rejected as a conflicting path.
  const mutable = {
    googleId: profile.sub,
    name: profile.name,
    image: profile.picture ?? null,
  };

  try {
    await User.findOneAndUpdate(
      filter,
      {
        $set: mutable,
        $setOnInsert: {
          preferredCurrency: "₹",
          emailVerified: new Date(),
        },
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      // The concurrent sign-in inserted first. Re-run as a plain update, which
      // is now guaranteed to find the document the other request created.
      await User.findOneAndUpdate(filter, { $set: mutable }, { new: true });
      return;
    }

    // Log an opaque identifier only — never the email or the display name.
    // Structured so this failure is searchable rather than a stray log line
    // (ET-M8 asked for an error channel; Round 7 gave it one).
    logError("auth.user_persist_failed", error, {
      sub: profile.sub,
      detail: describeError(error),
    });

    // Re-thrown with a generic message so the raw driver text (which can carry
    // the address) never reaches NextAuth's own logger.
    throw new Error("Could not persist the user record for this sign-in.");
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      profile: async (profile) => {
        // ET-M2: nothing about the profile (email, name, picture) is logged.
        await persistGoogleUser(profile);

        return {
          // ET-M1: `id` is the Google `sub` — the immutable subject identifier.
          // It becomes `token.id` and then `session.user.id`, and is the key
          // that owns every newly written expense.
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    // ET-M2: these callbacks run on every authenticated request, not just at
    // sign-in. The debug logging that used to live here emitted the user's
    // email and name into the platform log stream on each one.
    async jwt({ token, user }) {
      // `user` is only populated on the initial sign-in; on every subsequent
      // call the id already lives on the token and must be preserved.
      if (user?.id) {
        token.id = user.id;
      }
      if (user?.image) {
        token.image = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // ET-M1: expose the stable Google `sub` to server code as
        // `session.user.id`. API routes scope data by this, not by email.
        session.user.id = token.id;
        // Tokens minted before `token.image` existed only carry NextAuth's own
        // `picture` claim. Assigning `token.image` unconditionally replaced the
        // avatar NextAuth had already put on the session with `undefined`,
        // which is why the Google profile picture was sometimes missing.
        session.user.image = token.image ?? token.picture ?? session.user.image ?? undefined;
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
    error: "/login",
  },
};

