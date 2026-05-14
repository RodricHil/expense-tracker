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

  secret: process.env.NEXTAUTH_SECRET || "default-secret-change-in-production",
  pages: {
    signIn: "/login",
    error: "/login",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
