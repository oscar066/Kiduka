import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    const apiUrl = process.env.API_URL || "http://localhost:8000";
    return {
      // beforeFiles runs BEFORE Next.js file-based routing (i.e., before [...nextauth] catches the request)
      beforeFiles: [
        {
          // Proxy FastAPI auth endpoints: /api/auth/me, /api/auth/login, /api/auth/register, etc.
          // But NOT NextAuth endpoints: /api/auth/session, /api/auth/csrf, /api/auth/providers, etc.
          source: "/api/auth/:slug(me|login|register|change-password|forgot-password|reset-password)",
          destination: `${apiUrl}/auth/:slug`,
        },
        {
          // Proxy all other /api/* routes (predictions, admin, etc.) to FastAPI
          source: "/api/:path((?!auth).*)",
          destination: `${apiUrl}/:path`,
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
