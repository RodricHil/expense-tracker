import NextAuth, { NextAuthOptions, Session } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import User from "@/models/User";
import { JWT } from "next-auth/jwt";
import mongoose from "mongoose";

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

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      profile: async (profile) => {
        console.log("Google profile received:", { id: profile.sub, email: profile.email, name: profile.name });
        
        // Save or update user in database (non-blocking)
        if (process.env.MONGODB_URI) {
          try {
            await mongoose.connect(process.env.MONGODB_URI);
            const existingUser = await User.findOne({ email: profile.email });
            
            if (existingUser) {
              existingUser.name = profile.name || existingUser.name;
              existingUser.image = profile.picture || existingUser.image;
              await existingUser.save();
              console.log("User updated:", profile.email);
            } else {
              const newUser = new User({
                name: profile.name,
                email: profile.email,
                image: profile.picture,
                preferredCurrency: "₹",
                emailVerified: new Date(),
              });
              await newUser.save();
              console.log("New user created:", profile.email);
            }
          } catch (error) {
            console.error("Error saving user to database:", error);
            // Continue without blocking auth - this is intentional
          }
        }

        return {
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
    async jwt({ token, user, account }) {
      console.log("JWT callback - user:", user ? user.email : "none", "token exists:", !!token);
      if (user) {
        token.id = user.id;
        token.image = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      console.log("Session callback - token.id:", token.id, "session.user.email:", session.user?.email);
      if (session.user) {
        session.user.id = token.id as string;
        session.user.image = token.image as string;
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
