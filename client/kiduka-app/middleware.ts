// middleware.ts
import { withAuth } from "next-auth/middleware"

export default withAuth(
  // `withAuth` augments your `Request` with the user's token.
  function middleware(req) {
    // Add any additional middleware logic here
    console.log("User accessing protected route:", req.nextauth.token?.email)
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

// Protect these routes
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/soil-analysis/:path*",
    "/settings/:path*"
  ]
}