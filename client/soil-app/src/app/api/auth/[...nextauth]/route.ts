// app/api/auth/[...nextauth]/route.ts
import { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { DefaultSession } from "next-auth";
import { apiClient } from "@/lib/api-client";

// Type declarations for NextAuth
declare module "next-auth" {
  interface Session extends DefaultSession {
    accessToken?: string;
    user: {
      id: string;
      email: string;
      name: string;
      username: string;
      isActive: boolean;
      isVerified: boolean;
    } & DefaultSession["user"];
  }
}

import { User as DefaultUser } from "next-auth";

interface User extends DefaultUser {
  id: string;
  email: string;
  name: string;
  username: string;
  accessToken?: string;
  isActive: boolean;
  isVerified: boolean;
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    username?: string;
    isActive?: boolean;
    isVerified?: boolean;
  }
}

// NextAuth Configuration
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username_or_email: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username_or_email || !credentials?.password) {
          return null;
        }

        try {
          // Use the apiClient for login
          const loginData = await apiClient.login({
            username_or_email: credentials.username_or_email,
            password: credentials.password,
          });

          // Get user info with the token
          const user = await apiClient.getCurrentUser(loginData.access_token);

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.full_name || user.username,
            username: user.username,
            accessToken: loginData.access_token,
            isActive: user.is_active,
            isVerified: user.is_verified,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.accessToken = (user as User).accessToken;
        token.username = (user as User).username;
        token.isActive = (user as User).isActive;
        token.isVerified = (user as User).isVerified;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.accessToken = token.accessToken as string;
        session.user.id = token.sub!;
        session.user.username = token.username as string;
        session.user.isActive = token.isActive as boolean;
        session.user.isVerified = token.isVerified as boolean;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          // Register user via FastAPI backend using apiClient
          await apiClient.register({
            email: user.email!,
            username: user.email?.split("@")[0] || "user",
            password: `google_${Date.now()}`, // Generate a random password for Google users
            full_name: user.name || "Google User",
          });

          return true;
        } catch (error) {
          console.error("Google sign-in registration error:", error);
          // Still allow sign-in even if backend registration fails
          // This handles the case where user already exists
          return true;
        }
      }
      return true;
    },
  },
  pages: {
    signIn: "/auth/login",
    newUser: "/auth/signup",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };