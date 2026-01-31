import { NextRequest, NextResponse } from "next/server";

/**
 * AUTH MIDDLEWARE (FIXED)
 * ----------------------
 * - ONLY protects /account routes
 * - Does NOT redirect logged-in users away from /login
 * - Avoids cookie race conditions
 * - Client controls post-login navigation
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Read cookie safely
  const token = request.cookies.get("access_token")?.value;

  /**
   * 🔐 Protect /account routes
   */
  if (pathname.startsWith("/account")) {
    if (!token) {
      return NextResponse.redirect(
        new URL("/login", request.url)
      );
    }
  }

  return NextResponse.next();
}

/**
 * Run middleware ONLY where needed
 */
export const config = {
  matcher: ["/account/:path*"],
};
