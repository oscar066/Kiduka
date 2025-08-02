// app/api/auth/[...nextauth]/route.ts
import { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { DefaultSession } from "next-auth";
import { apiClient, UserRole } from "@/lib/api-client";

// Extend NextAuth types to include role information
declare module "next-auth" {
  interface Session extends DefaultSession {
    accessToken?: string;
    user: {
      id: string;
      email: string;
      name: string;
      username: string;
      role: UserRole;
      isActive: boolean;
      isVerified: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    username?: string;
    role?: UserRole;
    isActive?: boolean;
    isVerified?: boolean;
  }
}

interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  role: UserRole;
  accessToken?: string;
  isActive: boolean;
  isVerified: boolean;
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
            role: user.role,
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
        token.role = (user as User).role;
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
        session.user.role = token.role as UserRole;
        session.user.isActive = token.isActive as boolean;
        session.user.isVerified = token.isVerified as boolean;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          // For Google sign-in, try to register the user
          // If they already exist, this will fail but sign-in should still proceed
          await apiClient.register({
            email: user.email!,
            username: user.email?.split("@")[0] || "user",
            password: `google_${Date.now()}`, // Generate a random password for Google users
            full_name: user.name || "Google User",
          });

          // After registration, try to get a token for this user
          // This is a simplified approach - you might want to implement OAuth flow properly
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
    async redirect({ url, baseUrl }) {
      // Handle role-based redirects after sign in
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  pages: {
    signIn: "/auth/login",
    newUser: "/auth/signup",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
