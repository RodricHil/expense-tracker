import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import type { GoogleProfile } from "next-auth/providers/google";
import { persistVerifiedIdentity, trustedLegacyExpenseEmail } from "@/lib/identity";
import { logError } from "@/lib/logger";

declare module "next-auth" {
  interface User {
    id: string;
    image?: string;
    legacyExpenseEmail?: string;
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

/** Keep provider/driver error details out of the authentication response. */
async function persistGoogleUser(profile: GoogleProfile): Promise<void> {
  try { await persistVerifiedIdentity(profile); }
  catch (error) {
    logError("auth.user_persist_failed", error instanceof Error ? new Error(error.name) : new Error("Identity error"));
    throw new Error("Could not verify this account. Sign in again or contact support for account recovery.");
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
        session.user.legacyExpenseEmail = await trustedLegacyExpenseEmail(token.id);
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

